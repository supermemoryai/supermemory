import { describe, expect, it, beforeEach, vi } from "vitest"

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

import { createSearchMemoriesFunction } from "./openai"

const API_KEY = "test-api-key"

describe("createSearchMemoriesFunction temporal gating", () => {
	beforeEach(() => {
		executeMock.mockClear()
		executeMock.mockResolvedValue({ results: [] })
	})

	it("does not forward temporal parameters when enableTemporalQueries is false", async () => {
		const search = createSearchMemoriesFunction(API_KEY, {
			enableTemporalQueries: false,
		})

		await search({
			informationToGet: "coffee preferences",
			asOf: "2024-01-01T00:00:00Z",
			timeWindow: {
				from: "2024-01-01T00:00:00Z",
				to: "2024-01-31T23:59:59Z",
			},
		})

		expect(executeMock).toHaveBeenCalledTimes(1)
		const callArgs = (executeMock.mock.calls[0]?.[0] ??
			{}) as Record<string, unknown>
		expect(callArgs).not.toHaveProperty("asOf")
		expect(callArgs).not.toHaveProperty("validFromGte")
		expect(callArgs).not.toHaveProperty("validUntilLte")
	})

	it("forwards temporal parameters when enableTemporalQueries is true", async () => {
		const asOf = "2024-05-01T12:00:00Z"
		const from = "2024-04-01T00:00:00Z"
		const to = "2024-05-31T23:59:59Z"

		const search = createSearchMemoriesFunction(API_KEY, {
			enableTemporalQueries: true,
		})

		await search({
			informationToGet: "project roadmap",
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

	it("omits undefined temporal bounds even when enabled", async () => {
		const search = createSearchMemoriesFunction(API_KEY, {
			enableTemporalQueries: true,
		})

		await search({
			informationToGet: "travel plans",
			timeWindow: { from: "2024-02-01T00:00:00Z" },
		})

		expect(executeMock).toHaveBeenCalledTimes(1)
		const callArgs = (executeMock.mock.calls[0]?.[0] ??
			{}) as Record<string, unknown>
		expect(callArgs.validFromGte).toBe("2024-02-01T00:00:00Z")
		expect(callArgs).not.toHaveProperty("validUntilLte")
	})
})
