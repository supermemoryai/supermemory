export type ParsedSourceAnnotations = {
	markdown: string
}

const RESPONSE_OPEN_PREFIX = "<response"
const RESPONSE_CLOSE_TAG = "</response>"
const RESPONSE_CLOSE_PREFIX = "</response"
const SOURCE_ATTR_PREFIX = 'source="'
const SAFE_SOURCE_ID_RE = /^[A-Za-z0-9_.:-]+$/

type ResponseClosingTag = {
	start: number
	end: number
	malformed: boolean
}

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

function parseClosingTagAt(
	text: string,
	index: number,
): ResponseClosingTag | null {
	if (!text.startsWith(RESPONSE_CLOSE_PREFIX, index)) return null

	const tagEnd = text.indexOf(">", index + RESPONSE_CLOSE_PREFIX.length)
	if (tagEnd === -1) return null

	const suffix = text.slice(index + RESPONSE_CLOSE_PREFIX.length, tagEnd)
	if (!/^[\s"']*$/.test(suffix)) return null

	return {
		start: index,
		end: tagEnd + 1,
		malformed: text.slice(index, tagEnd + 1) !== RESPONSE_CLOSE_TAG,
	}
}

function findClosingTag(
	text: string,
	index: number,
): ResponseClosingTag | null {
	let cursor = index
	while (cursor < text.length) {
		const candidate = text.indexOf(RESPONSE_CLOSE_PREFIX, cursor)
		if (candidate === -1) return null

		const closing = parseClosingTagAt(text, candidate)
		if (closing) return closing
		cursor = candidate + RESPONSE_CLOSE_PREFIX.length
	}

	return null
}

function consumeDuplicatedMalformedClose(
	text: string,
	closing: ResponseClosingTag,
	plainInner: string,
): number {
	if (!closing.malformed) return closing.end

	const trailingClose = findClosingTag(text, closing.end)
	if (!trailingClose || trailingClose.malformed) return closing.end

	const duplicate = text.slice(closing.end, trailingClose.start)
	if (
		duplicate.includes("<") ||
		duplicate.trim() !== plainInner.trim() ||
		plainInner.trim().length === 0
	) {
		return closing.end
	}

	return trailingClose.end
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
				const closing = findClosingTag(text, opening.end)
				if (!closing) {
					output.push(stripSourceMarkup(text.slice(opening.end)))
					break
				}

				const inner = text.slice(opening.end, closing.start)
				const hasNested =
					inner.includes(RESPONSE_OPEN_PREFIX) ||
					inner.includes(RESPONSE_CLOSE_PREFIX)
				const isAllowed = allowedSourceIds.has(opening.sourceId)

				if (hasNested) {
					const outerClosing = findClosingTag(text, closing.end)
					const fallbackEnd = outerClosing?.start ?? closing.start
					output.push(stripSourceMarkup(text.slice(opening.end, fallbackEnd)))
					i = outerClosing?.end ?? closing.end
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

				i = consumeDuplicatedMalformedClose(text, closing, plainInner)
				codeState.lineStart =
					output.length === 0 ||
					output[output.length - 1]?.endsWith("\n") === true
				continue
			}

			const nextClose = findClosingTag(text, i)
			if (nextClose) {
				const tagEnd = text.indexOf(">", i)
				if (tagEnd !== -1 && tagEnd < nextClose.start) {
					output.push(
						stripSourceMarkup(text.slice(tagEnd + 1, nextClose.start)),
					)
					i = nextClose.end
					continue
				}
			}
		}

		appendChar(text, i, output, codeState)
		i++
	}

	return { markdown: output.join("") }
}

export function stripSourceMarkup(text: string): string {
	let output = ""
	let i = 0

	while (i < text.length) {
		const closing = parseClosingTagAt(text, i)
		if (closing) {
			i = closing.end
			continue
		}

		if (text.startsWith(RESPONSE_OPEN_PREFIX, i)) {
			const opening = parseOpeningTag(text, i)
			if (opening && opening !== "incomplete") {
				const matchingClose = findClosingTag(text, opening.end)
				if (matchingClose) {
					const plainInner = stripSourceMarkup(
						text.slice(opening.end, matchingClose.start),
					)
					output += plainInner
					i = consumeDuplicatedMalformedClose(text, matchingClose, plainInner)
					continue
				}
			}

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
