import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { withSupermemory } from "./tools/src/vercel"

const modelWithMemory = withSupermemory(openai("gpt-5"), "user_id_life")

const result = await generateText({
	model: modelWithMemory,
	messages: [{ role: "user", content: "where do i live?" }],
})

console.log(result.content)
