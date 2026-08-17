import type { McpServer } from "@modelcontextprotocol/server"
import { describe, expect, it, vi } from "vitest"
import type { SupermemoryClient } from "../client"
import { register } from "./search-memory"
import {
	searchMemoryOutputSchema,
	type SearchMemoryOutput,
} from "./output-schemas"
import type { ToolDeps } from "./types"

type SearchMemoryArgs = {
	query: string
	includeProfile?: boolean
	containerTag?: string
}

type SearchMemoryResult = {
	structuredContent?: SearchMemoryOutput
}

function createHarness(
	activeTag?: string,
	visibleTags: string[] = activeTag ? [activeTag] : [],
) {
	let handler:
		| ((args: SearchMemoryArgs) => Promise<SearchMemoryResult>)
		| undefined
	const registerTool = vi.fn(
		(
			_name: string,
			_config: unknown,
			registeredHandler: (
				args: SearchMemoryArgs,
			) => Promise<SearchMemoryResult>,
		) => {
			handler = registeredHandler
			return {}
		},
	)
	const search = vi.fn().mockResolvedValue({
		results: [],
		total: 0,
		timing: 1,
	})
	const getProfile = vi.fn().mockResolvedValue({
		profile: { static: [], dynamic: [] },
	})
	const listContainerTags = vi
		.fn()
		.mockResolvedValue(visibleTags.map((containerTag) => ({ containerTag })))
	const client = {
		search,
		getProfile,
		listContainerTags,
	} as unknown as SupermemoryClient
	const getClient = vi.fn((_containerTag?: string) => client)
	const resolveSelectedContainerTag = vi.fn(
		async (explicit?: string) => explicit ?? activeTag,
	)
	const resolveContainerTag = vi.fn(async () => "sm_project_default")
	const errorResult = vi.fn((error: unknown) => ({
		content: [],
		isError: true,
		error,
	}))

	register({
		server: { registerTool } as unknown as Pick<McpServer, "registerTool">,
		actor: {
			userId: "user-1",
			organizationId: "org-1",
			bearerToken: "token",
		},
		getClient,
		getSession: vi.fn(),
		resolveContainerTag,
		resolveSelectedContainerTag,
		getActiveContainerTag: vi.fn(),
		setActiveContainerTag: vi.fn(),
		createUploadSession: vi.fn(),
		getClientInfo: vi.fn(),
		errorResult,
	} as unknown as ToolDeps)

	return {
		invoke(args: SearchMemoryArgs) {
			if (!handler) throw new Error("search_memory was not registered")
			return handler(args)
		},
		getClient,
		resolveContainerTag,
		resolveSelectedContainerTag,
		search,
		getProfile,
		errorResult,
		listContainerTags,
	}
}

describe("search_memory space selection", () => {
	it.each([
		{
			name: "leaves an unselected search unscoped",
			activeTag: undefined,
			explicitTag: undefined,
			expectedClientTag: undefined,
			expectedOutputTag: null,
			expectsVisibilityCheck: false,
		},
		{
			name: "uses a visible active space when one is selected",
			activeTag: "active-space",
			explicitTag: undefined,
			expectedClientTag: "active-space",
			expectedOutputTag: "active-space",
			expectsVisibilityCheck: true,
		},
		{
			name: "prefers an explicit space over the active space",
			activeTag: "active-space",
			explicitTag: "explicit-space",
			expectedClientTag: "explicit-space",
			expectedOutputTag: "explicit-space",
			expectsVisibilityCheck: false,
		},
	])("$name", async ({
		activeTag,
		explicitTag,
		expectedClientTag,
		expectedOutputTag,
		expectsVisibilityCheck,
	}) => {
		const harness = createHarness(activeTag)
		const result = await harness.invoke({
			query: "remember me",
			includeProfile: false,
			...(explicitTag ? { containerTag: explicitTag } : {}),
		})

		expect(harness.resolveSelectedContainerTag).toHaveBeenCalledWith(
			explicitTag,
		)
		expect(harness.resolveContainerTag).not.toHaveBeenCalled()
		expect(harness.getClient.mock.calls.at(-1)?.[0]).toBe(expectedClientTag)
		expect(harness.listContainerTags).toHaveBeenCalledTimes(
			expectsVisibilityCheck ? 1 : 0,
		)
		expect(harness.search).toHaveBeenCalledWith("remember me")
		expect(result.structuredContent?.containerTag).toBe(expectedOutputTag)
		expect(
			searchMemoryOutputSchema.safeParse(result.structuredContent).success,
		).toBe(true)
	})

	it("ignores an active space outside the current OAuth grant", async () => {
		const harness = createHarness("other-space", ["readable-space"])

		const result = await harness.invoke({
			query: "remember me",
			includeProfile: false,
		})

		expect(harness.getClient.mock.calls[0]?.[0]).toBeUndefined()
		expect(harness.getClient).toHaveBeenCalledOnce()
		expect(result.structuredContent?.containerTag).toBeNull()
	})

	it("returns the standard tool error when active-space validation fails", async () => {
		const harness = createHarness("active-space")
		const error = new Error("space list unavailable")
		harness.listContainerTags.mockRejectedValueOnce(error)

		await harness.invoke({ query: "remember me", includeProfile: false })

		expect(harness.errorResult).toHaveBeenCalledWith(error)
		expect(harness.search).not.toHaveBeenCalled()
	})

	it("keeps profile enrichment for a visible active space", async () => {
		const harness = createHarness("active-space")
		const result = await harness.invoke({ query: "remember me" })

		expect(harness.listContainerTags).toHaveBeenCalledOnce()
		expect(harness.getProfile).toHaveBeenCalledWith("remember me")
		expect(result.structuredContent?.containerTag).toBe("active-space")
	})

	it("keeps profile enrichment enabled for an unselected search", async () => {
		const harness = createHarness()
		const result = await harness.invoke({ query: "remember me" })

		expect(harness.getProfile).toHaveBeenCalledWith("remember me")
		expect(result.structuredContent?.profile).toEqual({
			static: [],
			dynamic: [],
		})
	})

	it("returns the standard tool error when scope resolution fails", async () => {
		const harness = createHarness()
		const error = new Error("space state unavailable")
		harness.resolveSelectedContainerTag.mockRejectedValueOnce(error)

		await harness.invoke({ query: "remember me" })

		expect(harness.errorResult).toHaveBeenCalledWith(error)
		expect(harness.getClient).not.toHaveBeenCalled()
	})
})
