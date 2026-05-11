import type { UIMessage } from "@ai-sdk/react"
import { memoryResultsFromSearchToolOutput } from "@/lib/chat-search-memory-results"

const UUID_IN_STRING =
	/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

const UUID_STRICT =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Matches [doc:<id>] annotations emitted by sgrep when includeDocIds is enabled.
// Supermemory uses NanoIDs (alphanumeric + _ -), not UUIDs.
const DOC_ANNOTATION = /\[doc:([A-Za-z0-9_-]{10,40})\]/g

function collectIdsFromDynamicTool(part: Record<string, unknown>): string[] {
	const toolName = part.toolName
	if (!part.output) return []

	if (toolName === "searchMemories") {
		return memoryResultsFromSearchToolOutput(part.output)
			.map((r) => r.documentId)
			.filter((id): id is string => Boolean(id))
	}

	if (toolName === "bash") {
		return documentIdsFromBashText(
			extractBashOutputString(part.output as Record<string, unknown>),
		)
	}

	const fromWalk: string[] = []
	collectDocumentIdsFromUnknown(part.output, fromWalk)
	return fromWalk
}

function extractBashOutputString(output: Record<string, unknown>): string {
	const stdout = output.stdout
	return typeof stdout === "string" ? stdout : ""
}

/** Heuristic: pull document IDs from bash stdout. Handles [doc:<id>] annotations, UUID patterns, and JSON documentId fields. */
export function documentIdsFromBashText(text: string): string[] {
	const found = new Set<string>()
	// [doc:<nanoid>] annotations from sgrep --include-doc-ids (highest confidence)
	for (const m of text.matchAll(DOC_ANNOTATION)) {
		found.add(m[1])
	}
	// Standard UUID format
	for (const m of text.matchAll(UUID_IN_STRING)) {
		found.add(m[0].toLowerCase())
	}
	// JSON "documentId": "..." fields
	const quoted = /"documentId"\s*:\s*"([^"]+)"/g
	let q = quoted.exec(text)
	while (q !== null) {
		found.add(q[1])
		q = quoted.exec(text)
	}
	return [...found]
}

function collectDocumentIdsFromUnknown(value: unknown, out: string[]): void {
	const seen = new Set<string>()
	const walk = (v: unknown, depth: number) => {
		if (depth > 18) return
		if (v === null || v === undefined) return
		if (typeof v === "string") {
			if (v.length > 0 && v.length < 400000) {
				for (const id of documentIdsFromBashText(v)) {
					if (!seen.has(id)) {
						seen.add(id)
						out.push(id)
					}
				}
			}
			return
		}
		if (Array.isArray(v)) {
			for (const x of v) walk(x, depth + 1)
			return
		}
		if (typeof v !== "object") return
		const o = v as Record<string, unknown>

		const docId = o.documentId
		if (
			typeof docId === "string" &&
			UUID_STRICT.test(docId) &&
			!seen.has(docId)
		) {
			seen.add(docId)
			out.push(docId)
		}

		if (Array.isArray(o.documents)) {
			for (const d of o.documents) {
				if (!d || typeof d !== "object") continue
				const doc = d as Record<string, unknown>
				const id = doc.id
				if (typeof id === "string" && UUID_STRICT.test(id) && !seen.has(id)) {
					seen.add(id)
					out.push(id)
				}
			}
		}

		for (const key of [
			"results",
			"memories",
			"chunks",
			"hits",
			"items",
			"data",
		]) {
			if (key in o) walk(o[key], depth + 1)
		}
	}
	walk(value, 0)
}

function toolOutputReady(p: Record<string, unknown>): boolean {
	const s = p.state
	return (
		s === "output-available" ||
		s === "done" ||
		(s === undefined && p.output !== undefined)
	)
}

/** Document IDs referenced by retrieval tools / sources in this thread. */
export function extractHighlightDocumentIdsFromMessages(
	messages: UIMessage[],
): string[] {
	const ids = new Set<string>()

	for (const message of messages) {
		if (message.role !== "assistant") continue
		const parts = message.parts
		if (!parts) continue

		for (const part of parts) {
			const p = part as Record<string, unknown>

			if (p.type === "source-document") {
				const sid = (p as { sourceId?: unknown }).sourceId
				if (typeof sid === "string" && UUID_STRICT.test(sid)) {
					ids.add(sid)
				}
				continue
			}

			if (p.type === "tool-searchMemories" && toolOutputReady(p)) {
				for (const id of memoryResultsFromSearchToolOutput(p.output)
					.map((r) => r.documentId)
					.filter(Boolean)) {
					ids.add(id as string)
				}
				continue
			}

			if (p.type === "dynamic-tool" && toolOutputReady(p)) {
				for (const id of collectIdsFromDynamicTool(p)) {
					ids.add(id)
				}
				continue
			}

			if (
				typeof p.type === "string" &&
				p.type.startsWith("tool-") &&
				toolOutputReady(p)
			) {
				const name = p.type.slice("tool-".length)
				if (name === "searchMemories") {
					for (const id of memoryResultsFromSearchToolOutput(p.output)
						.map((r) => r.documentId)
						.filter(Boolean)) {
						ids.add(id as string)
					}
				} else if (name === "bash") {
					const out = p.output as Record<string, unknown> | undefined
					const stdout = out && typeof out.stdout === "string" ? out.stdout : ""
					for (const id of documentIdsFromBashText(stdout)) {
						ids.add(id)
					}
				} else if (p.output) {
					const buf: string[] = []
					collectDocumentIdsFromUnknown(p.output, buf)
					for (const id of buf) ids.add(id)
				}
			}
		}
	}

	if (ids.size === 0) {
		const lastAssistant = [...messages]
			.reverse()
			.find((m) => m.role === "assistant")
		const parts = lastAssistant?.parts
		if (parts) {
			const texts = parts
				.filter((p): p is { type: "text"; text: string } => p.type === "text")
				.map((p) => p.text)
				.join("\n")
			let n = 0
			for (const m of texts.matchAll(UUID_IN_STRING)) {
				if (n >= 16) break
				ids.add(m[0].toLowerCase())
				n++
			}
		}
	}

	return [...ids]
}
