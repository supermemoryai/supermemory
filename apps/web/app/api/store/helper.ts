import { z } from "zod";
import { db } from "@/server/db";
import { contentToSpace, space, storedContent } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { LIMITS } from "@/lib/constants";
import { limit } from "@/app/actions/doers";
import { type AddFromAPIType } from "@repo/shared-types";

export const createMemoryFromAPI = async (input: {
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
			error: `Failed to save to vector store. Backend returned error: ${e as string}`,
		};
	}
};
