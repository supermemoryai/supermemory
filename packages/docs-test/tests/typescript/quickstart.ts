import "dotenv/config"
import Supermemory from "supermemory"

const client = new Supermemory()
const USER_ID = "docs-test-user"

const conversation = [
	{ role: "assistant", content: "Hello, how are you doing?" },
	{
		role: "user",
		content: "Hello! I am Dhravya. I am 20 years old. I love to code!",
	},
	{ role: "user", content: "Can I go to the club?" },
]

async function main() {
	console.log("Testing quickstart TypeScript code...\n")

	// Get user profile + relevant memories for context
	console.log("1. Getting user profile...")
	const profile = await client.profile({
		containerTag: USER_ID,
		q: conversation.at(-1)!.content,
	})

	console.log("Profile response:", JSON.stringify(profile, null, 2))

	const context = `Static profile:
${profile.profile.static.join("\n")}

Dynamic profile:
${profile.profile.dynamic.join("\n")}

Relevant memories:
${profile.searchResults?.results.map((r) => r.content).join("\n")}`

	console.log("\n2. Built context:", context)

	// Build messages with memory-enriched context
	const messages = [
		{ role: "system", content: `User context:\n${context}` },
		...conversation,
	]
	console.log("\n3. Messages built successfully")

	// Store conversation for future context
	console.log("\n4. Adding memory...")
	const addResult = await client.add({
		content: conversation.map((m) => `${m.role}: ${m.content}`).join("\n"),
		containerTag: USER_ID,
	})

	console.log("Add result:", JSON.stringify(addResult, null, 2))
	console.log("\n✅ Quickstart TypeScript test passed!")
}

main().catch(console.error)
