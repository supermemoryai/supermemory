type TitleSource = {
	title?: string | null
	content?: string | null
	metadata?: Record<string, unknown> | null
}

const MAX_TITLE_CHARS = 120
const FRONTMATTER = /^\ufeff?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
const FRONTMATTER_TITLE = /^title[ \t]*:[ \t]*(.+)$/m
const ATX_HEADING = /^#{1,6}\s+(.*?)\s*#*$/
const SETEXT_UNDERLINE = /^(?:=+|-{2,})$/
const HORIZONTAL_RULE = /^(?:-{3,}|\*{3,}|_{3,})$/
const BLOCK_MARKER = /^(?:[-*+]\s|>\s?|\d+[.)]\s|\|)/
const BARE_URL = /^(?:https?:\/\/|www\.)\S+$/i
const WORD = /[\p{L}\p{N}]/u
const WRAPPERS = ["***", "**", "__", "*", "_", "`"]

function collapse(value: string): string {
	return value.replace(/\s+/g, " ").trim()
}

function clamp(value: string): string | null {
	if (!value) return null
	return value.length <= MAX_TITLE_CHARS
		? value
		: `${value.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`
}

function unwrap(value: string): string {
	let text = value.trim()
	for (const marker of WRAPPERS) {
		while (
			text.length > marker.length * 2 &&
			text.startsWith(marker) &&
			text.endsWith(marker)
		) {
			text = text.slice(marker.length, -marker.length).trim()
		}
	}
	const quote = text[0]
	if (
		text.length >= 2 &&
		(quote === '"' || quote === "'") &&
		text.endsWith(quote)
	) {
		text = text.slice(1, -1).trim()
	}
	return text
}

function fromContent(content: string): string | null {
	const frontmatter = FRONTMATTER.exec(content)
	const declared = frontmatter?.[1]
		? FRONTMATTER_TITLE.exec(frontmatter[1])?.[1]
		: undefined
	if (declared) {
		const title = clamp(collapse(unwrap(declared)))
		if (title) return title
	}

	const body = frontmatter ? content.slice(frontmatter[0].length) : content
	const lines = body.split(/\r?\n/)
	const start = lines.findIndex((line) => line.trim().length > 0)
	if (start === -1) return null

	const first = (lines[start] ?? "").trim()
	if (
		first.startsWith("```") ||
		first.startsWith("~~~") ||
		BARE_URL.test(first) ||
		HORIZONTAL_RULE.test(first)
	) {
		return null
	}

	const heading = ATX_HEADING.exec(first)
	if (heading) return clamp(collapse(unwrap(heading[1] ?? "")))
	if (BLOCK_MARKER.test(first)) return null

	const candidate = collapse(unwrap(first))
	if (!WORD.test(candidate)) return null
	const underlined = SETEXT_UNDERLINE.test(lines[start + 1]?.trim() ?? "")
	if (!underlined && candidate.length > MAX_TITLE_CHARS) return null
	return clamp(candidate)
}

export function resolveDocumentTitle(
	document: TitleSource | null | undefined,
): string | null {
	if (!document) return null

	const metadata = document.metadata
	const pinned =
		metadata && typeof metadata === "object" ? metadata.title : undefined

	for (const candidate of [pinned, document.title]) {
		if (typeof candidate === "string") {
			const title = clamp(collapse(candidate))
			if (title) return title
		}
	}

	return typeof document.content === "string"
		? fromContent(document.content)
		: null
}
