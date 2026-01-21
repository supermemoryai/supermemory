import "dotenv/config"
import Supermemory from "supermemory"

const client = new Supermemory()
const USER_ID = "docs-test-profiles"

async function testBasicProfile() {
	console.log("=== Basic Profile ===")

	const profile = await client.profile({
		containerTag: USER_ID,
		q: "What are my preferences?",
	})

	console.log("✓ Static profile:", profile.profile.static.length, "items")
	console.log("✓ Dynamic profile:", profile.profile.dynamic.length, "items")
	console.log(
		"✓ Search results:",
		profile.searchResults.results.length,
		"items",
	)
}

async function testProfileWithMemories() {
	console.log("\n=== Profile with Memory Context ===")

	// First add some memories
	await client.add({
		content: "User prefers dark mode for all applications",
		containerTag: USER_ID,
	})
	await client.add({
		content: "User is learning TypeScript and Rust",
		containerTag: USER_ID,
	})

	// Wait a bit for indexing
	await new Promise((r) => setTimeout(r, 2000))

	// Now get profile with search
	const profile = await client.profile({
		containerTag: USER_ID,
		q: "What programming languages does the user know?",
	})

	console.log("✓ Profile retrieved with memories")
	console.log("  Static:", profile.profile.static.slice(0, 2))
	console.log("  Dynamic:", profile.profile.dynamic.slice(0, 2))
}

async function testBuildingContext() {
	console.log("\n=== Building LLM Context ===")

	const conversation = [
		{ role: "user", content: "What theme should I use for my IDE?" },
	]

	const profile = await client.profile({
		containerTag: USER_ID,
		q: conversation.at(-1)!.content,
	})

	const context = `User Profile:
${profile.profile.static.join("\n")}

Recent Context:
${profile.profile.dynamic.join("\n")}

Relevant Memories:
${profile.searchResults.results.map((r) => r.content).join("\n")}`

	console.log("✓ Built context:", context.length, "chars")

	const messages = [
		{ role: "system", content: `Use this context about the user:\n${context}` },
		...conversation,
	]
	console.log("✓ Messages ready for LLM:", messages.length, "messages")
}

async function main() {
	console.log("User Profiles Tests")
	console.log("===================\n")

	await testBasicProfile()
	await testProfileWithMemories()
	await testBuildingContext()

	console.log("\n===================")
	console.log("✅ All user profile tests passed!")
}

main().catch(console.error)
