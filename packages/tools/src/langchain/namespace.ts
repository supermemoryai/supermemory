const PREFIX = "langgraph:"
const SEPARATOR = ":"

function encodeSegment(segment: string): string {
	return encodeURIComponent(segment)
		.replace(/[^A-Za-z0-9%-]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)
		.replaceAll("%", "_")
}

function decodeSegment(segment: string): string {
	return decodeURIComponent(segment.replaceAll("_", "%"))
}

/** Maps a hierarchical LangGraph namespace to one isolated v5 namespace. */
export function toSupermemoryNamespace(namespace: string[]): string {
	return `${PREFIX}${namespace.map(encodeSegment).join(SEPARATOR)}`
}

/** Returns null for namespaces not owned by this LangGraph store. */
export function fromSupermemoryNamespace(namespace: string): string[] | null {
	if (!namespace.startsWith(PREFIX)) return null
	const encoded = namespace.slice(PREFIX.length)
	try {
		return encoded ? encoded.split(SEPARATOR).map(decodeSegment) : []
	} catch {
		return null
	}
}
