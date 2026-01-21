import "dotenv/config"
import Supermemory from "supermemory"

const client = new Supermemory()

async function testSearchModes() {
	console.log("=== Search Modes ===")

	// Hybrid: memories + document chunks (recommended)
	const hybridResults = await client.search.memories({
		q: "quarterly goals",
		containerTag: "user_123",
		searchMode: "hybrid",
	})
	console.log("✓ hybrid search:", hybridResults.results.length, "results")

	// Memories only
	const memoriesResults = await client.search.memories({
		q: "user preferences",
		containerTag: "user_123",
		searchMode: "memories",
	})
	console.log("✓ memories search:", memoriesResults.results.length, "results")
}

async function testFiltering() {
	console.log("\n=== Filtering ===")

	// Basic containerTag filter
	const results = await client.search.memories({
		q: "project updates",
		containerTag: "user_123",
		searchMode: "hybrid",
	})
	console.log("✓ containerTag filter:", results.results.length, "results")

	// Metadata-based filtering
	const filteredResults = await client.search.memories({
		q: "meeting notes",
		containerTag: "user_123",
		filters: {
			AND: [
				{ key: "type", value: "meeting" },
				{ key: "year", value: "2024" },
			],
		},
	})
	console.log("✓ metadata filter:", filteredResults.results.length, "results")
}

async function testReranking() {
	console.log("\n=== Reranking ===")

	const results = await client.search.memories({
		q: "complex technical question",
		containerTag: "user_123",
		rerank: true,
	})
	console.log("✓ reranking:", results.results.length, "results")
}

async function testThreshold() {
	console.log("\n=== Threshold ===")

	const broadResults = await client.search.memories({
		q: "test query",
		threshold: 0.3,
	})
	console.log(
		"✓ broad threshold (0.3):",
		broadResults.results.length,
		"results",
	)

	const preciseResults = await client.search.memories({
		q: "test query",
		threshold: 0.8,
	})
	console.log(
		"✓ precise threshold (0.8):",
		preciseResults.results.length,
		"results",
	)
}

async function testChatbotContext() {
	console.log("\n=== Chatbot Context Pattern ===")

	async function getContext(userId: string, message: string) {
		const results = await client.search.memories({
			q: message,
			containerTag: userId,
			searchMode: "hybrid",
			threshold: 0.6,
			limit: 5,
		})
		return results.results.map((r) => r.memory || r.chunk).join("\n\n")
	}

	const context = await getContext("user_123", "What are the project updates?")
	console.log("✓ chatbot context:", context.length, "chars")
}

async function main() {
	console.log("Search Tests")
	console.log("============\n")

	await testSearchModes()
	await testFiltering()
	await testReranking()
	await testThreshold()
	await testChatbotContext()

	console.log("\n============")
	console.log("✅ All search tests passed!")
}

main().catch(console.error)
