export type NovaResearchStatus =
	| "queued"
	| "running"
	| "awaiting_input"
	| "completed"
	| "failed"
	| "cancelled"

export type NovaResearchPlan = {
	goal: string
	steps: Array<{
		id: string
		title: string
		status: "pending" | "in_progress" | "complete" | "skipped"
	}>
}

export type NovaResearchSource = {
	id: string
	type: "memory" | "web"
	title?: string
	url?: string
	sourceId?: string
	documentId?: string
	space?: string
}

const FOOTNOTE_REFERENCE_RE = /\[\^([A-Za-z0-9_-]+)\](?!:)/g
const MARKDOWN_LINK_RE = /\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g
const AUTOLINK_RE = /<(https?:\/\/[^\s>]+)>/g
const REFERENCE_SECTION_RE =
	/(?:^|\n)(?:---\s*\n)?#{1,6}\s+(?:sources|references|footnotes)\s*\n[\s\S]*$/i

function markdownUrls(markdown: string): string[] {
	return [
		...markdown.matchAll(MARKDOWN_LINK_RE),
		...markdown.matchAll(AUTOLINK_RE),
	]
		.map((match) => match[1])
		.filter((url): url is string => Boolean(url))
}

export function normalizeResearchMarkdownForDisplay(markdown: string): string {
	const definitions = new Map<string, string>()
	const bodyLines: string[] = []
	const lines = markdown.replace(/\r\n?/g, "\n").split("\n")

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index] ?? ""
		const match = line.match(/^\[\^([A-Za-z0-9_-]+)\]:\s*(.*)$/)
		if (!match?.[1]) {
			bodyLines.push(line)
			continue
		}

		const parts = [match[2] ?? ""]
		while (/^(?:\t| {2,})\S/.test(lines[index + 1] ?? "")) {
			index++
			parts.push((lines[index] ?? "").trim())
		}
		definitions.set(match[1], parts.join(" ").trim())
	}

	const citationNumberByUrl = new Map<string, number>()
	let nextCitationNumber = 1
	const withInlineCitations = bodyLines
		.join("\n")
		.replace(FOOTNOTE_REFERENCE_RE, (reference, footnoteId: string) => {
			const definition = definitions.get(footnoteId)
			if (!definition) return reference
			const urls = [...new Set(markdownUrls(definition))]
			if (urls.length === 0) return reference
			return urls
				.map((url) => {
					let number = citationNumberByUrl.get(url)
					if (!number) {
						number = nextCitationNumber++
						citationNumberByUrl.set(url, number)
					}
					return `[${number}](${url})`
				})
				.join(" ")
		})

	return withInlineCitations
		.replace(REFERENCE_SECTION_RE, "")
		.replace(/(?:^|\n)---\s*$/, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

export function formatResearchDuration(durationMs?: number): string | null {
	if (
		typeof durationMs !== "number" ||
		!Number.isFinite(durationMs) ||
		durationMs < 0
	) {
		return null
	}

	const totalSeconds = Math.max(1, Math.round(durationMs / 1000))
	if (totalSeconds < 60) return `${totalSeconds}s`

	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
}

export type NovaResearchEvent = {
	id: string
	sequence: number
	type:
		| "status"
		| "assistant"
		| "clarification"
		| "plan"
		| "tool"
		| "source"
		| "artifact"
		| "error"
	status: string | null
	title: string | null
	message: string | null
	toolName: string | null
	input: unknown
	output: unknown
	createdAt: string
}

export type NovaResearchRun = {
	id: string
	threadId: string
	userMessageId: string
	assistantMessageId: string
	workflowInstanceId: string | null
	query: string
	model: string
	reasoningEffort: "instant" | "thinking"
	spaceMode: "auto" | "manual"
	projectId: string
	status: NovaResearchStatus
	plan: NovaResearchPlan | null
	sources: NovaResearchSource[]
	reportTitle: string | null
	reportMarkdown: string | null
	reportDocumentId: string | null
	error: string | null
	toolCallCount: number
	startedAt: string | null
	completedAt: string | null
	createdAt: string
	updatedAt: string
	events: NovaResearchEvent[]
}

export type NovaResearchClarificationQuestion = {
	id: string
	question: string
	options: Array<{ label: string; description?: string }>
	allowOther?: boolean
}

export type NovaResearchClarificationRequest = {
	id: string
	intro?: string
	questions: NovaResearchClarificationQuestion[]
}

export type NovaResearchClarificationAnswer = {
	questionId: string
	value: string
}

function isClarificationRequest(
	value: unknown,
): value is NovaResearchClarificationRequest {
	if (!value || typeof value !== "object") return false
	const request = value as Partial<NovaResearchClarificationRequest>
	return (
		typeof request.id === "string" &&
		Array.isArray(request.questions) &&
		request.questions.length > 0 &&
		request.questions.every(
			(question) =>
				question &&
				typeof question.id === "string" &&
				typeof question.question === "string" &&
				Array.isArray(question.options) &&
				question.options.length >= 2 &&
				question.options.every(
					(option) => option && typeof option.label === "string",
				),
		)
	)
}

export function pendingResearchClarification(
	run: NovaResearchRun,
): NovaResearchClarificationRequest | null {
	for (let index = run.events.length - 1; index >= 0; index--) {
		const event = run.events[index]
		if (
			event?.type === "clarification" &&
			event.status === "pending" &&
			isClarificationRequest(event.input)
		) {
			return event.input
		}
	}
	return null
}

export function isActiveResearchRun(run: NovaResearchRun | null): boolean {
	return (
		run?.status === "queued" ||
		run?.status === "running" ||
		run?.status === "awaiting_input"
	)
}
