import {
	DOMAINS,
	ELEMENT_IDS,
	MESSAGE_TYPES,
	POSTHOG_EVENT_KEY,
	STORAGE_KEYS,
} from "../utils/constants"
import { trackEvent } from "../utils/posthog"
import {
	createChatGPTInputBarElement,
	createClaudeInputBarElement,
	createT3InputBarElement,
	createTwitterImportButton,
	DOMUtils,
} from "../utils/ui-components"

export default defineContentScript({
	matches: ["<all_urls>"],
	main() {

		browser.runtime.onMessage.addListener(async (message) => {
			if (message.action === MESSAGE_TYPES.SHOW_TOAST) {
				DOMUtils.showToast(message.state)
			} else if (message.action === MESSAGE_TYPES.SAVE_MEMORY) {
				await saveMemory()
			} else if (message.type === MESSAGE_TYPES.IMPORT_UPDATE) {
				updateTwitterImportUI(message)
			} else if (message.type === MESSAGE_TYPES.IMPORT_DONE) {
				updateTwitterImportUI(message)
			}
		})

		const observeForMemoriesDialog = () => {
			const observer = new MutationObserver(() => {
				if (DOMUtils.isOnDomain(DOMAINS.CHATGPT)) {
					addSupermemoryButtonToMemoriesDialog()
					addSaveChatGPTElementBeforeComposerBtn()
				}
				if (DOMUtils.isOnDomain(DOMAINS.CLAUDE)) {
					addSupermemoryIconToClaudeInput()
				}
				if (DOMUtils.isOnDomain(DOMAINS.T3)) {
					addSupermemoryIconToT3Input()
				}
				if (
					DOMUtils.isOnDomain(DOMAINS.TWITTER) &&
					window.location.pathname === "/i/bookmarks"
				) {
					addTwitterImportButton()
				} else if (DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
					if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)) {
						DOMUtils.removeElement(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)
					}
				}
			})

			observer.observe(document.body, {
				childList: true,
				subtree: true,
			})
		}

		if (
			DOMUtils.isOnDomain(DOMAINS.TWITTER) &&
			window.location.pathname === "/i/bookmarks"
		) {
			setTimeout(() => {
				addTwitterImportButton() // Wait 2 seconds for page to load
				//addSaveTweetElement();
			}, 2000)
		} else if (DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
			if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)) {
				DOMUtils.removeElement(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)
			}
		}

		if (DOMUtils.isOnDomain(DOMAINS.CLAUDE)) {
			setTimeout(() => {
				addSupermemoryIconToClaudeInput() // Wait 2 seconds for Claude page to load
			}, 2000)
		}

		if (DOMUtils.isOnDomain(DOMAINS.T3)) {
			setTimeout(() => {
				addSupermemoryIconToT3Input() // Wait 2 seconds for T3 page to load
			}, 2000)
		}

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", observeForMemoriesDialog)
		} else {
			observeForMemoriesDialog()
		}

		async function saveMemory() {
			try {
				DOMUtils.showToast("loading")

				const highlightedText = window.getSelection()?.toString() || ""

				const url = window.location.href

				const html = document.documentElement.outerHTML

				const response = await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.SAVE_MEMORY,
					data: {
						html,
						highlightedText,
						url,
					},
					actionSource: "context_menu",
				})

				console.log("Response from enxtension:", response)
				if (response.success) {
					DOMUtils.showToast("success")
				} else {
					DOMUtils.showToast("error")
				}
			} catch (error) {
				console.error("Error saving memory:", error)
				DOMUtils.showToast("error")
			}
		}

		async function getRelatedMemories(actionSource: string) {
			try {
				const userQuery =
					document.getElementById("prompt-textarea")?.textContent || ""

				const response = await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.GET_RELATED_MEMORIES,
					data: userQuery,
					actionSource: actionSource,
				})

				if (response.success && response.data) {
					const promptElement = document.getElementById("prompt-textarea")
					if (promptElement) {
						const currentContent = promptElement.innerHTML
						promptElement.innerHTML = `${currentContent}<br>Supermemories: ${response.data}`
					}
				}
			} catch (error) {
				console.error("Error getting related memories:", error)
			}
		}

		function addSupermemoryButtonToMemoriesDialog() {
			const dialogs = document.querySelectorAll('[role="dialog"]')
			let memoriesDialog: HTMLElement | null = null

			for (const dialog of dialogs) {
				const headerText = dialog.querySelector("h2")
				if (headerText?.textContent?.includes("Saved memories")) {
					memoriesDialog = dialog as HTMLElement
					break
				}
			}

			if (!memoriesDialog) return

			if (memoriesDialog.querySelector("#supermemory-save-button")) return

			const deleteAllContainer = memoriesDialog.querySelector(
				".mt-5.flex.justify-end",
			)
			if (!deleteAllContainer) return

			const supermemoryButton = document.createElement("button")
			supermemoryButton.id = "supermemory-save-button"
			supermemoryButton.className = "btn relative btn-primary-outline mr-2"

			const iconUrl = browser.runtime.getURL("/icon-16.png")

			supermemoryButton.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <img src="${iconUrl}" alt="supermemory" style="width: 16px; height: 16px; flex-shrink: 0; border-radius: 2px;" />
          Save to supermemory
        </div>
      `

			supermemoryButton.style.cssText = `
        background: #1C2026 !important;
        color: white !important;
        border: 1px solid #1C2026 !important;
        border-radius: 9999px !important;
        padding: 10px 16px !important;
        font-weight: 500 !important;
        font-size: 14px !important;
        margin-right: 8px !important;
        cursor: pointer !important;
      `

			supermemoryButton.addEventListener("mouseenter", () => {
				supermemoryButton.style.backgroundColor = "#2B2E33"
			})

			supermemoryButton.addEventListener("mouseleave", () => {
				supermemoryButton.style.backgroundColor = "#1C2026"
			})

			supermemoryButton.addEventListener("click", async () => {
				await saveMemoriesToSupermemory()
			})

			deleteAllContainer.insertBefore(
				supermemoryButton,
				deleteAllContainer.firstChild,
			)
		}

		async function saveMemoriesToSupermemory() {
			try {
				DOMUtils.showToast("loading")

				const memoriesTable = document.querySelector(
					'[role="dialog"] table tbody',
				)
				if (!memoriesTable) {
					DOMUtils.showToast("error")
					return
				}

				const memoryRows = memoriesTable.querySelectorAll("tr")
				const memories: string[] = []

				memoryRows.forEach((row) => {
					const memoryCell = row.querySelector("td .py-2.whitespace-pre-wrap")
					if (memoryCell?.textContent) {
						memories.push(memoryCell.textContent.trim())
					}
				})

				console.log("Memories:", memories)

				if (memories.length === 0) {
					DOMUtils.showToast("error")
					return
				}

				const combinedContent = `ChatGPT Saved Memories:\n\n${memories.map((memory, index) => `${index + 1}. ${memory}`).join("\n\n")}`

				const response = await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.SAVE_MEMORY,
					data: {
						html: combinedContent,
					},
					actionSource: "chatgpt_memories_dialog",
				})

				console.log({ response })

				if (response.success) {
					DOMUtils.showToast("success")
				} else {
					DOMUtils.showToast("error")
				}
			} catch (error) {
				console.error("Error saving memories to supermemory:", error)
				DOMUtils.showToast("error")
			}
		}

		function addTwitterImportButton() {
			if (!DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
				return
			}

			// Only show the import button on the bookmarks page
			if (window.location.pathname !== "/i/bookmarks") {
				return
			}

			if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)) {
				return
			}

			const button = createTwitterImportButton(async () => {
				try {
					await browser.runtime.sendMessage({
						type: MESSAGE_TYPES.BATCH_IMPORT_ALL,
					})
					await trackEvent(POSTHOG_EVENT_KEY.TWITTER_IMPORT_STARTED, {
						source: `${POSTHOG_EVENT_KEY.SOURCE}_content_script`,
					})
				} catch (error) {
					console.error("Error starting import:", error)
				}
			})

			document.body.appendChild(button)
		}


		function updateTwitterImportUI(message: {
			type: string
			importedMessage?: string
			totalImported?: number
		}) {
			const importButton = document.getElementById(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)
			if (!importButton) return

			const iconUrl = browser.runtime.getURL("/icon-16.png")

			if (message.type === MESSAGE_TYPES.IMPORT_UPDATE) {
				importButton.innerHTML = `
					<img src="${iconUrl}" width="20" height="20" alt="Save to Memory" style="border-radius: 4px;" />
					<span style="font-weight: 500; font-size: 14px;">${message.importedMessage}</span>
				`
				importButton.style.cursor = "default"
			}

			if (message.type === MESSAGE_TYPES.IMPORT_DONE) {
				importButton.innerHTML = `
					<img src="${iconUrl}" width="20" height="20" alt="Save to Memory" style="border-radius: 4px;" />
					<span style="font-weight: 500; font-size: 14px; color: #059669;">✓ Imported ${message.totalImported} tweets!</span>
				`
				
				setTimeout(() => {
					importButton.innerHTML = `
						<img src="${iconUrl}" width="20" height="20" alt="Save to Memory" style="border-radius: 4px;" />
						<span style="font-weight: 500; font-size: 14px;">Import Bookmarks</span>
					`
					importButton.style.cursor = "pointer"
				}, 3000)
			}
		}

		function addSaveChatGPTElementBeforeComposerBtn() {
			if (!DOMUtils.isOnDomain(DOMAINS.CHATGPT)) {
				return
			}

			const composerButtons = document.querySelectorAll("button.composer-btn")

			composerButtons.forEach((button) => {
				if (button.hasAttribute("data-supermemory-icon-added-before")) {
					return
				}

				const parent = button.parentElement
				if (!parent) return

				const parentSiblings = parent.parentElement?.children
				if (!parentSiblings) return

				let hasSpeechButtonSibling = false
				for (const sibling of parentSiblings) {
					if (
						sibling.getAttribute("data-testid") ===
						"composer-speech-button-container"
					) {
						hasSpeechButtonSibling = true
						break
					}
				}

				if (!hasSpeechButtonSibling) return

				const grandParent = parent.parentElement
				if (!grandParent) return

				const existingIcon = grandParent.querySelector(
					`#${ELEMENT_IDS.CHATGPT_INPUT_BAR_ELEMENT}-before-composer`,
				)
				if (existingIcon) {
					button.setAttribute("data-supermemory-icon-added-before", "true")
					return
				}

				const saveChatGPTElement = createChatGPTInputBarElement(async () => {
					await getRelatedMemories(
						POSTHOG_EVENT_KEY.CHATGPT_CHAT_MEMORIES_SEARCHED,
					)
				})

				saveChatGPTElement.id = `${ELEMENT_IDS.CHATGPT_INPUT_BAR_ELEMENT}-before-composer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

				button.setAttribute("data-supermemory-icon-added-before", "true")

				grandParent.insertBefore(saveChatGPTElement, parent)
			})
		}

		function addSupermemoryIconToClaudeInput() {
			if (!DOMUtils.isOnDomain(DOMAINS.CLAUDE)) {
				return
			}

			const targetContainers = document.querySelectorAll(
				".relative.flex-1.flex.items-center.gap-2.shrink.min-w-0",
			)

			targetContainers.forEach((container) => {
				if (container.hasAttribute("data-supermemory-icon-added")) {
					return
				}

				const existingIcon = container.querySelector(
					`#${ELEMENT_IDS.CLAUDE_INPUT_BAR_ELEMENT}`,
				)
				if (existingIcon) {
					container.setAttribute("data-supermemory-icon-added", "true")
					return
				}

				const supermemoryIcon = createClaudeInputBarElement(async () => {
					await getRelatedMemoriesForClaude()
				})

				supermemoryIcon.id = `${ELEMENT_IDS.CLAUDE_INPUT_BAR_ELEMENT}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

				container.setAttribute("data-supermemory-icon-added", "true")

				container.insertBefore(supermemoryIcon, container.firstChild)
			})
		}

		async function getRelatedMemoriesForClaude() {
			try {
				let userQuery = ""

				const supermemoryContainer = document.querySelector(
					'[data-supermemory-icon-added="true"]',
				)
				if (supermemoryContainer?.parentElement?.previousElementSibling) {
					const pTag =
						supermemoryContainer.parentElement.previousElementSibling.querySelector(
							"p",
						)
					userQuery = pTag?.innerText || pTag?.textContent || ""
				}

				if (!userQuery.trim()) {
					const textareaElement = document.querySelector(
						'div[contenteditable="true"]',
					) as HTMLElement
					userQuery =
						textareaElement?.innerText || textareaElement?.textContent || ""
				}

				if (!userQuery.trim()) {
					const inputElements = document.querySelectorAll(
						'div[contenteditable="true"], textarea, input[type="text"]',
					)
					for (const element of inputElements) {
						const text =
							(element as HTMLElement).innerText ||
							(element as HTMLInputElement).value
						if (text?.trim()) {
							userQuery = text.trim()
							break
						}
					}
				}

				console.log("Claude query extracted:", userQuery)

				if (!userQuery.trim()) {
					console.log("No query text found")
					DOMUtils.showToast("error")
					return
				}

				const response = await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.GET_RELATED_MEMORIES,
					data: userQuery,
					actionSource: POSTHOG_EVENT_KEY.CLAUDE_CHAT_MEMORIES_SEARCHED,
				})

				console.log("Claude memories response:", response)

				if (response.success && response.data) {
					const textareaElement = document.querySelector(
						'div[contenteditable="true"]',
					) as HTMLElement

					if (textareaElement) {
						const currentContent = textareaElement.innerHTML
						textareaElement.innerHTML = `${currentContent}<br>Supermemories: ${response.data}`

						textareaElement.dispatchEvent(new Event("input", { bubbles: true }))
					} else {
						console.log("Could not find Claude input area")
					}
				} else {
					console.log(
						"Failed to get memories:",
						response.error || "Unknown error",
					)
				}
			} catch (error) {
				console.error("Error getting related memories for Claude:", error)
			}
		}

		function addSupermemoryIconToT3Input() {
			if (!DOMUtils.isOnDomain(DOMAINS.T3)) {
				return
			}

			const targetContainers = document.querySelectorAll(
				".flex.min-w-0.items-center.gap-2.overflow-hidden",
			)

			targetContainers.forEach((container) => {
				if (container.hasAttribute("data-supermemory-icon-added")) {
					return
				}

				const existingIcon = container.querySelector(
					`#${ELEMENT_IDS.T3_INPUT_BAR_ELEMENT}`,
				)
				if (existingIcon) {
					container.setAttribute("data-supermemory-icon-added", "true")
					return
				}

				const supermemoryIcon = createT3InputBarElement(async () => {
					await getRelatedMemoriesForT3()
				})

				supermemoryIcon.id = `${ELEMENT_IDS.T3_INPUT_BAR_ELEMENT}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

				container.setAttribute("data-supermemory-icon-added", "true")

				container.insertBefore(supermemoryIcon, container.firstChild)
			})
		}

		async function getRelatedMemoriesForT3() {
			try {
				let userQuery = ""

				const supermemoryContainer = document.querySelector(
					'[data-supermemory-icon-added="true"]',
				)
				if (
					supermemoryContainer?.parentElement?.parentElement
						?.previousElementSibling
				) {
					const textareaElement =
						supermemoryContainer.parentElement.parentElement.previousElementSibling.querySelector(
							"textarea",
						)
					userQuery = textareaElement?.value || ""
				}

				if (!userQuery.trim()) {
					const textareaElement = document.querySelector(
						'div[contenteditable="true"]',
					) as HTMLElement
					userQuery =
						textareaElement?.innerText || textareaElement?.textContent || ""
				}

				if (!userQuery.trim()) {
					const textareas = document.querySelectorAll("textarea")
					for (const textarea of textareas) {
						const text = (textarea as HTMLTextAreaElement).value
						if (text?.trim()) {
							userQuery = text.trim()
							break
						}
					}
				}

				console.log("T3 query extracted:", userQuery)

				if (!userQuery.trim()) {
					console.log("No query text found")
					return
				}

				const response = await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.GET_RELATED_MEMORIES,
					data: userQuery,
					actionSource: POSTHOG_EVENT_KEY.T3_CHAT_MEMORIES_SEARCHED,
				})

				console.log("T3 memories response:", response)

				if (response.success && response.data) {
					let textareaElement = null
					const supermemoryContainer = document.querySelector(
						'[data-supermemory-icon-added="true"]',
					)
					if (
						supermemoryContainer?.parentElement?.parentElement
							?.previousElementSibling
					) {
						textareaElement =
							supermemoryContainer.parentElement.parentElement.previousElementSibling.querySelector(
								"textarea",
							)
					}

					if (!textareaElement) {
						textareaElement = document.querySelector(
							'div[contenteditable="true"]',
						) as HTMLElement
					}

					if (textareaElement) {
						if (textareaElement.tagName === "TEXTAREA") {
							const currentContent = (textareaElement as HTMLTextAreaElement)
								.value
							;(textareaElement as HTMLTextAreaElement).value =
								`${currentContent}\n\nSupermemories: ${response.data}`
						} else {
							const currentContent = textareaElement.innerHTML
							textareaElement.innerHTML = `${currentContent}<br>Supermemories: ${response.data}`
						}

						textareaElement.dispatchEvent(new Event("input", { bubbles: true }))
					} else {
						console.log("Could not find T3 input area")
					}
				} else {
					console.log(
						"Failed to get memories:",
						response.error || "Unknown error",
					)
				}
			} catch (error) {
				console.error("Error getting related memories for T3:", error)
			}
		}


		document.addEventListener("keydown", async (event) => {
			if (
				(event.ctrlKey || event.metaKey) &&
				event.shiftKey &&
				event.key === "m"
			) {
				event.preventDefault()
				await saveMemory()
			}
		})

		window.addEventListener("message", (event) => {
			if (event.source !== window) {
				return
			}
			const bearerToken = event.data.token
			const userData = event.data.userData
			if (bearerToken && userData) {
				if (
					!(
						window.location.hostname === "localhost" ||
						window.location.hostname === "supermemory.ai" ||
						window.location.hostname === "app.supermemory.ai"
					)
				) {
					console.log(
						"Bearer token and user data is only allowed to be used on localhost or supermemory.ai",
					)
					return
				}

				chrome.storage.local.set(
					{
						[STORAGE_KEYS.BEARER_TOKEN]: bearerToken,
						[STORAGE_KEYS.USER_DATA]: userData,
					},
					() => {},
				)
			}
		})
	},
})
