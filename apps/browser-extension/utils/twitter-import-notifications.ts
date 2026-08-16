import { MESSAGE_TYPES } from "./constants"

type TwitterImportNotification =
	| {
			type: typeof MESSAGE_TYPES.IMPORT_UPDATE
			importedMessage: string
	  }
	| {
			type: typeof MESSAGE_TYPES.IMPORT_DONE
			totalImported: number
	  }

type SendTabMessage = (
	tabId: number,
	message: TwitterImportNotification,
) => Promise<unknown>

export function createTwitterImportNotifications(
	tabId: number | undefined,
	sendMessage: SendTabMessage,
) {
	const deliver = async (message: TwitterImportNotification): Promise<void> => {
		if (tabId === undefined) return
		try {
			await sendMessage(tabId, message)
		} catch {
			// The initiating tab can be closed or navigated while the import keeps
			// running. Notification delivery must not cancel the import itself.
		}
	}

	return {
		onProgress: (message: string) =>
			deliver({
				type: MESSAGE_TYPES.IMPORT_UPDATE,
				importedMessage: message,
			}),
		onComplete: (totalImported: number) =>
			deliver({
				type: MESSAGE_TYPES.IMPORT_DONE,
				totalImported,
			}),
		onError: (error: Error) =>
			deliver({
				type: MESSAGE_TYPES.IMPORT_UPDATE,
				importedMessage: `Error: ${error.message}`,
			}),
	}
}
