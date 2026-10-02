/**
 * Mapping between LangGraph store namespaces and supermemory container tags.
 *
 * LangGraph addresses items by a hierarchical `string[]` namespace; supermemory
 * scopes documents by a flat container tag that the API restricts to
 * alphanumerics, hyphens, underscores and colons.
 *
 * Segments are joined with `:` and everything outside `[A-Za-z0-9-]` is encoded
 * as `_<hex>`, so arbitrary namespace text survives the round trip and
 * `["a:b"]` cannot collide with `["a", "b"]`.
 */

const SEPARATOR = ":"

function encodeSegment(segment: string): string {
	return encodeURIComponent(segment).replace(
		/[^A-Za-z0-9-]/g,
		(char) => `_${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
	)
}

function decodeSegment(segment: string): string {
	return decodeURIComponent(
		segment.replace(/_([0-9a-f]{2})/gi, (_match, hex: string) =>
			String.fromCharCode(Number.parseInt(hex, 16)),
		),
	)
}

/** Join a LangGraph namespace into a single supermemory container tag. */
export function namespaceToContainerTag(namespace: string[]): string {
	return namespace.map(encodeSegment).join(SEPARATOR)
}

/** Parse a container tag back into its namespace segments. */
export function containerTagToNamespace(tag: string): string[] {
	return tag.split(SEPARATOR).map(decodeSegment)
}
