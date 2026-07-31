export type NovaResearchStatus =
	| "queued"
	| "running"
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

export type NovaResearchEvent = {
	id: string
	sequence: number
	type:
		| "status"
		| "assistant"
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

export function isActiveResearchRun(run: NovaResearchRun | null): boolean {
	return run?.status === "queued" || run?.status === "running"
}
