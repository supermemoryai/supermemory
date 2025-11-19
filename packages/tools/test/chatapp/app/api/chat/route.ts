import { streamText, type ModelMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { withSupermemory } from "../../../../../src/vercel"

const model = withSupermemory(openai("gpt-4"), "user-123", {
	mode: "full",
	addMemory: "always",
	conversationId: "chat-session",
	verbose: true,
})

export async function POST(req: Request) {
	const { messages }: { messages: ModelMessage[] } = await req.json()

	// Commented out generateText implementation
	// const { response } = await generateText({
	// 	model,
	// 	system: "You are a helpful assistant.",
	// 	messages,
	// })
	// return Response.json({ messages: response.messages })

	// New streaming implementation
	const result = await streamText({
		model,
		system: "You are a helpful assistant.",
		messages,
	})

	return result.toUIMessageStreamResponse()
}
