/**
 * Mapping between LangGraph store namespaces and supermemory container tags.
 *
 * LangGraph addresses items by a hierarchical `string[]` namespace; supermemory
 * scopes documents by a flat container tag that the API restricts to
 * alphanumerics, hyphens, underscores and colons.
 *
 * Segments are joined with `:` and percent-encoded with `_` in place of `%`
 * (everything outside `[A-Za-z0-9-]` becomes `_<hex>` UTF-8 bytes), so arbitrary
 * namespace text survives the round trip and `["a:b"]` cannot collide with
 * `["a", "b"]`.
 */

const SEPARATOR = ":"

function encodeSegment(segment: string): string {
	// encodeURIComponent leaves `_.!~*'()` alone; escape those too.
	return encodeURIComponent(segment)
		.replace(/[^A-Za-z0-9%-]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)
		.replaceAll("%", "_")
}

function decodeSegment(segment: string): string {
	return decodeURIComponent(segment.replaceAll("_", "%"))
}

/** Join a LangGraph namespace into a single supermemory container tag. */
export function namespaceToContainerTag(namespace: string[]): string {
	return namespace.map(encodeSegment).join(SEPARATOR)
}

/** Parse a container tag back into its namespace segments. */
export function containerTagToNamespace(tag: string): string[] {
	return tag.split(SEPARATOR).map(decodeSegment)
}
