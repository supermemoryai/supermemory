export type NovaResearchStatus =
	| "queued"
	| "running"
	| "awaiting_input"
	| "completed"
	| "failed"
	| "cancelled"

export type NovaResearchFailure = {
	code: string
	stage: string
	retryable: boolean
	incidentId?: string | null
	/** A user-safe explanation supplied by the API. Legacy `run.error` is never rendered. */
	message?: string | null
}

export type NovaResearchConnectionState = {
	status: "connected" | "reconnecting"
	attempts: number
}

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
	failure?: NovaResearchFailure | null
	/** @deprecated Legacy internal error detail. Keep for response compatibility only. */
	error: string | null
	toolCallCount: number
	startedAt: string | null
	completedAt: string | null
	createdAt: string
	updatedAt: string
	events: NovaResearchEvent[]
}

export type NovaResearchPlanStepDisplayStatus =
	| NovaResearchPlan["steps"][number]["status"]
	| "failed"
	| "cancelled"

const SAFE_RESEARCH_TOOL_FAILURE_MESSAGES = new Set([
	"Web search could not be completed.",
	"The webpage could not be read.",
	"Memory retrieval could not be completed.",
	"This research step could not be completed.",
])

function safeResearchIncidentId(
	failure?: NovaResearchFailure | null,
): string | null {
	const incidentId = failure?.incidentId?.trim()
	return incidentId && /^[A-Za-z0-9_-]{1,64}$/.test(incidentId)
		? incidentId
		: null
}

export function researchToolFailureDescription(
	event: NovaResearchEvent,
): string | null {
	if (event.type !== "tool" || event.status !== "failed") return null
	const output =
		event.output && typeof event.output === "object"
			? (event.output as { error?: unknown })
			: null
	const message = typeof output?.error === "string" ? output.error.trim() : ""
	return SAFE_RESEARCH_TOOL_FAILURE_MESSAGES.has(message)
		? message
		: "This research tool could not be completed."
}

export function researchFailurePresentation(run: NovaResearchRun): {
	title: string
	description: string
	incidentId: string | null
	canRetryFinalization: boolean
	retryLabel: string | null
} {
	const failure = run.failure
	const incidentId = safeResearchIncidentId(failure)
	const retryable = failure?.retryable === true

	switch (failure?.code?.trim().toUpperCase()) {
		case "START_FAILED":
			return {
				title: "Research could not start",
				description: "Research could not be started. Please try again.",
				incidentId,
				canRetryFinalization: false,
				retryLabel: null,
			}
		case "RESEARCH_FAILED":
			return {
				title: "A research step failed",
				description:
					"Research stopped before the evidence review finished. You can run it again.",
				incidentId,
				canRetryFinalization: false,
				retryLabel: null,
			}
		case "FINALIZATION_FAILED":
			return {
				title: "Report finalization failed",
				description:
					"The evidence was collected, but Nova could not finish a properly cited report. Your collected sources are preserved.",
				incidentId,
				canRetryFinalization: retryable,
				retryLabel: retryable ? "Retry finalizing" : null,
			}
		case "PERSISTENCE_FAILED":
			return {
				title: "Saving the report failed",
				description:
					"The report was prepared but could not be saved. Your collected sources are preserved.",
				incidentId,
				canRetryFinalization: retryable,
				retryLabel: retryable ? "Retry saving" : null,
			}
		default:
			return {
				title: "Research could not complete",
				description:
					"Nova stopped safely before producing a report. You can run the research again.",
				incidentId,
				canRetryFinalization: false,
				retryLabel: null,
			}
	}
}

export function researchPlanStepDisplayStatus(
	runStatus: NovaResearchStatus,
	stepStatus: NovaResearchPlan["steps"][number]["status"],
): NovaResearchPlanStepDisplayStatus {
	if (stepStatus === "complete" || stepStatus === "skipped") return stepStatus
	if (runStatus === "failed") {
		return stepStatus === "in_progress" ? "failed" : "skipped"
	}
	if (runStatus === "cancelled") return "cancelled"
	if (runStatus === "completed") return "skipped"
	return stepStatus
}

const RESEARCH_POLL_RETRY_DELAYS_MS = [1500, 2500, 4000, 7000, 12000, 15000]

export function researchPollDelayMs(
	consecutiveFailures: number,
	runStatus?: NovaResearchStatus,
): number {
	if (!Number.isFinite(consecutiveFailures) || consecutiveFailures <= 0) {
		if (runStatus === "awaiting_input") return 30_000
		return RESEARCH_POLL_RETRY_DELAYS_MS[0] ?? 1500
	}
	const index = Math.min(
		Math.floor(consecutiveFailures),
		RESEARCH_POLL_RETRY_DELAYS_MS.length - 1,
	)
	return RESEARCH_POLL_RETRY_DELAYS_MS[index] ?? 15000
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
	if (run.status !== "awaiting_input") return null
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
