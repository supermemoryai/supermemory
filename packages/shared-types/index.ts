import { z } from "zod";

export const SourceZod = z.object({
	type: z.string(),
	source: z.string(),
	title: z.string(),
	content: z.string(),
	numChunks: z.number().optional().default(1),
});

export type Source = z.infer<typeof SourceZod>;

export const ChatHistoryZod = z.object({
	question: z.string(),
	answer: z.object({
		parts: z.array(z.object({ text: z.string().optional() })),
		sources: z.array(SourceZod),
		justification: z.string().optional(),
	}),
	proModeProcessing: z.object({
		queries: z.array(z.string()),
	}),
});

export type ChatHistory = z.infer<typeof ChatHistoryZod>;

export const ModelCompatibleChatHistoryZod = z.array(
	z.object({
		role: z.union([
			z.literal("user"),
			z.literal("assistant"),
			z.literal("system"),
		]),
		content: z.string(),
	}),
);

export const addFromAPIType = z.object({
	pageContent: z.string(),
	url: z.string(),
	type: z.string().default("page"),
	title: z.string().optional().default("Untitled"),
	description: z.string().optional().default(""),
	ogImage: z.string().optional(),
	image: z.string().optional(),
	spaces: z.array(z.string()).optional().default([]),
});

export type AddFromAPIType = z.infer<typeof addFromAPIType>;

export type ModelCompatibleChatHistory = z.infer<
	typeof ModelCompatibleChatHistoryZod
>;

export function convertChatHistoryList(
	chatHistoryList: ChatHistory[],
): ModelCompatibleChatHistory {
	let convertedChats: ModelCompatibleChatHistory = [];

	chatHistoryList.forEach((chat) => {
		convertedChats.push(
			{
				role: "user",
				content: chat.question,
			},
			{
				role: "assistant",
				content: chat.answer.parts.map((part) => part.text).join(" "),
			},
		);
	});

	// THE LAST ASSISTANT CONTENT WILL ALWAYS BE EMPTY, so we remove it
	convertedChats.pop();

	return convertedChats;
}

export const sourcesZod = z.object({
	ids: z.array(z.string().nullable()),
	metadata: z.array(z.any()),
	normalizedData: z.array(z.any()).optional(),
	proModeListedQueries: z.array(z.string()).optional(),
});

export type SourcesFromApi = z.infer<typeof sourcesZod>;
