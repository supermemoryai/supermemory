import type { ContainerContext } from "./context-api"

type ProfileSlice = ContainerContext["profile"]

/** Normalize a fact for exact comparison within retrieved context. */
export function normalizeFactKey(text: string): string {
	return text
		.replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase()
}

function memoryText(item: unknown): string {
	if (typeof item === "string") return item
	if (item && typeof item === "object") {
		const record = item as Record<string, unknown>
		if (typeof record.memory === "string") return record.memory
		if (typeof record.content === "string") return record.content
		if (typeof record.chunk === "string") return record.chunk
	}
	return JSON.stringify(item)
}

/**
 * Deduplicate static → dynamic → search (same priority as @supermemory/tools middleware).
 */
export function dedupeProfileForMode(
	mode: "profile" | "query" | "full",
	profile: ProfileSlice,
): ProfileSlice {
	const injectsProfile = mode !== "query"
	const staticItems = injectsProfile ? profile.static : []
	const dynamicItems = injectsProfile ? profile.dynamic : []
	const searchItems = profile.searchResults

	const seen = new Set<string>()
	const staticOut: unknown[] = []
	const dynamicOut: unknown[] = []
	const searchOut: unknown[] = []

	for (const item of staticItems) {
		const text = memoryText(item).trim()
		if (!text) continue
		const key = normalizeFactKey(text)
		if (seen.has(key)) continue
		seen.add(key)
		staticOut.push(item)
	}

	for (const item of dynamicItems) {
		const text = memoryText(item).trim()
		if (!text) continue
		const key = normalizeFactKey(text)
		if (seen.has(key)) continue
		seen.add(key)
		dynamicOut.push(item)
	}

	for (const item of searchItems) {
		const text = memoryText(item).trim()
		if (!text) continue
		const key = normalizeFactKey(text)
		if (seen.has(key)) continue
		seen.add(key)
		searchOut.push(item)
	}

	return {
		static: staticOut,
		dynamic: dynamicOut,
		searchResults: mode === "profile" ? [] : searchOut,
	}
}
