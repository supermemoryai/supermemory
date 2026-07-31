import { describe, expect, it, vi } from "vitest"
import { handoffToModel } from "./modelHandoff"

function createApp(overrides?: {
	updateModelContext?: () => Promise<unknown>
	sendMessage?: () => Promise<{ isError?: boolean }>
}) {
	return {
		updateModelContext:
			overrides?.updateModelContext ?? vi.fn(async () => ({})),
		sendMessage: overrides?.sendMessage ?? vi.fn(async () => ({})),
	}
}

const request = {
	context: "Detailed state",
	message: "Continue from the widget action",
	structuredContent: { action: "saved" },
}

describe("handoffToModel", () => {
	it("updates context before sending the portable conversation message", async () => {
		const order: string[] = []
		const app = createApp({
			updateModelContext: vi.fn(async () => {
				order.push("context")
			}),
			sendMessage: vi.fn(async () => {
				order.push("message")
				return {}
			}),
		})

		const result = await handoffToModel(app, request, undefined)

		expect(order).toEqual(["context", "message"])
		expect(result).toEqual({
			ok: true,
			contextUpdate: { ok: true },
			conversationMessage: { ok: true },
		})
		expect(app.updateModelContext).toHaveBeenCalledWith({
			content: [{ type: "text", text: request.context }],
			structuredContent: request.structuredContent,
		})
	})

	it("prefers ChatGPT's follow-up helper when available", async () => {
		const app = createApp()
		const sendFollowUpMessage = vi.fn(async () => undefined)

		const result = await handoffToModel(app, request, {
			sendFollowUpMessage,
		})

		expect(result.conversationMessage).toEqual({ ok: true })
		expect(sendFollowUpMessage).toHaveBeenCalledWith({
			prompt: request.message,
			scrollToBottom: true,
		})
		expect(app.sendMessage).not.toHaveBeenCalled()
	})

	it("falls back to the portable message when ChatGPT's helper fails", async () => {
		const app = createApp()

		const result = await handoffToModel(app, request, {
			sendFollowUpMessage: vi.fn(async () => {
				throw new Error("unavailable")
			}),
		})

		expect(result.conversationMessage).toEqual({ ok: true })
		expect(app.sendMessage).toHaveBeenCalledOnce()
	})

	it("still sends the conversation message when context publication fails", async () => {
		const app = createApp({
			updateModelContext: vi.fn(async () => {
				throw new Error("unsupported")
			}),
		})

		const result = await handoffToModel(app, request, undefined)

		expect(result.ok).toBe(true)
		expect(result.contextUpdate).toMatchObject({
			ok: false,
			error: "Error: unsupported",
		})
		expect(app.sendMessage).toHaveBeenCalledOnce()
	})

	it("reports a rejected conversation message as the failed handoff", async () => {
		const app = createApp({
			sendMessage: vi.fn(async () => ({ isError: true })),
		})

		const result = await handoffToModel(app, request, undefined)

		expect(result.ok).toBe(false)
		expect(result.conversationMessage).toEqual({
			ok: false,
			error: "Host rejected the MCP Apps message",
		})
	})
})
