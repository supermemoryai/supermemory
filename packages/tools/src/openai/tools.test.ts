import type OpenAI from "openai"
import { describe, expect, it } from "vitest"
import { createToolCallExecutor, createToolCallsExecutor } from "./tools"

function toolCall(
	name: string,
	args: string,
	id: string,
): OpenAI.Chat.Completions.ChatCompletionMessageToolCall {
	return {
		id,
		type: "function",
		function: { name, arguments: args },
	}
}

describe("OpenAI tool call execution", () => {
	it("returns a structured error for malformed JSON arguments", async () => {
		const execute = createToolCallExecutor("test-api-key")

		const result = JSON.parse(
			await execute(toolCall("searchMemories", '{"informationToGet":', "bad")),
		)

		expect(result).toEqual({
			success: false,
			error: "Invalid JSON arguments for searchMemories",
		})
	})

	it("keeps malformed calls from rejecting an entire batch", async () => {
		const execute = createToolCallsExecutor("test-api-key")

		const results = await execute([
			toolCall("searchMemories", "{broken", "bad"),
			toolCall("unknownTool", "{}", "unknown"),
		])

		expect(results).toEqual([
			{
				tool_call_id: "bad",
				role: "tool",
				content: JSON.stringify({
					success: false,
					error: "Invalid JSON arguments for searchMemories",
				}),
			},
			{
				tool_call_id: "unknown",
				role: "tool",
				content: JSON.stringify({
					success: false,
					error: "Unknown function: unknownTool",
				}),
			},
		])
	})
})
