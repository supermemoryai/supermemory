import { describe, expect, mock, test } from "bun:test"
import { MESSAGE_TYPES } from "./constants"
import { createTwitterImportNotifications } from "./twitter-import-notifications"

describe("Twitter import notifications", () => {
	test("keeps progress, errors, and completion on the initiating tab", async () => {
		let activeTabId = 7
		const sendMessage = mock(async () => {})
		const notifications = createTwitterImportNotifications(
			activeTabId,
			sendMessage,
		)

		activeTabId = 42
		await notifications.onProgress("Imported 10 bookmarks")
		await notifications.onError(new Error("rate limited"))
		await notifications.onComplete(10)

		expect(activeTabId).toBe(42)
		expect(sendMessage.mock.calls).toEqual([
			[
				7,
				{
					type: MESSAGE_TYPES.IMPORT_UPDATE,
					importedMessage: "Imported 10 bookmarks",
				},
			],
			[
				7,
				{
					type: MESSAGE_TYPES.IMPORT_UPDATE,
					importedMessage: "Error: rate limited",
				},
			],
			[7, { type: MESSAGE_TYPES.IMPORT_DONE, totalImported: 10 }],
		])
	})

	test("does not let tab closure interrupt import callbacks", async () => {
		const sendMessage = mock(async () => {
			throw new Error("Receiving end does not exist")
		})
		const notifications = createTwitterImportNotifications(7, sendMessage)

		await notifications.onProgress("Retrying")
		await notifications.onError(new Error("failed"))
		await notifications.onComplete(0)

		expect(sendMessage).toHaveBeenCalledTimes(3)
	})

	test("accepts tab id zero", async () => {
		const sendMessage = mock(async () => {})
		const notifications = createTwitterImportNotifications(0, sendMessage)

		await notifications.onProgress("Starting")

		expect(sendMessage).toHaveBeenCalledWith(0, {
			type: MESSAGE_TYPES.IMPORT_UPDATE,
			importedMessage: "Starting",
		})
	})

	test("skips notifications when the request has no sender tab", async () => {
		const sendMessage = mock(async () => {})
		const notifications = createTwitterImportNotifications(
			undefined,
			sendMessage,
		)

		await notifications.onProgress("Starting")
		await notifications.onComplete(0)

		expect(sendMessage).not.toHaveBeenCalled()
	})
})
