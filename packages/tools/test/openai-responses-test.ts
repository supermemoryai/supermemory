import { OpenAI } from "openai"
import { withSupermemory } from "../src/openai"

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

const openaiWithSupermemory = withSupermemory(openai, "user_id_life", {
	verbose: true,
	mode: "full",
	addMemory: "always",
})

const response = await openaiWithSupermemory.responses.create({
	model: "gpt-4o",
	instructions: "you are ai girlfriend",
	input: "Where do i live?",
})

console.log("Response output:", JSON.stringify(response.output[0], null, 2))
console.log("Usage:", response.usage)
