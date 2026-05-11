import { generateText } from "ai"
import { withSupermemory } from "../src/ai-sdk"
import { openai } from "@ai-sdk/openai"

const modelWithMemory = withSupermemory(openai("gpt-5"), {
	containerTag: "user_id_life",
	customId: "conversation-123",
	verbose: true,
	mode: "query", // options are profile, query, full (default is profile)
	addMemory: "always", // options are always, never (default is never)
})

const result = await generateText({
	model: modelWithMemory,
	system: "You are an AI Girlfriend",
	messages: [{ role: "user", content: "Where do i live?" }],
})

console.log(result.text)
