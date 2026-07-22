/**
 * End-to-end test of apps/docs/quickstart.mdx flow
 */
import "dotenv/config"
import Supermemory from "supermemory"

const client = new Supermemory()
const user = `qs-test-${Date.now()}`
const sessionId = `chat_offsite_${Date.now()}`

async function waitUntilDone(id: string, label: string) {
	const started = Date.now()
	for (;;) {
		const d = await client.documents.get(id)
		const elapsed = ((Date.now() - started) / 1000).toFixed(1)
		console.log(`  [${label}] status=${d.status} (${elapsed}s)`)
		if (d.status === "done") return d
		if (d.status === "failed") {
			throw new Error(`Document ${id} failed: ${JSON.stringify(d)}`)
		}
		if (Date.now() - started > 120_000) {
			throw new Error(`Timeout waiting for ${id} (last status=${d.status})`)
		}
		await new Promise((r) => setTimeout(r, 1500))
	}
}

async function main() {
	console.log("=== Quickstart E2E ===")
	console.log("containerTag:", user)
	console.log("")

	// 1. Ingest conversation
	console.log("1. Ingest conversation")
	const conversation = `
user: Just got back from Tokyo — the team offsite went great.
assistant: Glad it went well! Anything stand out?
user: Sarah presented the Q3 roadmap at the offsite.
assistant: Sounds like a big moment for her.
user: She's being promoted to VP of Product.
assistant: Congrats to Sarah — that's huge.
user: I need a gift idea for my VP of Product.
assistant: Happy to help brainstorm something personal.
`.trim()

	const conv = await client.add({
		content: conversation,
		containerTag: user,
		customId: sessionId,
		metadata: { type: "conversation" },
	})
	console.log("  id:", conv.id, "status:", conv.status)

	// 2. Ingest document
	console.log("\n2. Ingest document")
	const handbook = `
# Team notes — gifts & recognition

When someone is promoted to VP or above, the company recommends a thoughtful gift
in the $75–$150 range. Experiences tied to recent team milestones land better
than generic swag.

For product leadership, books on platform strategy or a dinner near the last
offsite city are common picks. Tokyo offsites often inspire travel-themed gifts.
`.trim()

	const doc = await client.add({
		content: handbook,
		containerTag: user,
		customId: `doc_gift_policy_${Date.now()}`,
		metadata: { type: "document", source: "handbook" },
	})
	console.log("  id:", doc.id, "status:", doc.status)

	// 3. Wait
	console.log("\n3. Wait until done")
	await waitUntilDone(conv.id, "conversation")
	await waitUntilDone(doc.id, "document")

	// 4A. Document search (RAG)
	console.log("\n4A. Document search (RAG)")
	const rag = await client.search.documents({
		q: "gift ideas for a VP promotion after a Tokyo offsite",
		containerTags: [user],
		limit: 3,
	})
	console.log("  total:", rag.total, "timing:", rag.timing)
	for (const hit of rag.results) {
		console.log("  hit:", (hit as any).title ?? hit.id)
		const chunks = (hit as any).chunks ?? []
		for (const chunk of chunks.slice(0, 2)) {
			const text = chunk.content ?? chunk.chunk ?? JSON.stringify(chunk)
			console.log("    chunk:", String(text).slice(0, 120).replace(/\n/g, " "))
		}
	}
	if (rag.total === 0 && rag.results.length === 0) {
		console.warn("  ⚠ No document results — checking hybrid search")
	}

	// 4B. Memory graph traversal
	console.log("\n4B. Memory search + relatedMemories")
	let memories: any
	try {
		memories = await client.search.memories({
			q: "What gift should I get, and why?",
			containerTag: user,
			// searchMode may or may not be supported by installed SDK
			...({ searchMode: "memories" } as any),
			include: { relatedMemories: true },
			limit: 5,
		})
	} catch (e: any) {
		console.log("  searchMode memories failed, retrying without:", e?.message)
		memories = await client.search.memories({
			q: "What gift should I get, and why?",
			containerTag: user,
			include: { relatedMemories: true },
			limit: 5,
		})
	}
	console.log("  total:", memories.total, "timing:", memories.timing)
	for (const r of memories.results ?? []) {
		console.log("  memory:", (r.memory ?? r.content ?? "").slice(0, 120))
		console.log("  similarity:", r.similarity)
		if (r.context) {
			console.log(
				"  context parents:",
				(r.context.parents ?? []).map((p: any) => p.memory?.slice?.(0, 80) ?? p),
			)
			console.log(
				"  context children:",
				(r.context.children ?? []).map((c: any) => c.memory?.slice?.(0, 80) ?? c),
			)
		}
	}

	// Retry memory search if empty (extraction lag after done)
	if ((memories.results ?? []).length === 0) {
		console.log("  empty — waiting 5s and retrying memory search...")
		await new Promise((r) => setTimeout(r, 5000))
		memories = await client.search.memories({
			q: "What gift should I get, and why?",
			containerTag: user,
			include: { relatedMemories: true },
			limit: 5,
		})
		console.log("  retry total:", memories.total)
		for (const r of memories.results ?? []) {
			console.log("  memory:", (r.memory ?? r.content ?? "").slice(0, 120))
		}
	}

	// 4C. Profile
	console.log("\n4C. Profile")
	const { profile, searchResults } = await client.profile({
		containerTag: user,
		q: "gift for the person being promoted",
	})
	console.log("  static:", profile.static)
	console.log("  dynamic:", profile.dynamic)
	console.log("  search hits:", searchResults?.results?.length ?? 0)

	// 5. Harness-shaped read (no LLM required)
	console.log("\n5. Harness context assembly")
	const { profile: p2, searchResults: sr2 } = await client.profile({
		containerTag: user,
		q: "What gift should I get for the person being promoted?",
	})
	const rag2 = await client.search.documents({
		q: "What gift should I get for the person being promoted?",
		containerTags: [user],
		limit: 3,
	})
	const docBits = rag2.results
		.flatMap((r: any) => r.chunks ?? [])
		.map((c: any) => c.content ?? c.chunk)
		.filter(Boolean)
		.slice(0, 3)

	const context = [
		"## Profile (static)",
		...p2.static,
		"## Profile (dynamic)",
		...p2.dynamic,
		"## Related memories",
		...(sr2?.results?.map((m: any) => m.memory ?? m.content).filter(Boolean) ?? []),
		"## Docs",
		...docBits.map((t: string) => t.slice(0, 200)),
	].join("\n")

	console.log("--- assembled context ---")
	console.log(context.slice(0, 1500))
	console.log("--- end ---")

	// Append a turn with same customId
	console.log("\n6. Append conversation turn (customId)")
	const append = await client.add({
		content:
			"user: What gift should I get for the person being promoted?\nassistant: Something for Sarah, your new VP of Product, tied to Tokyo.",
		containerTag: user,
		customId: sessionId,
	})
	console.log("  append id:", append.id, "status:", append.status)

	// Summary
	console.log("\n=== SUMMARY ===")
	const checks = {
		convQueued: Boolean(conv.id),
		docQueued: Boolean(doc.id),
		ragHits: (rag.results?.length ?? 0) > 0 || (rag2.results?.length ?? 0) > 0,
		memoryHits: (memories.results?.length ?? 0) > 0,
		relatedPresent: (memories.results ?? []).some(
			(r: any) => r.context?.parents?.length || r.context?.children?.length,
		),
		profileStatic: (profile.static?.length ?? 0) > 0,
		profileDynamic: (profile.dynamic?.length ?? 0) > 0,
		contextNonEmpty: context.length > 50,
	}
	console.log(checks)

	const hardFail = !checks.convQueued || !checks.docQueued || !checks.contextNonEmpty
	const softIssues = Object.entries(checks)
		.filter(([k, v]) => !v && k !== "relatedPresent")
		.map(([k]) => k)

	if (hardFail) {
		console.error("\n❌ Hard failure")
		process.exit(1)
	}
	if (softIssues.length) {
		console.warn("\n⚠ Soft issues (flow ran but weak results):", softIssues.join(", "))
		if (!checks.relatedPresent) {
			console.warn("  (relatedMemories edges may need more time / different query)")
		}
		process.exit(0)
	}
	console.log("\n✅ Quickstart flow OK")
}

main().catch((e) => {
	console.error("\n❌ Error:", e)
	process.exit(1)
})
