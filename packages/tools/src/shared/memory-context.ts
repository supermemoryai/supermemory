export const MEMORY_CONTEXT_START =
	'<supermemory context="user-memories" readonly>'
export const MEMORY_CONTEXT_END = "</supermemory>"

const MEMORY_CONTEXT_PATTERN =
	/[ \t]*<supermemory context="user-memories" readonly>[\s\S]*?<\/supermemory>[ \t]*/g

/** Remove every context block previously owned by the Supermemory middleware. */
export function stripMemoryContext(content: string): string {
	return content
		.replace(MEMORY_CONTEXT_PATTERN, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

/** Mark retrieved memory context so a later turn can replace it safely. */
export function wrapMemoryContext(memories: string): string {
	const normalized = memories.trim()
	if (!normalized) return ""
	return `${MEMORY_CONTEXT_START}\n${normalized}\n${MEMORY_CONTEXT_END}`
}

/** Replace prior middleware context while preserving caller-authored instructions. */
export function replaceMemoryContext(
	content: string,
	memories: string,
): string {
	const preserved = stripMemoryContext(content)
	const memoryContext = wrapMemoryContext(memories)
	if (!memoryContext) return preserved
	return preserved ? `${preserved}\n\n${memoryContext}` : memoryContext
}
