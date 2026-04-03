import { OpenAI } from "openai"
//import { withSupermemory } from "@supermemory/tools/openai"
import { withSupermemory } from "../../../../../src/openai"

export const runtime = "nodejs"

export async function POST(req: Request) {
	const { messages, customId } = (await req.json()) as {
		messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
		customId: string
	}

	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	})

	const openaiWithSupermemory = withSupermemory(openai, {
		containerTag: "user-123",
		customId,
		mode: "full",
		addMemory: "always",
		verbose: true,
		baseUrl: process.env.SUPERMEMORY_BASE_URL,
	})

	const completion = await openaiWithSupermemory.chat.completions.create({
		model: "gpt-4o-mini",
		messages,
	})

	const message = completion.choices?.[0]?.message
	return Response.json({ message, usage: completion.usage })
}
