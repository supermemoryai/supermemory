import { type NextRequest } from "next/server";
import { addFromAPIType, AddFromAPIType } from "@repo/shared-types";
import { ensureAuth } from "../ensureAuth";
import { z } from "zod";
import { db } from "@/server/db";
import { contentToSpace, space, storedContent } from "@/server/db/schema";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { LIMITS } from "@/lib/constants";
import { limit } from "@/app/actions/doers";

export const runtime = "edge";

const createMemoryFromAPI = async (input: {
	data: AddFromAPIType;
	userId: string;
}) => {
	if (!(await limit(input.userId, input.data.type))) {
		return {
			success: false,
			data: 0,
			error: `You have exceeded the limit of ${LIMITS[input.data.type as keyof typeof LIMITS]} ${input.data.type}s.`,
		};
	}

	// Get number of items saved in the last 2 hours
	const last2Hours = new Date(Date.now() - 2 * 60 * 60 * 1000);

	const numberOfItemsSavedInLast2Hours = await db
		.select({
			count: sql<number>`count(*)`.mapWith(Number),
		})
		.from(storedContent)
		.where(
			and(
				gt(storedContent.savedAt, last2Hours),
				eq(storedContent.userId, input.userId),
			),
		);

	if (numberOfItemsSavedInLast2Hours[0]!.count >= 20) {
		return {
			success: false,
			data: 0,
			error: `You have exceeded the limit`,
		};
	}

	const vectorSaveResponse = await fetch(
		`${process.env.BACKEND_BASE_URL}/api/add`,
		{
			method: "POST",
			body: JSON.stringify({
				pageContent: input.data.pageContent,
				title: input.data.title,
				description: input.data.description,
				url: input.data.url,
				spaces: input.data.spaces,
				user: input.userId,
				type: input.data.type,
			}),
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer " + process.env.BACKEND_SECURITY_KEY,
			},
		},
	);

	if (!vectorSaveResponse.ok) {
		const errorData = await vectorSaveResponse.text();
		console.error(errorData);
		return {
			success: false,
			data: 0,
			error: `Failed to save to vector store. Backend returned error: ${errorData}`,
		};
	}

	let contentId: number;

	const saveToDbUrl =
		(input.data.url.split("#supermemory-user-")[0] ?? input.data.url) +
		"#supermemory-user-" +
		input.userId;

	const noteId = new Date().getTime();

	// Insert into database
	try {
		const insertResponse = await db
			.insert(storedContent)
			.values({
				content: input.data.pageContent,
				title: input.data.title,
				description: input.data.description,
				url: saveToDbUrl,
				baseUrl: saveToDbUrl,
				image: input.data.image,
				savedAt: new Date(),
				userId: input.userId,
				type: input.data.type,
				noteId,
			})
			.returning({ id: storedContent.id });

		if (!insertResponse[0]?.id) {
			return {
				success: false,
				data: 0,
				error: "Failed to save to database",
			};
		}

		contentId = insertResponse[0].id;
	} catch (e) {
		const error = e as Error;
		console.log("Error: ", error.message);

		if (error.message.includes("D1_ERROR: UNIQUE constraint failed:")) {
			return {
				success: false,
				data: 0,
				error: "Content already exists",
			};
		}

		return {
			success: false,
			data: 0,
			error: "Failed to save to database with error: " + error.message,
		};
	}

	if (input.data.spaces.length > 0) {
		// Adding the many-to-many relationship between content and spaces
		const spaceData = await db
			.select()
			.from(space)
			.where(
				and(
					inArray(
						space.id,
						input.data.spaces.map((s) => parseInt(s)),
					),
					eq(space.user, input.userId),
				),
			)
			.all();

		await Promise.all(
			spaceData.map(async (s) => {
				await db
					.insert(contentToSpace)
					.values({ contentId: contentId, spaceId: s.id });

				await db.update(space).set({ numItems: s.numItems + 1 });
			}),
		);
	}

	try {
		const response = await vectorSaveResponse.json();

		const expectedResponse = z.object({ status: z.literal("ok") });

		const parsedResponse = expectedResponse.safeParse(response);

		if (!parsedResponse.success) {
			return {
				success: false,
				data: 0,
				error: `Failed to save to vector store. Backend returned error: ${parsedResponse.error.message}`,
			};
		}

		return {
			success: true,
			data: 1,
		};
	} catch (e) {
		return {
			success: false,
			data: 0,
			error: `Failed to save to vector store. Backend returned error: ${e}`,
		};
	}
};

export async function POST(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	if (!process.env.BACKEND_SECURITY_KEY) {
		return new Response("Missing BACKEND_SECURITY_KEY", { status: 500 });
	}

	const body = await req.json();

	const validated = addFromAPIType.safeParse(body);

	if (!validated.success) {
		return new Response(
			JSON.stringify({
				message: "Invalid request",
				error: validated.error,
			}),
			{ status: 400 },
		);
	}

	const data = validated.data;

	const result = await createMemoryFromAPI({
		data,
		userId: session.user.id,
	});

	if (!result.success) {
		return new Response(
			JSON.stringify({
				message: "Failed to save document",
				error: result.error,
			}),
			{ status: 501 },
		);
	}

	return new Response(
		JSON.stringify({
			message: "Document saved",
			data: result.data,
		}),
		{ status: 200 },
	);
}
