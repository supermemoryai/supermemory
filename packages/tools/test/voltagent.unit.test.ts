import { jsonResponse, profileBody } from "./v5-fetch"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createSupermemoryHooks } from "../src/voltagent"

type PrepareArgs = Parameters<
	NonNullable<ReturnType<typeof createSupermemoryHooks>["onPrepareMessages"]>
>[0]

describe("VoltAgent memory context", () => {
	afterEach(() => vi.unstubAllGlobals())

	it("appends the profile to the system message and leaves the user turns untouched", async () => {
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

		const systemParts = (first?.messages?.[0] as typeof system).parts
		expect(systemParts[0]).toEqual({ type: "text", text: "Be helpful." })
		expect(JSON.stringify(systemParts.slice(1))).toContain("Fresh profile fact")
		expect(first?.messages?.[1]).toEqual(firstUser)
		expect(JSON.stringify(second?.messages?.slice(0, 2))).toBe(
			JSON.stringify(first?.messages),
		)
		expect(JSON.stringify(second?.messages?.slice(1))).not.toContain(
			"Fresh profile fact",
		)
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
