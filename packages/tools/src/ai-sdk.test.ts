import { describe, expect, it } from "vitest"
import { documentListTool, searchMemoriesTool } from "./ai-sdk"

type ToolWithInputSchema<T> = {
	inputSchema: {
		parse(input: unknown): T
	}
}

describe("ai-sdk tools", () => {
	it("coerces string numeric tool inputs", () => {
		const searchTool = searchMemoriesTool("test-key", {
			projectId: "test-project-123",
		}) as unknown as ToolWithInputSchema<{
			informationToGet: string
			limit: number
		}>
		const listTool = documentListTool("test-key", {
			projectId: "test-project-123",
		}) as unknown as ToolWithInputSchema<{ limit: number; offset: number }>

		expect(
			searchTool.inputSchema.parse({
				informationToGet: "coffee preferences",
				limit: "7",
			}).limit,
		).toBe(7)
		expect(
			listTool.inputSchema.parse({
				limit: "12",
				offset: "3",
			}),
		).toMatchObject({
			limit: 12,
			offset: 3,
		})
	})
})
