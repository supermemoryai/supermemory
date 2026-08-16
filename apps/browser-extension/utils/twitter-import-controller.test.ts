import { describe, expect, mock, test } from "bun:test"
import { createTwitterImportController } from "./twitter-import-controller"

function deferred() {
	return Promise.withResolvers<void>()
}

describe("Twitter import controller", () => {
	test("allows only one import until the active run completes", async () => {
		const firstRun = deferred()
		const secondRun = deferred()
		const startImport = mock()
			.mockImplementationOnce(() => firstRun.promise)
			.mockImplementationOnce(() => secondRun.promise)
		const createImporter = mock(() => ({ startImport }))
		const controller = createTwitterImportController(createImporter)

		const first = controller.start({ source: "first" })
		const duplicate = controller.start({ source: "duplicate" })

		expect(first).toBe(firstRun.promise)
		expect(duplicate).toBeNull()
		expect(createImporter).toHaveBeenCalledTimes(1)
		expect(startImport).toHaveBeenCalledTimes(1)

		firstRun.resolve()
		await first

		const second = controller.start({ source: "second" })
		expect(second).toBe(secondRun.promise)
		expect(createImporter).toHaveBeenCalledTimes(2)
	})

	test("releases the lock when an import rejects", async () => {
		const failedRun = deferred()
		const recoveredRun = deferred()
		const startImport = mock()
			.mockImplementationOnce(() => failedRun.promise)
			.mockImplementationOnce(() => recoveredRun.promise)
		const controller = createTwitterImportController(() => ({ startImport }))

		const failed = controller.start("failed")
		failedRun.reject(new Error("network failed"))
		await expect(failed).rejects.toThrow("network failed")

		expect(controller.start("recovered")).toBe(recoveredRun.promise)
		expect(startImport).toHaveBeenCalledTimes(2)
	})

	test("releases the lock when importer startup throws", async () => {
		const recoveredRun = deferred()
		const createImporter = mock()
			.mockImplementationOnce(() => {
				throw new Error("startup failed")
			})
			.mockImplementationOnce(() => ({
				startImport: () => recoveredRun.promise,
			}))
		const controller = createTwitterImportController(createImporter)

		await expect(controller.start("failed")).rejects.toThrow("startup failed")

		expect(controller.start("recovered")).toBe(recoveredRun.promise)
		expect(createImporter).toHaveBeenCalledTimes(2)
	})
})
