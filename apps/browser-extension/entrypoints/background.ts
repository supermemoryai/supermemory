import { getDefaultProject, saveMemory, searchMemories } from "../utils/api"
import {
	CONTAINER_TAGS,
	CONTEXT_MENU_IDS,
	MESSAGE_TYPES,
} from "../utils/constants"
import { captureTwitterTokens } from "../utils/twitter-auth"
import {
	type TwitterImportConfig,
	TwitterImporter,
} from "../utils/twitter-import"
import type {
	ExtensionMessage,
	MemoryData,
	MemoryPayload,
} from "../utils/types"

export default defineBackground(() => {
	let twitterImporter: TwitterImporter | null = null

	browser.runtime.onInstalled.addListener((details) => {
		browser.contextMenus.create({
			id: CONTEXT_MENU_IDS.SAVE_TO_SUPERMEMORY,
			title: "Save to supermemory",
			contexts: ["selection", "page", "link"],
		})

		// Open welcome tab on first install
		if (details.reason === "install") {
			browser.tabs.create({
				url: browser.runtime.getURL("/welcome.html"),
			})
		}
	})

	// Intercept Twitter requests to capture authentication headers.
	browser.webRequest.onBeforeSendHeaders.addListener(
		(details) => {
			captureTwitterTokens(details)
			return {}
		},
		{ urls: ["*://x.com/*", "*://twitter.com/*"] },
		["requestHeaders", "extraHeaders"],
	)

	// Handle context menu clicks.
	browser.contextMenus.onClicked.addListener(async (info, tab) => {
		if (info.menuItemId === CONTEXT_MENU_IDS.SAVE_TO_SUPERMEMORY) {
			if (tab?.id) {
				try {
					await browser.tabs.sendMessage(tab.id, {
						action: MESSAGE_TYPES.SAVE_MEMORY,
					})
				} catch (error) {
					console.error("Failed to send message to content script:", error)
				}
			}
		}
	})

	// Send message to current active tab.
	const sendMessageToCurrentTab = async (message: string) => {
		const tabs = await browser.tabs.query({
			active: true,
			currentWindow: true,
		})
		if (tabs.length > 0 && tabs[0].id) {
			await browser.tabs.sendMessage(tabs[0].id, {
				type: MESSAGE_TYPES.IMPORT_UPDATE,
				importedMessage: message,
			})
		}
	}

	/**
	 * Send import completion message
	 */
	const sendImportDoneMessage = async (totalImported: number) => {
		const tabs = await browser.tabs.query({
			active: true,
			currentWindow: true,
		})
		if (tabs.length > 0 && tabs[0].id) {
			await browser.tabs.sendMessage(tabs[0].id, {
				type: MESSAGE_TYPES.IMPORT_DONE,
				totalImported,
			})
		}
	}

	/**
	 * Save memory to supermemory API
	 */
	const saveMemoryToSupermemory = async (
		data: MemoryData,
	): Promise<{ success: boolean; data?: unknown; error?: string }> => {
		try {
			let containerTag: string = CONTAINER_TAGS.DEFAULT_PROJECT
			try {
				const defaultProject = await getDefaultProject()
				if (defaultProject?.containerTag) {
					containerTag = defaultProject.containerTag
				}
			} catch (error) {
				console.warn("Failed to get default project, using fallback:", error)
			}

			const payload: MemoryPayload = {
				containerTags: [containerTag],
				content: `${data.highlightedText}\n\n${data.html}\n\n${data?.url}`,
				metadata: { sm_source: "consumer" },
			}

			const responseData = await saveMemory(payload)
			return { success: true, data: responseData }
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	const getRelatedMemories = async (
		data: string,
	): Promise<{ success: boolean; data?: unknown; error?: string }> => {
		try {
			const responseData = await searchMemories(data)
			const response = responseData as {
				results?: Array<{ chunks?: Array<{ content?: string }> }>
			}
			const content = response.results?.[0]?.chunks?.[0]?.content
			console.log("Content:", content)
			return { success: true, data: content }
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}

	/**
	 * Handle extension messages
	 */
	browser.runtime.onMessage.addListener(
		(message: ExtensionMessage, _sender, sendResponse) => {
			// Handle Twitter import request
			if (message.type === MESSAGE_TYPES.BATCH_IMPORT_ALL) {
				const importConfig: TwitterImportConfig = {
					onProgress: sendMessageToCurrentTab,
					onComplete: sendImportDoneMessage,
					onError: async (error: Error) => {
						await sendMessageToCurrentTab(`Error: ${error.message}`)
					},
				}

				twitterImporter = new TwitterImporter(importConfig)
				twitterImporter.startImport().catch(console.error)
				sendResponse({ success: true })
				return true
			}

			// Handle regular memory save request
			if (message.action === MESSAGE_TYPES.SAVE_MEMORY) {
				;(async () => {
					try {
						const result = await saveMemoryToSupermemory(
							message.data as MemoryData,
						)
						sendResponse(result)
					} catch (error) {
						sendResponse({
							success: false,
							error: error instanceof Error ? error.message : "Unknown error",
						})
					}
				})()
				return true
			}

			if (message.action === MESSAGE_TYPES.GET_RELATED_MEMORIES) {
				;(async () => {
					try {
						const result = await getRelatedMemories(message.data as string)
						sendResponse(result)
					} catch (error) {
						sendResponse({
							success: false,
							error: error instanceof Error ? error.message : "Unknown error",
						})
					}
				})()
				return true
			}
		},
	)
})
