import { z } from "zod";

export const ChatHistoryZod = z.object({
  question: z.string(),
  answer: z.object({
    parts: z.array(z.object({ text: z.string() })),
    sources: z.array(
      z.object({
        type: z.enum(["note", "page", "tweet"]),
        source: z.string(),
        title: z.string(),
        content: z.string(),
        numChunks: z.number().optional().default(1),
      }),
    ),
    justification: z.string().optional(),
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

  return convertedChats;
}
