import { describe, expect, it } from "vitest"
import {
	extractMessageText,
	getLastUserMessage,
	getConversationContent,
} from "./openai/middleware"

describe("OpenAI middleware message extraction", () => {
	it("extracts text from simple string content", () => {
		const messages = [
			{ role: "system" as const, content: "System prompt" },
			{ role: "user" as const, content: "Hello world" },
		]
		expect(getLastUserMessage(messages)).toBe("Hello world")
	})

	it("extracts text from multi-part array content", () => {
		const messages = [
			{
				role: "user" as const,
				content: [
					{ type: "text" as const, text: "What is my favorite language?" },
					{
						type: "image_url" as const,
						image_url: { url: "https://example.com/image.png" },
					},
				],
			},
		]
		expect(getLastUserMessage(messages)).toBe("What is my favorite language?")
	})

	it("extracts and joins multiple text parts within array content", () => {
		const messages = [
			{
				role: "user" as const,
				content: [
					{ type: "text" as const, text: "Part 1" },
					{ type: "text" as const, text: "Part 2" },
				],
			},
		]
		expect(getLastUserMessage(messages)).toBe("Part 1 Part 2")
	})

	it("returns empty string when no user message exists", () => {
		const messages = [
			{ role: "system" as const, content: "System prompt" },
			{ role: "assistant" as const, content: "Hello" },
		]
		expect(getLastUserMessage(messages)).toBe("")
	})

	it("formats conversation content with multi-part array messages", () => {
		const messages = [
			{
				role: "user" as const,
				content: [
					{ type: "text" as const, text: "Hello" },
					{
						type: "image_url" as const,
						image_url: { url: "https://example.com/image.png" },
					},
				],
			},
			{ role: "assistant" as const, content: "Hi there!" },
		]
		const formatted = getConversationContent(messages)
		expect(formatted).toBe("User: Hello\n\nAssistant: Hi there!")
	})

	it("extractMessageText handles string, array, and invalid inputs gracefully", () => {
		expect(extractMessageText("plain text")).toBe("plain text")
		expect(extractMessageText([{ type: "text", text: "extracted text" }])).toBe(
			"extracted text",
		)
		expect(extractMessageText([{ type: "other_type" }])).toBe("")
		expect(extractMessageText(null)).toBe("")
		expect(extractMessageText(undefined)).toBe("")
	})
})
