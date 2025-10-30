import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { withSupermemory } from "../../../../../src/vercel"

const model = withSupermemory(openai("gpt-4"), "user-123", {
	mode: "full",
	addMemory: "always",
	conversationId: "chat-session",
	verbose: true,
})

export async function POST(req: Request) {
	const { messages }: { messages: UIMessage[] } = await req.json()

	const result = streamText({
		model,
		system: "You are a helpful assistant.",
		messages: convertToModelMessages(messages),
	})

	return result.toUIMessageStreamResponse()
}
