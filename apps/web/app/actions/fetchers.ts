"use server";

import { and, asc, eq, exists, not, or } from "drizzle-orm";
import { db } from "../../server/db";
import {
	canvas,
	chatHistory,
	ChatThread,
	chatThreads,
	Content,
	contentToSpace,
	space,
	spacesAccess,
	storedContent,
	StoredSpace,
	User,
	users,
} from "../../server/db/schema";
import { ServerActionReturnType } from "./types";
import { auth } from "../../server/auth";
import { ChatHistory, SourceZod } from "@repo/shared-types";
import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

export const getUser = async (): ServerActionReturnType<User> => {
	const data = await auth();

	if (!data || !data.user || !data.user.id) {
		redirect("/signin");
		return { error: "Not authenticated", success: false };
	}

	console.log("data.user.id", data.user.id);
	const user = await db.query.users.findFirst({
		where: eq(users.id, data.user.id),
	});

	return { success: true, data: user };
};

export const getSpaces = async (): ServerActionReturnType<StoredSpace[]> => {
	const data = await auth();

	if (!data || !data.user) {
		redirect("/signin");
		return { error: "Not authenticated", success: false };
	}

	const spaces = await db.query.space.findMany({
		where: eq(users, data.user.id),
	});

	return { success: true, data: spaces };
};

export const getAllMemories = async (
	freeMemoriesOnly: boolean = false,
): ServerActionReturnType<Content[]> => {
	const data = await auth();

	if (!data || !data.user) {
		redirect("/signin");
		return { error: "Not authenticated", success: false };
	}

	if (!freeMemoriesOnly) {
		// Returns all memories, no matter the space.
		const memories = await db.query.storedContent.findMany({
			where: eq(users, data.user.id),
		});

		return { success: true, data: memories };
	}

	// This only returns memories that are not a part of any space.
	// This is useful for home page where we want to show a list of spaces and memories.
	const contentNotInAnySpace = await db
		.select()
		.from(storedContent)
		.where(
			not(
				eq(
					storedContent.id,
					db
						.select({ contentId: contentToSpace.contentId })
						.from(contentToSpace),
				),
			),
		)
		.execute();

	return { success: true, data: contentNotInAnySpace };
};

export const getMemoriesInsideSpace = async (
	spaceId: number,
): ServerActionReturnType<{ memories: Content[]; spaces: StoredSpace[] }> => {
	const data = await auth();

	if (!data || !data.user || !data.user.email) {
		return { error: "Not authenticated", success: false };
	}

	const spaces = await db
		.select()
		.from(space)
		.where(
			and(
				eq(space.id, spaceId),
				or(
					eq(space.user, data.user.id!),
					exists(
						db
							.select()
							.from(spacesAccess)
							.where(
								and(
									eq(spacesAccess.spaceId, space.id),
									eq(spacesAccess.userEmail, data.user.email),
								),
							),
					),
				),
			),
		)
		.limit(1);

	const memories = await db
		.select({
			id: storedContent.id,
			content: storedContent.content,
			title: storedContent.title,
			description: storedContent.description,
			url: storedContent.url,
			savedAt: storedContent.savedAt,
			baseUrl: storedContent.baseUrl,
			ogImage: storedContent.ogImage,
			type: storedContent.type,
			image: storedContent.image,
			userId: storedContent.userId,
			noteId: storedContent.noteId,
		})
		.from(storedContent)
		.innerJoin(contentToSpace, eq(storedContent.id, contentToSpace.contentId))
		.where(eq(contentToSpace.spaceId, spaceId));

	if (spaces.length === 0) {
		return { error: "Not authorized", success: false };
	}

	return {
		success: true,
		data: {
			memories: memories,
			spaces: spaces,
		},
	};
};

export const getAllUserMemoriesAndSpaces = async (): ServerActionReturnType<{
	spaces: StoredSpace[];
	memories: Content[];
}> => {
	const data = await auth();

	if (!data || !data.user) {
		redirect("/signin");
		return { error: "Not authenticated", success: false };
	}

	const spaces = await db.query.space.findMany({
		where: eq(users, data.user.id),
	});

	const memories = await db.query.storedContent.findMany({
		where: eq(users, data.user.id),
	});

	return {
		success: true,
		data: { spaces: spaces, memories: memories },
	};
};

export const getFullChatThread = async (
	threadId: string,
): ServerActionReturnType<ChatHistory[]> => {
	const data = await auth();

	if (!data || !data.user || !data.user.id) {
		redirect("/signin");
		return { error: "Not authenticated", success: false };
	}

	const thread = await db.query.chatThreads.findFirst({
		where: and(
			eq(chatThreads.id, threadId),
			eq(chatThreads.userId, data.user.id),
		),
	});

	if (!thread) {
		return { error: "Thread not found", success: false };
	}

	const allChatsInThisThread = await db.query.chatHistory
		.findMany({
			where: and(eq(chatHistory.threadId, threadId)),
			orderBy: asc(chatHistory.id),
		})
		.execute();

	const accumulatedChatHistory: ChatHistory[] = allChatsInThisThread.map(
		(chat) => {
			console.log("answer sources", chat.answerSources);
			const sourceCheck = z
				.array(SourceZod)
				.safeParse(JSON.parse(chat.answerSources ?? "[]"));

			if (!sourceCheck.success || !sourceCheck.data) {
				console.error("sourceCheck.error", sourceCheck.error);
				throw new Error("Invalid source data");
			}

			const sources = sourceCheck.data;

			return {
				question: chat.question,
				answer: {
					parts: [
						{
							text: chat.answer ?? undefined,
						},
					],
					sources: sources ?? [],
				},
				proModeProcessing: {
					queries: [],
				},
			};
		},
	);

	return {
		success: true,
		data: accumulatedChatHistory,
	};
};

export const getChatHistory = async (): ServerActionReturnType<
	ChatThread[]
> => {
	const data = await auth();

	if (!data || !data.user || !data.user.id) {
		redirect("/signin");
	}

	try {
		const chatHistorys = await db.query.chatThreads.findMany({
			where: eq(chatThreads.userId, data.user.id),
		});

		return {
			success: true,
			data: chatHistorys,
		};
	} catch (e) {
		return {
			success: false,
			error: (e as Error).message,
		};
	}
};

export const getSessionAuthToken = async (): ServerActionReturnType<string> => {
	const token =
		cookies().get("next-auth.session-token")?.value ??
		cookies().get("__Secure-authjs.session-token")?.value ??
		cookies().get("authjs.session-token")?.value ??
		headers().get("Authorization")?.replace("Bearer ", "");

	return {
		success: true,
		data: token,
	};
};

export const getNoteFromId = async (
	noteId: string,
): ServerActionReturnType<Content> => {
	const data = await auth();

	if (!data || !data.user || !data.user.id) {
		redirect("/signin");
		return { error: "Not authenticated", success: false };
	}

	const note = await db.query.storedContent.findFirst({
		where: and(
			eq(storedContent.noteId, parseInt(noteId)),
			eq(users, data.user.id),
		),
	});

	return {
		success: true,
		data: note,
	};
};
export const getCanvas = async () => {
	const data = await auth();

	if (!data || !data.user || !data.user.id) {
		redirect("/signin");
		return { error: "Not authenticated", success: false };
	}

	try {
		const canvases = await db
			.select()
			.from(canvas)
			.where(eq(canvas.userId, data.user.id));

		return {
			success: true,
			data: canvases.map(({ userId, ...rest }) => rest),
		};
	} catch (e) {
		return {
			success: false,
			error: (e as Error).message,
		};
	}
};

export const userHasCanvas = async (canvasId: string) => {
	const data = await auth();

	if (!data || !data.user || !data.user.id) {
		redirect("/signin");
		return { error: "Not authenticated", success: false };
	}

	try {
		const canvases = await db
			.select()
			.from(canvas)
			.where(eq(canvas.userId, data.user.id));
		const exists = !!canvases.find((canvas) => canvas.id === canvasId);
		return {
			success: exists,
		};
	} catch (e) {
		return {
			success: false,
			error: (e as Error).message,
		};
	}
};

export const getCanvasData = async (canvasId: string) => {
	const data = await auth();

	if (!data || !data.user || !data.user.id) {
		redirect("/signin");
		return { error: "Not authenticated", success: false };
	}

	const canvas = await process.env.CANVAS_SNAPS.get(canvasId);

	console.log({ canvas, canvasId });
	if (canvas) {
		return JSON.parse(canvas);
	} else {
		return { snapshot: {} };
	}
};
