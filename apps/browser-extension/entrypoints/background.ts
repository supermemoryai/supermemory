import {
	getDefaultProject,
	saveMemory,
	searchMemories,
	fetchProjects,
} from "../utils/api"
import {
	CONTAINER_TAGS,
	CONTEXT_MENU_IDS,
	MESSAGE_TYPES,
	POSTHOG_EVENT_KEY,
} from "../utils/constants"
import { trackEvent } from "../utils/posthog"
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

	browser.runtime.onInstalled.addListener(async (details) => {
		browser.contextMenus.create({
			id: CONTEXT_MENU_IDS.SAVE_TO_SUPERMEMORY,
			title: "sync to supermemory",
			contexts: ["selection", "page", "link"],
		})

		if (details.reason === "install") {
			await trackEvent("extension_installed", {
				reason: details.reason,
				version: browser.runtime.getManifest().version,
			})
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
						actionSource: "context_menu",
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
		actionSource: string,
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

			let content: string
			if (data.content) {
				content = data.content
			} else if (data.highlightedText) {
				content = `${data.highlightedText}\n\n${data?.url || ""}`
			} else if (data.markdown) {
				content = `${data.markdown}\n\n${data?.url || ""}`
			} else if (data.html) {
				content = `${data.html}\n\n${data?.url || ""}`
			} else {
				content = data?.url || ""
			}

			const metadata: MemoryPayload["metadata"] = {
				sm_source: "consumer",
				website_url: data.url,
			}

			if (data.ogImage) {
				metadata.website_og_image = data.ogImage
			}

			if (data.title) {
				metadata.website_title = data.title
			}

			const payload: MemoryPayload = {
				containerTags: [containerTag],
				content,
				metadata,
			}

			const responseData = await saveMemory(payload)

			await trackEvent(POSTHOG_EVENT_KEY.SAVE_MEMORY_ATTEMPTED, {
				source: `${POSTHOG_EVENT_KEY.SOURCE}_${actionSource}`,
				has_highlight: !!data.highlightedText,
				url_domain: data.url ? new URL(data.url).hostname : undefined,
			})

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
		eventSource: string,
	): Promise<{ success: boolean; data?: unknown; error?: string }> => {
		try {
			const responseData = await searchMemories(data)
			const response = responseData as {
				results?: Array<{ memory?: string }>
			}
			const memories: string[] = []
			response.results?.forEach((result, index) => {
				memories.push(`${index + 1}. ${result.memory} \n`)
			})
			console.log("Memories:", memories)
			await trackEvent(eventSource)
			return { success: true, data: memories }
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
					isFolderImport: message.isFolderImport,
					bookmarkCollectionId: message.bookmarkCollectionId,
					selectedProject: message.selectedProject,
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
							message.actionSource || "unknown",
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
						const result = await getRelatedMemories(
							message.data as string,
							message.actionSource || "unknown",
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

			if (message.action === MESSAGE_TYPES.CAPTURE_PROMPT) {
				;(async () => {
					try {
						const messageData = message.data as {
							prompt: string
							platform: string
							source: string
						}
						console.log("=== PROMPT CAPTURED ===")
						console.log(messageData)
						console.log("========================")

						const memoryData: MemoryData = {
							content: messageData.prompt,
						}

						const result = await saveMemoryToSupermemory(
							memoryData,
							`prompt_capture_${messageData.platform}`,
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

			if (message.action === MESSAGE_TYPES.FETCH_PROJECTS) {
				;(async () => {
					try {
						const projects = await fetchProjects()
						sendResponse({ success: true, data: projects })
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
