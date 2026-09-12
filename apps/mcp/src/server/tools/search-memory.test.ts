import { describe, expect, it, vi } from "vitest"
import * as searchMemory from "./search-memory"
import type { ToolDeps } from "./types"

function registerSearch(client: {
	search: (query: string) => Promise<{
		results: Array<{
			id: string
			memory?: string
			chunk?: string
			similarity: number
			title?: string
		}>
		total: number
		timing: number
	}>
	getProfile?: () => Promise<unknown>
}) {
	let handler:
		| ((args: { query: string; containerTag?: string }) => Promise<unknown>)
		| undefined

	searchMemory.register({
		server: {
			registerTool: (
				_name: string,
				_config: unknown,
				registered: (args: {
					query: string
					containerTag?: string
				}) => Promise<unknown>,
			) => {
				handler = registered
			},
		},
		resolveContainerTag: async (tag?: string) => tag ?? "sm_project_default",
		getClient: () => client,
		errorResult: (error: unknown) => ({
			content: [
				{
					type: "text" as const,
					text: error instanceof Error ? error.message : "error",
				},
			],
			isError: true,
		}),
	} as unknown as ToolDeps)

	if (!handler) throw new Error("search_memory was not registered")
	return handler
}

describe("search_memory", () => {
	it("returns matching memories without fetching or including profile", async () => {
		const getProfile = vi.fn()
		const handler = registerSearch({
			getProfile,
			search: async () => ({
				results: [
					{
						id: "mem_1",
						memory: "User prefers dark mode",
						similarity: 0.91,
					},
				],
				total: 1,
				timing: 12,
			}),
		})

		const result = (await handler({ query: "theme preference" })) as {
			content: Array<{ text: string }>
			structuredContent: {
				profile?: unknown
				results: Array<{ text: string }>
			}
		}

		expect(getProfile).not.toHaveBeenCalled()
		expect(result.content[0]?.text).toContain("## Matching memories")
		expect(result.content[0]?.text).toContain("User prefers dark mode")
		expect(result.content[0]?.text).not.toContain("## Profile")
		expect(result.content[0]?.text).not.toContain("## Recent context")
		expect(result.structuredContent.profile).toBeUndefined()
		expect(result.structuredContent.results).toEqual([
			{
				id: "mem_1",
				text: "User prefers dark mode",
				similarity: 0.91,
			},
		])
	})
})
