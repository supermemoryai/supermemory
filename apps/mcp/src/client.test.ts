import { afterEach, describe, expect, it, vi } from "vitest"
import { SupermemoryClient } from "./client"

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("SupermemoryClient", () => {
	it("lists every accessible container tag", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify([
					{
						id: "space_vene",
						name: "Vene Work",
						containerTag: "vene-work",
						createdAt: "2026-07-20T00:00:00.000Z",
						updatedAt: "2026-07-20T00:00:00.000Z",
						isExperimental: false,
						isNova: false,
					},
					{
						id: "space_sujal",
						name: "Sujal Codex",
						containerTag: "sujal-codex",
						createdAt: "2026-07-20T00:00:00.000Z",
						updatedAt: "2026-07-20T00:00:00.000Z",
						isExperimental: false,
						isNova: false,
					},
					{
						id: "space_default",
						name: "Default",
						containerTag: "sm_project_default",
						createdAt: "2026-07-20T00:00:00.000Z",
						updatedAt: "2026-07-20T00:00:00.000Z",
						isExperimental: false,
						isNova: true,
					},
				]),
				{ headers: { "Content-Type": "application/json" } },
			),
		)
		vi.stubGlobal("fetch", fetchMock)

		const client = new SupermemoryClient(
			"sm_test",
			undefined,
			"https://api.example.com",
		)

		await expect(client.getContainerTags()).resolves.toEqual([
			"vene-work",
			"sujal-codex",
			"sm_project_default",
		])
		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.example.com/v3/container-tags/list",
			expect.objectContaining({
				headers: {
					Authorization: "Bearer sm_test",
					"Content-Type": "application/json",
				},
				method: "GET",
			}),
		)
	})

	it("ignores malformed container tag entries", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response(
						JSON.stringify([
							null,
							{},
							{ containerTag: 42 },
							{ containerTag: "project-valid" },
						]),
					),
				),
		)

		const client = new SupermemoryClient(
			"sm_test",
			undefined,
			"https://api.example.com",
		)

		await expect(client.getContainerTags()).resolves.toEqual(["project-valid"])
	})

	it("returns an empty list for a malformed response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(JSON.stringify({ projects: [] }))),
		)

		const client = new SupermemoryClient(
			"sm_test",
			undefined,
			"https://api.example.com",
		)

		await expect(client.getContainerTags()).resolves.toEqual([])
	})

	it("preserves the upstream failure as an error cause", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(null, {
					status: 503,
					statusText: "Service Unavailable",
				}),
			),
		)

		const client = new SupermemoryClient(
			"sm_test",
			undefined,
			"https://api.example.com",
		)

		await expect(client.getContainerTags()).rejects.toMatchObject({
			cause: "Service Unavailable",
			message: "Failed to fetch container tags",
		})
	})
})
