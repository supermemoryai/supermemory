import { z } from "zod";
import { db } from "@/server/db";
import { contentToSpace, space, storedContent } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";
// import { LIMITS } from "@repo/shared-types";
// import { limit } from "@/app/actions/doers";
import { type AddFromAPIType } from "@repo/shared-types";

export const createMemoryFromAPI = async (input: {
	data: AddFromAPIType;
	userId: string;
}) => {
	// if (!(await limit(input.userId, input.data.type))) {
	// 	return {
	// 		success: false,
	// 		data: 0,
	// 		error: `You have exceeded the limit of ${LIMITS[input.data.type as keyof typeof LIMITS]} ${input.data.type}s.`,
	// 	};
	// }

	const vectorSaveResponse = await fetch(
		`${process.env.BACKEND_BASE_URL}/api/add`,
		{
			method: "POST",
			body: JSON.stringify({
				pageContent: input.data.pageContent,
				title: input.data.title.slice(0, 500),
				description: input.data.description.slice(0, 500),
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
		if (!vectorSaveResponse.ok) {
			const resp = await vectorSaveResponse.text();
			return {
				success: false,
				data: 0,
				error: `Failed to save to vector store. Backend returned error: ${resp}`,
			};
		}

		await vectorSaveResponse.json();

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
