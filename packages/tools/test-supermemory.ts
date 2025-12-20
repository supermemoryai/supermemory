import { OpenAI } from "openai"
import { withSupermemory } from "./src/openai"

// Make sure to set these environment variables:
// OPENAI_API_KEY=your_openai_api_key
// SUPERMEMORY_API_KEY=your_supermemory_api_key

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

// Wrap OpenAI client with supermemory
const openaiWithSupermemory = withSupermemory(openai, "test_user_123", {
	verbose: true, // Enable logging to see what's happening
	mode: "full", // Search both profile and query memories
	addMemory: "always", // Auto-save conversations as memories
})

// async function testChatCompletion() {
// 	console.log("\n=== Testing Chat Completion ===")
// 	const response = await openaiWithSupermemory.chat.completions.create({
// 		model: "gpt-4o-mini",
// 		messages: [
// 			{ role: "user", content: "My favorite color is blue" },
// 		],
// 	})

// 	console.log("Response:", response.choices[0]?.message.content)
// }

async function testResponses() {
	console.log("\n=== Testing Responses API ===")
	const response = await openaiWithSupermemory.chat.completions.create({
		model: "gpt-4o",
		messages: [
			{ role: "user", content: "what's my favoritge color?" },
		],
	})

	console.log("Response:", JSON.stringify(response.choices[0]?.message.content, null, 2))
}

// Run tests
async function main() {
	try {
		// await testChatCompletion()
		await testResponses()
	} catch (error) {
		console.error("Error:", error)
	}
}

main()
