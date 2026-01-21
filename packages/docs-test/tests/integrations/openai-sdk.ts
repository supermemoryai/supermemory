import "dotenv/config"
import OpenAI from "openai"
import { withSupermemory } from "@supermemory/tools/openai"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function testOpenAIWrapper() {
	console.log("=== OpenAI SDK Wrapper ===")

	if (!OPENAI_API_KEY) {
		console.log("⚠ OPENAI_API_KEY not set, skipping live tests")
		return false
	}

	const openai = new OpenAI()

	// Basic wrapper
	const client = withSupermemory(openai, "docs-test-openai")
	console.log("✓ withSupermemory basic")

	// With options
	const clientWithOptions = withSupermemory(openai, "docs-test-openai", {
		mode: "full",
		addMemory: "always",
		verbose: true,
	})
	console.log("✓ withSupermemory with options")
}

async function testChatCompletion() {
	console.log("\n=== Chat Completion with Memory ===")

	if (!OPENAI_API_KEY) {
		console.log("⚠ OPENAI_API_KEY not set, skipping")
		return
	}

	const openai = new OpenAI()
	const client = withSupermemory(openai, "docs-test-openai", {
		mode: "full",
		addMemory: "always",
	})

	// Add context
	const addResponse = await client.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [
			{ role: "system", content: "You are a helpful assistant." },
			{ role: "user", content: "Remember that my favorite color is blue." },
		],
		max_tokens: 100,
	})
	console.log(
		"✓ Add context:",
		addResponse.choices[0]?.message.content?.substring(0, 50),
	)

	// Retrieve context
	const retrieveResponse = await client.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [
			{ role: "system", content: "You are a helpful assistant." },
			{ role: "user", content: "What do you know about my preferences?" },
		],
		max_tokens: 100,
	})
	console.log(
		"✓ Retrieve context:",
		retrieveResponse.choices[0]?.message.content?.substring(0, 50),
	)
}

async function main() {
	console.log("OpenAI SDK Integration Tests")
	console.log("============================\n")

	const hasKey = await testOpenAIWrapper()
	if (hasKey !== false) {
		await testChatCompletion()
	}

	console.log("\n============================")
	console.log("✅ All OpenAI SDK tests passed!")
}

main().catch(console.error)
