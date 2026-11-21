import { jsonResponse, profileBody } from "./v5-fetch"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createSupermemoryHooks } from "../src/voltagent"

type PrepareArgs = Parameters<
	NonNullable<ReturnType<typeof createSupermemoryHooks>["onPrepareMessages"]>
>[0]

describe("VoltAgent memory context", () => {
	afterEach(() => vi.unstubAllGlobals())

	it("appends memories to the user turn and leaves the system message untouched", async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse(profileBody(["Fresh profile fact"])),
		)
		vi.stubGlobal("fetch", fetchMock)
		const hooks = createSupermemoryHooks("user-a", {
			id: "conversation-a",
			apiKey: "sm_test_key",
			mode: "profile",
			addMemory: "never",
		})

		const system = {
			id: "system",
			role: "system",
			parts: [{ type: "text", text: "Be helpful." }],
		}
		const firstUser = {
			id: "u1",
			role: "user",
			parts: [{ type: "text", text: "Remember me" }],
		}
		const prepare = (messages: unknown[]) =>
			hooks.onPrepareMessages?.({
				agent: { name: "test-agent" },
				context: { conversationId: "conversation-a" },
				messages,
			} as unknown as PrepareArgs)

		const first = await prepare([system, firstUser])
		const second = await prepare([
			system,
			firstUser,
			{ id: "a1", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
			{ id: "u2", role: "user", parts: [{ type: "text", text: "Again" }] },
		])

		expect(first?.messages?.[0]).toEqual(system)
		const injected = JSON.stringify(first?.messages?.[1])
		expect(injected).toContain("Remember me")
		expect(injected).toContain("Fresh profile fact")
		expect(JSON.stringify(second?.messages?.slice(0, 2))).toBe(
			JSON.stringify(first?.messages),
		)
		expect(JSON.stringify(second?.messages?.[3])).not.toContain(
			"Fresh profile fact",
		)
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
