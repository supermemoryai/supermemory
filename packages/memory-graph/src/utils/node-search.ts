import type { GraphNode } from "../types"

/**
 * Relevance tiers for a single node match, highest first. A node's overall
 * score is the best tier any of its fields achieves for the query.
 */
const SCORE_PRIMARY_PREFIX = 3
const SCORE_PRIMARY_INCLUDES = 2
const SCORE_SECONDARY_INCLUDES = 1
const SCORE_NONE = 0

/**
 * The text fields that make a node findable, split into a primary field (the
 * node's headline: a document title or a memory's text) and secondary fields
 * (supporting copy that should still match but rank lower).
 */
function getNodeSearchFields(node: GraphNode): {
	primary: string
	secondary: string
} {
	if (node.type === "document") {
		const data = node.data as {
			title: string | null
			summary: string | null
			type: string
		}
		return {
			primary: data.title ?? "",
			secondary: `${data.summary ?? ""} ${data.type ?? ""}`,
		}
	}

	const data = node.data as { memory: string; content: string }
	return {
		primary: data.memory ?? "",
		secondary: data.content ?? "",
	}
}

function scoreNode(node: GraphNode, query: string): number {
	const { primary, secondary } = getNodeSearchFields(node)
	const primaryLower = primary.toLowerCase()

	if (primaryLower.startsWith(query)) return SCORE_PRIMARY_PREFIX
	if (primaryLower.includes(query)) return SCORE_PRIMARY_INCLUDES
	if (secondary.toLowerCase().includes(query)) return SCORE_SECONDARY_INCLUDES
	return SCORE_NONE
}

/**
 * Find the nodes whose text matches `rawQuery`, ordered by relevance.
 *
 * Matching is a case-insensitive substring test across each node's title/memory
 * (primary) and summary/type/content (secondary) text. Results are sorted by
 * relevance tier — primary-prefix, then primary-substring, then
 * secondary-substring — and ties keep the input order so the result is stable
 * and independent of the force-simulation's node positions.
 *
 * An empty or whitespace-only query returns no matches.
 */
export function searchNodes(nodes: GraphNode[], rawQuery: string): GraphNode[] {
	const query = rawQuery.trim().toLowerCase()
	if (!query) return []

	const scored: { node: GraphNode; score: number; index: number }[] = []
	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index]
		if (!node) continue
		const score = scoreNode(node, query)
		if (score > SCORE_NONE) scored.push({ node, score, index })
	}

	scored.sort((a, b) => b.score - a.score || a.index - b.index)
	return scored.map((entry) => entry.node)
}
