export type ParsedSourceAnnotations = {
	markdown: string
}

const RESPONSE_OPEN_PREFIX = "<response"
const RESPONSE_CLOSE_TAG = "</response>"
const SOURCE_ATTR_PREFIX = 'source="'
const SAFE_SOURCE_ID_RE = /^[A-Za-z0-9_.:-]+$/

export function isSafeSourceId(id: string): boolean {
	return id.length > 0 && SAFE_SOURCE_ID_RE.test(id)
}

function escapeMarkdownLinkText(text: string): string {
	return text.replace(/([\\[\]])/g, "\\$1").replace(/\n/g, " ")
}

function parseOpeningTag(
	text: string,
	index: number,
): { end: number; sourceId: string } | null | "incomplete" {
	if (!text.startsWith(RESPONSE_OPEN_PREFIX, index)) return null

	const tagEnd = text.indexOf(">", index + RESPONSE_OPEN_PREFIX.length)
	if (tagEnd === -1) return "incomplete"

	const rawTag = text.slice(index, tagEnd + 1)
	const inside = rawTag.slice(1, -1).trim()
	if (!inside.startsWith("response")) return null

	let cursor = "response".length
	while (
		inside[cursor] === " " ||
		inside[cursor] === "\t" ||
		inside[cursor] === "\n" ||
		inside[cursor] === "\r"
	)
		cursor++
	if (!inside.startsWith(SOURCE_ATTR_PREFIX, cursor)) return null
	cursor += SOURCE_ATTR_PREFIX.length

	const sourceEnd = inside.indexOf('"', cursor)
	if (sourceEnd === -1) return null
	const sourceId = inside.slice(cursor, sourceEnd)
	cursor = sourceEnd + 1
	while (
		inside[cursor] === " " ||
		inside[cursor] === "\t" ||
		inside[cursor] === "\n" ||
		inside[cursor] === "\r"
	)
		cursor++
	if (cursor !== inside.length) return null
	if (!isSafeSourceId(sourceId)) return null

	return { end: tagEnd + 1, sourceId }
}

function advanceCodeState(
	text: string,
	index: number,
	state: { inFence: boolean; inInlineCode: boolean; lineStart: boolean },
): boolean {
	if (state.lineStart && text.startsWith("```", index)) {
		state.inFence = !state.inFence
		return true
	}

	if (!state.inFence && text[index] === "`") {
		state.inInlineCode = !state.inInlineCode
		return true
	}

	return false
}

function appendChar(
	text: string,
	index: number,
	output: string[],
	state: { lineStart: boolean },
) {
	const ch = text[index] ?? ""
	output.push(ch)
	state.lineStart = ch === "\n"
}

export function parseSourceAnnotatedMarkdown(
	text: string,
	allowedSourceIds: ReadonlySet<string>,
): ParsedSourceAnnotations {
	const output: string[] = []
	const codeState = { inFence: false, inInlineCode: false, lineStart: true }

	let i = 0
	while (i < text.length) {
		if (advanceCodeState(text, i, codeState)) {
			appendChar(text, i, output, codeState)
			i++
			continue
		}

		if (
			!codeState.inFence &&
			!codeState.inInlineCode &&
			text.startsWith(RESPONSE_OPEN_PREFIX, i)
		) {
			const opening = parseOpeningTag(text, i)
			if (opening === "incomplete") {
				break
			}

			if (opening) {
				const closeIndex = text.indexOf(RESPONSE_CLOSE_TAG, opening.end)
				if (closeIndex === -1) {
					output.push(stripSourceMarkup(text.slice(opening.end)))
					break
				}

				const inner = text.slice(opening.end, closeIndex)
				const hasNested =
					inner.includes(RESPONSE_OPEN_PREFIX) ||
					inner.includes(RESPONSE_CLOSE_TAG)
				const isAllowed = allowedSourceIds.has(opening.sourceId)

				if (hasNested) {
					const outerCloseIndex = text.indexOf(
						RESPONSE_CLOSE_TAG,
						closeIndex + RESPONSE_CLOSE_TAG.length,
					)
					const fallbackEnd =
						outerCloseIndex === -1 ? closeIndex : outerCloseIndex
					output.push(stripSourceMarkup(text.slice(opening.end, fallbackEnd)))
					i = fallbackEnd + RESPONSE_CLOSE_TAG.length
					continue
				}

				const plainInner = stripSourceMarkup(inner)
				if (isAllowed && plainInner.trim().length > 0) {
					output.push(
						`[${escapeMarkdownLinkText(plainInner)}](#sm-source:${encodeURIComponent(opening.sourceId)})`,
					)
				} else {
					output.push(plainInner)
				}

				i = closeIndex + RESPONSE_CLOSE_TAG.length
				codeState.lineStart =
					output.length === 0 ||
					output[output.length - 1]?.endsWith("\n") === true
				continue
			}

			const nextClose = text.indexOf(RESPONSE_CLOSE_TAG, i)
			if (nextClose !== -1) {
				const tagEnd = text.indexOf(">", i)
				if (tagEnd !== -1 && tagEnd < nextClose) {
					output.push(stripSourceMarkup(text.slice(tagEnd + 1, nextClose)))
					i = nextClose + RESPONSE_CLOSE_TAG.length
					continue
				}
			}
		}

		appendChar(text, i, output, codeState)
		i++
	}

	return { markdown: output.join("") }
}

export type SourceAnnotationMessagePart = {
	type: string
	text?: string | undefined
}

export function sourceAnnotatedTextRun(
	parts: readonly SourceAnnotationMessagePart[],
	partIndex: number,
): string | null {
	const part = parts[partIndex]
	if (part?.type !== "text") return null

	let prev = partIndex - 1
	while (prev >= 0 && parts[prev]?.type === "source-url") prev--
	if (prev >= 0 && parts[prev]?.type === "text") return null

	let runText = ""
	for (let index = partIndex; index < parts.length; index++) {
		const current = parts[index]
		if (current?.type === "text") runText += current.text ?? ""
		else if (current?.type === "source-url") continue
		else break
	}

	return runText
}

export function hasRenderableSourceAnnotations(
	parts: readonly SourceAnnotationMessagePart[],
	allowedSourceIds: ReadonlySet<string>,
): boolean {
	return parts.some((part, index) => {
		if (part.type !== "text") return false
		const runText = sourceAnnotatedTextRun(parts, index)
		if (!runText) return false
		return parseSourceAnnotatedMarkdown(
			runText,
			allowedSourceIds,
		).markdown.includes("#sm-source:")
	})
}

export function stripSourceMarkup(text: string): string {
	let output = ""
	let i = 0

	while (i < text.length) {
		if (text.startsWith(RESPONSE_CLOSE_TAG, i)) {
			i += RESPONSE_CLOSE_TAG.length
			continue
		}

		if (text.startsWith(RESPONSE_OPEN_PREFIX, i)) {
			const tagEnd = text.indexOf(">", i + RESPONSE_OPEN_PREFIX.length)
			if (tagEnd === -1) break
			i = tagEnd + 1
			continue
		}

		output += text[i]
		i++
	}

	return output
}
