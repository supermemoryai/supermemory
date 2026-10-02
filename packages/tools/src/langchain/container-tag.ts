/**
 * Mapping between LangGraph store namespaces and supermemory container tags.
 *
 * LangGraph addresses items by a hierarchical `string[]` namespace plus a key.
 * supermemory scopes documents by a flat container tag, so a namespace is
 * joined into a single tag and parsed back on the way out.
 */

const SEPARATOR = "/"

/**
 * Join a LangGraph namespace into a single supermemory container tag.
 *
 * Segments are escaped so a segment containing the separator cannot collide
 * with a deeper namespace: `["a/b"]` and `["a", "b"]` map to distinct tags.
 */
export function namespaceToContainerTag(namespace: string[]): string {
	return namespace
		.map((segment) => segment.replace(/\\/g, "\\\\").replace(/\//g, "\\/"))
		.join(SEPARATOR)
}

/**
 * Parse a container tag produced by {@link namespaceToContainerTag} back into
 * its namespace segments.
 */
export function containerTagToNamespace(tag: string): string[] {
	const segments: string[] = []
	let current = ""
	let escaped = false

	for (const char of tag) {
		if (escaped) {
			current += char
			escaped = false
		} else if (char === "\\") {
			escaped = true
		} else if (char === SEPARATOR) {
			segments.push(current)
			current = ""
		} else {
			current += char
		}
	}
	segments.push(current)

	return segments
}

/**
 * True when `namespace` is `prefix` or sits underneath it.
 */
export function isUnderPrefix(namespace: string[], prefix: string[]): boolean {
	if (prefix.length > namespace.length) return false
	return prefix.every((segment, i) => namespace[i] === segment)
}
