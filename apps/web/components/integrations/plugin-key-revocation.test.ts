import { describe, expect, it, mock } from "bun:test"
import { readFile } from "node:fs/promises"
import { revokePluginKey } from "./plugin-key-revocation"

describe("revokePluginKey", () => {
	it("does not report success or refetch when Better Auth resolves an error", async () => {
		const onSuccess = mock(() => {})
		const refetch = mock(() => {})

		await expect(
			revokePluginKey({
				deleteKey: async () => ({
					data: null,
					error: { message: "API key not found" },
				}),
				onSuccess,
				refetch,
			}),
		).rejects.toThrow("API key not found")
		expect(onSuccess).not.toHaveBeenCalled()
		expect(refetch).not.toHaveBeenCalled()
	})

	it("does not report success or refetch when deletion rejects", async () => {
		const onSuccess = mock(() => {})
		const refetch = mock(() => {})
		const deleteError = new Error("Network unavailable")

		await expect(
			revokePluginKey({
				deleteKey: async () => {
					throw deleteError
				},
				onSuccess,
				refetch,
			}),
		).rejects.toBe(deleteError)
		expect(onSuccess).not.toHaveBeenCalled()
		expect(refetch).not.toHaveBeenCalled()
	})

	it("uses a fallback message when Better Auth omits one", async () => {
		const onSuccess = mock(() => {})
		const refetch = mock(() => {})

		await expect(
			revokePluginKey({
				deleteKey: async () => ({ data: null, error: {} }),
				onSuccess,
				refetch,
			}),
		).rejects.toThrow("Failed to disconnect plugin")
		expect(onSuccess).not.toHaveBeenCalled()
		expect(refetch).not.toHaveBeenCalled()
	})

	it("reports success and refetches after Better Auth resolves success", async () => {
		const onSuccess = mock(() => {})
		const refetch = mock(() => {})

		await revokePluginKey({
			deleteKey: async () => ({
				data: { success: true },
				error: null,
			}),
			onSuccess,
			refetch,
		})

		expect(onSuccess).toHaveBeenCalledTimes(1)
		expect(refetch).toHaveBeenCalledTimes(1)
	})
})

describe("plugin revoke handler wiring", () => {
	const handlers = [
		{
			name: "integrations view",
			file: new URL("../integrations-view.tsx", import.meta.url),
			handler: "handleRevokePluginKey",
		},
		{
			name: "plugin detail",
			file: new URL("./plugins-detail.tsx", import.meta.url),
			handler: "handleRevoke",
		},
	]

	for (const { name, file, handler } of handlers) {
		it(`${name} delegates revocation through the guarded helper`, async () => {
			const source = await readFile(file, "utf8")
			const handlerStart = source.indexOf(`const ${handler} = async`)
			const handlerSource = source.slice(handlerStart, handlerStart + 500)

			expect(handlerStart).toBeGreaterThanOrEqual(0)
			expect(handlerSource).toContain("await revokePluginKey({")
			expect(handlerSource).toMatch(
				/deleteKey:\s*\(\)\s*=>\s*authClient\.apiKey\.delete\(\{\s*keyId\s*\}\)/,
			)
			expect(
				handlerSource.match(/authClient\.apiKey\.delete/g) ?? [],
			).toHaveLength(1)
			expect(handlerSource).toContain("onSuccess:")
			expect(handlerSource).toContain("refetch:")
		})
	}
})
