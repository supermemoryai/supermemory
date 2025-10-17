import { beforeEach, describe, expect, it, vi } from "vitest"

const executeMock = vi.fn()
const addMock = vi.fn()

vi.mock("supermemory", () => {
	const SupermemoryMock = vi.fn().mockImplementation(() => ({
		search: { execute: executeMock },
		memories: { add: addMock },
	}))

	return {
		__esModule: true,
		default: SupermemoryMock,
	}
})

import { supermemoryTools } from "./tools"

const API_KEY = "test-api-key"

describe("supermemoryTools temporal gating (ai-sdk)", () => {
	beforeEach(() => {
		executeMock.mockClear()
		executeMock.mockResolvedValue({ results: [] })
	})

	it("omits temporal parameters when flag disabled", async () => {
		const tools = supermemoryTools(API_KEY, {
			enableTemporalQueries: false,
		})

		const execute =
			tools.searchMemories.execute as
				| ((args: Record<string, unknown>) => Promise<unknown>)
				| undefined
		expect(execute).toBeDefined()

		await execute?.({
			informationToGet: "ice cream preferences",
			asOf: "2024-06-01T00:00:00Z",
			timeWindow: {
				from: "2024-05-01T00:00:00Z",
				to: "2024-06-30T23:59:59Z",
			},
		})

		expect(executeMock).toHaveBeenCalledTimes(1)
		const callArgs = (executeMock.mock.calls[0]?.[0] ??
			{}) as Record<string, unknown>
		expect(callArgs).not.toHaveProperty("asOf")
		expect(callArgs).not.toHaveProperty("validFromGte")
		expect(callArgs).not.toHaveProperty("validUntilLte")
	})

	it("forwards temporal parameters when flag enabled", async () => {
		const asOf = "2024-07-01T12:34:56Z"
		const from = "2024-06-01T00:00:00Z"
		const to = "2024-07-31T23:59:59Z"

		const tools = supermemoryTools(API_KEY, {
			enableTemporalQueries: true,
		})

		const execute =
			tools.searchMemories.execute as
				| ((args: Record<string, unknown>) => Promise<unknown>)
				| undefined
		expect(execute).toBeDefined()

		await execute?.({
			informationToGet: "work history",
			asOf,
			timeWindow: { from, to },
		})

		expect(executeMock).toHaveBeenCalledTimes(1)
		const callArgs = (executeMock.mock.calls[0]?.[0] ??
			{}) as Record<string, unknown>
		expect(callArgs.asOf).toBe(asOf)
		expect(callArgs.validFromGte).toBe(from)
		expect(callArgs.validUntilLte).toBe(to)
	})

	it("forwards partial window parameters selectively", async () => {
		const from = "2024-01-15T00:00:00Z"

		const tools = supermemoryTools(API_KEY, {
			enableTemporalQueries: true,
		})

		const execute =
			tools.searchMemories.execute as
				| ((args: Record<string, unknown>) => Promise<unknown>)
				| undefined
		expect(execute).toBeDefined()

		await execute?.({
			informationToGet: "conference notes",
			timeWindow: { from },
		})

		expect(executeMock).toHaveBeenCalledTimes(1)
		const callArgs = (executeMock.mock.calls[0]?.[0] ??
			{}) as Record<string, unknown>
		expect(callArgs.validFromGte).toBe(from)
		expect(callArgs).not.toHaveProperty("validUntilLte")
	})
})
