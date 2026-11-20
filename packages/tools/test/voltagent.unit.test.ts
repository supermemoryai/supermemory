import { jsonResponse, profileBody } from "./v5-fetch"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createSupermemoryHooks } from "../src/voltagent"
import {
	createSupermemoryContext,
	enhanceMessagesWithMemories,
} from "../src/voltagent/middleware"
import type { VoltAgentMessage } from "../src/voltagent/types"

describe("VoltAgent memory context", () => {
	afterEach(() => vi.unstubAllGlobals())

	it("replaces prior SDK context in the prepared system message", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse(profileBody(["Fresh profile fact"]))),
		)
		const hooks = createSupermemoryHooks("user-a", {
			id: "conversation-a",
			apiKey: "sm_test_key",
			mode: "profile",
			addMemory: "never",
		})

		const args = {
			agent: { name: "test-agent" },
			context: {
				input: { messages: [{ role: "user", content: "Remember me" }] },
			},
			messages: [
				{
					id: "system",
					role: "system",
					content:
						'Be helpful.\n\n<supermemory context="user-memories" readonly>\nStale profile fact\n</supermemory>',
					parts: [],
				},
			],
		} as Parameters<NonNullable<typeof hooks.onPrepareMessages>>[0]
		const result = await hooks.onPrepareMessages?.(args)

		const content = String(result?.messages?.[0]?.content ?? "")
		expect(content).toContain("Be helpful.")
		expect(content).toContain("Fresh profile fact")
		expect(content).not.toContain("Stale profile fact")
		expect(
			content.match(/<supermemory context="user-memories" readonly>/g),
		).toHaveLength(1)
	})

	it("reuses an empty cached result on continuation steps (no new fetch)", async () => {
		// A new user has nothing in their profile, so the turn caches ""
		const fetchMock = vi.fn(async () => jsonResponse(profileBody()))
		vi.stubGlobal("fetch", fetchMock)
		const ctx = createSupermemoryContext("user-a", {
			id: "conversation-a",
			apiKey: "sm_test_key",
			mode: "profile",
			addMemory: "never",
		})

		const userMessage: VoltAgentMessage = { role: "user", content: "Hello" }
		await enhanceMessagesWithMemories([userMessage], ctx)
		expect(fetchMock).toHaveBeenCalledTimes(1)

		// Same turn, continuing after an assistant step
		const continuation: VoltAgentMessage[] = [
			userMessage,
			{ role: "assistant", content: "Looking that up" },
		]
		await enhanceMessagesWithMemories(continuation, ctx)
		await enhanceMessagesWithMemories(continuation, ctx)

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
