import type { DocumentsApiResponse } from "./client"

// Listing must stay lightweight: memory entries are extracted facts (short
// strings), never raw document content, so responses fit comfortably in
// client output limits even at the maximum page size.
const MAX_LIST_MEMORY_CHARS = 500

export function formatMemoriesList(response: DocumentsApiResponse): string {
	const { documents, pagination } = response
	const day = (s: string | null | undefined) => s?.slice(0, 10) ?? ""

	if (documents.length === 0) {
		return pagination.currentPage > 1
			? `No documents on page ${pagination.currentPage} (${pagination.totalPages} page${pagination.totalPages === 1 ? "" : "s"} total).`
			: "No memories stored yet."
	}

	let memoryCount = 0
	const blocks = documents.map((doc) => {
		const activeEntries = doc.memoryEntries.filter(
			(entry) => entry.isForgotten !== true && entry.isLatest !== false,
		)
		const title = doc.title?.trim() || "(untitled)"
		const header = `"${title}" (${doc.type}, ${day(doc.createdAt)})`

		if (activeEntries.length === 0) {
			return `${header} — no extracted memories yet`
		}

		memoryCount += activeEntries.length
		const lines = activeEntries.map((entry) => {
			const text = entry.memory.replace(/\s+/g, " ").trim()
			return `- ${
				text.length > MAX_LIST_MEMORY_CHARS
					? `${text.slice(0, MAX_LIST_MEMORY_CHARS)} … [truncated]`
					: text
			}`
		})
		return [header, ...lines].join("\n")
	})

	const header = `${memoryCount} memor${memoryCount === 1 ? "y" : "ies"} across ${documents.length} document${documents.length === 1 ? "" : "s"} (page ${pagination.currentPage} of ${pagination.totalPages}, ${pagination.totalItems} documents total), newest first.`

	const parts = [header, "", blocks.join("\n\n")]
	if (pagination.currentPage < pagination.totalPages) {
		parts.push(
			"",
			`More available — call listMemories with page: ${pagination.currentPage + 1}.`,
		)
	}
	return parts.join("\n")
}

export function formatMemories(
	response: { results?: Array<Record<string, unknown>>; total?: number },
	opts: {
		minSimilarity?: number
		maxRelations?: number
		maxDocuments?: number
		maxChunkLength?: number
		includeScores?: boolean
		includeLegend?: boolean
	} = {},
) {
	const {
		minSimilarity = 0,
		maxRelations = 4,
		maxDocuments = 3,
		maxChunkLength = Number.POSITIVE_INFINITY,
		includeScores = true,
		includeLegend = true,
	} = opts

	const day = (s: string | null | undefined) => s?.slice(0, 10) ?? ""
	const mime = (m: string | undefined) =>
		!m
			? ""
			: m === "application/pdf"
				? "pdf"
				: m.includes("spreadsheet")
					? "xlsx"
					: m.includes("presentation")
						? "pptx"
						: m.includes("document")
							? "doc"
							: (m.split("/").pop() ?? "")

	const temporal = (tc: Record<string, unknown> | undefined) => {
		if (!tc) return [] as string[]
		const ev = ((tc.eventDate as string[]) ?? []).map(day).filter(Boolean)
		return [
			tc.documentDate && `doc ${day(tc.documentDate as string)}`,
			ev.length === 1 && `event ${ev[0]}`,
			ev.length > 1 && `event ${ev[0]} → ${ev.at(-1)}`,
		].filter(Boolean) as string[]
	}

	const describeMeta = (m: Record<string, unknown> | undefined | null) => {
		if (!m) return ""
		const tags = [
			mime(m.mimeType as string | undefined),
			m.source as string | undefined,
			...temporal(m.temporalContext as Record<string, unknown> | undefined),
		].filter(Boolean)
		return [m.title && `"${m.title}"`, tags.length && `(${tags.join(", ")})`]
			.filter(Boolean)
			.join(" ")
	}

	const renderRelations = (
		rels: Array<Record<string, unknown>> | undefined,
		arrow: string,
		root: string,
	) => {
		if (!rels?.length) return [] as string[]
		const seen = new Set<string>()
		const items = rels.filter((r) => {
			const k = (r.memory as string).trim()
			if (k === root.trim() || seen.has(k)) return false
			seen.add(k)
			return true
		})
		const shown = items.slice(0, maxRelations)
		const lines = shown.map((r) => {
			const t = temporal(
				(r.metadata as Record<string, unknown> | undefined)?.temporalContext as
					| Record<string, unknown>
					| undefined,
			)
			const when = t.length ? t.join(", ") : day(r.updatedAt as string)
			return `  ${arrow} ${r.relation}${when ? `, ${when}` : ""}: ${r.memory}`
		})
		if (items.length > shown.length)
			lines.push(`  ${arrow} … +${items.length - shown.length} more`)
		return lines
	}

	const renderDocs = (ds: Array<Record<string, unknown>> | undefined) =>
		(ds ?? []).slice(0, maxDocuments).map((d) => {
			const title = d.title ? `"${d.title}"` : "(untitled)"
			const type = d.type ? ` (${d.type})` : ""
			const summary = d.summary ? ` — ${d.summary}` : ""
			return `  Document: ${title}${type}${summary}`
		})

	const results = (response.results ?? []).filter(
		(m) => ((m.similarity as number) ?? 0) >= minSimilarity,
	)
	if (!results.length) return "No relevant memories found."

	const total = response.total ?? results.length
	const header = [
		`${results.length} memor${results.length === 1 ? "y" : "ies"}` +
			(total !== results.length ? ` of ${total}` : "") +
			", ranked by relevance.",
		includeLegend &&
			"Markers: 'agg' = aggregated synthesis, 'chunk' = raw excerpt; ← parent, → child, ~ related.",
	]
		.filter(Boolean)
		.join(" ")

	const arrows = [
		["parents", "←"],
		["children", "→"],
		["related", "~"],
	] as const

	const blocks = results.map((m) => {
		const score = (m.similarity as number)?.toFixed(2) ?? "—"
		const prefix = includeScores ? `${score} ` : ""
		const memory = (m.memory as string) ?? ""

		if (m.isAggregated) return `${prefix}agg ${memory}`

		if (m.chunk != null && m.memory == null) {
			const body = (m.chunk as string).replace(/\s+$/, "")
			const text =
				body.length > maxChunkLength
					? `${body.slice(0, maxChunkLength)} … [truncated, ${body.length - maxChunkLength} more chars]`
					: body
			return [
				`${prefix}chunk ${describeMeta(m.metadata as Record<string, unknown> | null)}`.trimEnd(),
				...renderDocs(
					m.documents as Array<Record<string, unknown>> | undefined,
				),
				...text.split("\n").map((l: string) => `    ${l}`),
			].join("\n")
		}

		const meta = describeMeta(m.metadata as Record<string, unknown> | null)
		const ctx = (m.context ?? {}) as Record<
			string,
			Array<Record<string, unknown>>
		>
		return [
			`${prefix}${memory}`,
			meta
				? `  Source: ${meta}`
				: day(m.updatedAt as string)
					? `  Source: updated ${day(m.updatedAt as string)}`
					: null,
			...renderDocs(m.documents as Array<Record<string, unknown>> | undefined),
			...arrows.flatMap(([k, a]) => renderRelations(ctx[k], a, memory)),
		]
			.filter(Boolean)
			.join("\n")
	})

	return [header, "", blocks.join("\n\n")].join("\n")
}
