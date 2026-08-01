import { describe, expect, it } from "bun:test"
import {
	isActiveResearchRun,
	normalizeResearchMarkdownForDisplay,
	pendingResearchClarification,
	type NovaResearchRun,
} from "./nova-research"

function run(overrides: Partial<NovaResearchRun> = {}): NovaResearchRun {
	return {
		id: "run-1",
		threadId: "thread-1",
		userMessageId: "user-1",
		assistantMessageId: "assistant-1",
		workflowInstanceId: "workflow-1",
		query: "Find a university",
		model: "gpt-5.1",
		reasoningEffort: "thinking",
		spaceMode: "auto",
		projectId: "sm_project_default",
		status: "awaiting_input",
		plan: null,
		sources: [],
		reportTitle: null,
		reportMarkdown: null,
		reportDocumentId: null,
		error: null,
		toolCallCount: 0,
		startedAt: null,
		completedAt: null,
		createdAt: new Date(0).toISOString(),
		updatedAt: new Date(0).toISOString(),
		events: [],
		...overrides,
	}
}

describe("research clarification state", () => {
	it("keeps an awaiting-input run active", () => {
		expect(isActiveResearchRun(run())).toBe(true)
	})

	it("restores the latest pending clarification from persisted events", () => {
		const request = {
			id: "clarification-1",
			intro: "Help me narrow this down.",
			questions: [
				{
					id: "intake",
					question: "Which intake?",
					options: [{ label: "2026" }, { label: "2027" }],
				},
			],
		}
		const current = run({
			events: [
				{
					id: "event-1",
					sequence: 1,
					type: "clarification",
					status: "pending",
					title: "A few details first",
					message: request.intro,
					toolName: "request_clarification",
					input: request,
					output: null,
					createdAt: new Date(0).toISOString(),
				},
			],
		})

		expect(pendingResearchClarification(current)).toEqual(request)
	})
})

describe("research report display", () => {
	it("keeps citations inline and removes the appended source list", () => {
		const markdown = [
			"Evidence.[^one]",
			"",
			"## Sources",
			"",
			"[^one]: [Source](https://example.com/evidence)",
		].join("\n")

		expect(normalizeResearchMarkdownForDisplay(markdown)).toBe(
			"Evidence.[1](https://example.com/evidence)",
		)
	})
})
