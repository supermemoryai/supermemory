import { OpenAI } from "openai"
//import { withSupermemory } from "@supermemory/tools/openai"
import { withSupermemory } from "../../../../../src/openai"

export const runtime = "nodejs"

export async function POST(req: Request) {
	const { messages, conversationId } = (await req.json()) as {
		messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
		conversationId: string
	}

	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	})

	const openaiWithSupermemory = withSupermemory(openai, "user-123", {
		conversationId,
		mode: "full",
		addMemory: "always",
		verbose: true,
	})

	const completion = await openaiWithSupermemory.chat.completions.create({
		model: "gpt-4o-mini",
		messages,
	})

	const message = completion.choices?.[0]?.message
	return Response.json({ message, usage: completion.usage })
}
