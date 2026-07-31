import { describe, expect, it } from "vitest"
import { AUTO_CHAT_SPACE_ID } from "./chat-auto-space"
import { readChatThreadSettings } from "./chat-thread-settings"

describe("chat thread settings", () => {
	it("restores Auto mode independently of the physical default space", () => {
		expect(
			readChatThreadSettings(
				{
					model: "gemini-2.5-pro",
					projectId: AUTO_CHAT_SPACE_ID,
					reasoningEffort: "thinking",
					spaceMode: "auto",
				},
				"sm_project_default",
			),
		).toEqual({
			model: "gemini-2.5-pro",
			projectId: AUTO_CHAT_SPACE_ID,
			reasoningEffort: "thinking",
			spaceMode: "auto",
		})
	})

	it("falls back safely for a legacy manual-space thread", () => {
		expect(readChatThreadSettings(undefined, "project_legacy")).toEqual({
			model: "grok-4.3",
			projectId: "project_legacy",
			reasoningEffort: "instant",
			spaceMode: "manual",
		})
	})
})
