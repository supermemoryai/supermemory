import {
	DOMAINS,
	ELEMENT_IDS,
	MESSAGE_TYPES,
	POSTHOG_EVENT_KEY,
	UI_CONFIG,
} from "../../utils/constants"
import {
	autoSearchEnabled,
	autoCapturePromptsEnabled,
} from "../../utils/storage"
import {
	createChatGPTInputBarElement,
	DOMUtils,
} from "../../utils/ui-components"

let chatGPTDebounceTimeout: NodeJS.Timeout | null = null
let chatGPTRouteObserver: MutationObserver | null = null
let chatGPTUrlCheckInterval: NodeJS.Timeout | null = null
let chatGPTObserverThrottle: NodeJS.Timeout | null = null

export function initializeChatGPT() {
	if (!DOMUtils.isOnDomain(DOMAINS.CHATGPT)) {
		return
	}

	if (document.body.hasAttribute("data-chatgpt-initialized")) {
		return
	}

	setTimeout(() => {
		addSupermemoryButtonToMemoriesDialog()
		addSaveChatGPTElementBeforeComposerBtn()
		setupChatGPTAutoFetch()
	}, 2000)

	setupChatGPTPromptCapture()

	setupChatGPTRouteChangeDetection()

	document.body.setAttribute("data-chatgpt-initialized", "true")
}

function setupChatGPTRouteChangeDetection() {
	if (chatGPTRouteObserver) {
		chatGPTRouteObserver.disconnect()
	}
	if (chatGPTUrlCheckInterval) {
		clearInterval(chatGPTUrlCheckInterval)
	}
	if (chatGPTObserverThrottle) {
		clearTimeout(chatGPTObserverThrottle)
		chatGPTObserverThrottle = null
	}

	let currentUrl = window.location.href

	const checkForRouteChange = () => {
		if (window.location.href !== currentUrl) {
			currentUrl = window.location.href
			console.log("ChatGPT route changed, re-adding supermemory elements")
			setTimeout(() => {
				addSupermemoryButtonToMemoriesDialog()
				addSaveChatGPTElementBeforeComposerBtn()
				setupChatGPTAutoFetch()
			}, 1000)
		}
	}

	chatGPTUrlCheckInterval = setInterval(checkForRouteChange, 2000)

	chatGPTRouteObserver = new MutationObserver((mutations) => {
		if (chatGPTObserverThrottle) {
			return
		}

		let shouldRecheck = false
		mutations.forEach((mutation) => {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = node as Element
						if (
							element.querySelector?.("#prompt-textarea") ||
							element.querySelector?.("button.composer-btn") ||
							element.querySelector?.('[role="dialog"]') ||
							element.matches?.("#prompt-textarea") ||
							element.id === "prompt-textarea"
						) {
							shouldRecheck = true
						}
					}
				})
			}
		})

		if (shouldRecheck) {
			chatGPTObserverThrottle = setTimeout(() => {
				try {
					chatGPTObserverThrottle = null
					addSupermemoryButtonToMemoriesDialog()
					addSaveChatGPTElementBeforeComposerBtn()
					setupChatGPTAutoFetch()
				} catch (error) {
					console.error("Error in ChatGPT observer callback:", error)
				}
			}, 300)
		}
	})

	try {
		chatGPTRouteObserver.observe(document.body, {
			childList: true,
			subtree: true,
		})
	} catch (error) {
		console.error("Failed to set up ChatGPT route observer:", error)
		if (chatGPTUrlCheckInterval) {
			clearInterval(chatGPTUrlCheckInterval)
		}
		chatGPTUrlCheckInterval = setInterval(checkForRouteChange, 1000)
	}
}

async function getRelatedMemoriesForChatGPT(actionSource: string) {
	try {
		const userQuery =
			document.getElementById("prompt-textarea")?.textContent || ""

		const icon = document.querySelectorAll(
			'[id*="sm-chatgpt-input-bar-element-before-composer"]',
		)[0]

		const iconElement = icon as HTMLElement

		if (!iconElement) {
			console.warn("ChatGPT icon element not found, cannot update feedback")
			return
		}

		updateChatGPTIconFeedback("Searching memories...", iconElement)

		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error("Memory search timeout")),
				UI_CONFIG.API_REQUEST_TIMEOUT,
			),
		)

		const response = await Promise.race([
			browser.runtime.sendMessage({
				action: MESSAGE_TYPES.GET_RELATED_MEMORIES,
				data: userQuery,
				actionSource: actionSource,
			}),
			timeoutPromise,
		])

		if (response?.success && response?.data) {
			const promptElement = document.getElementById("prompt-textarea")
			if (promptElement) {
				promptElement.dataset.supermemories = `<div>Supermemories of user (only for the reference): ${response.data}</div>`
				console.log(
					"Prompt element dataset:",
					promptElement.dataset.supermemories,
				)

				iconElement.dataset.memoriesData = response.data

				updateChatGPTIconFeedback("Included Memories", iconElement)
			} else {
				console.warn(
					"ChatGPT prompt element not found after successful memory fetch",
				)
				updateChatGPTIconFeedback("Memories found", iconElement)
			}
		} else {
			console.warn("No memories found or API response invalid")
			updateChatGPTIconFeedback("No memories found", iconElement)
		}
	} catch (error) {
		console.error("Error getting related memories:", error)
		try {
			const icon = document.querySelectorAll(
				'[id*="sm-chatgpt-input-bar-element-before-composer"]',
			)[0] as HTMLElement
			if (icon) {
				updateChatGPTIconFeedback("Error fetching memories", icon)
			}
		} catch (feedbackError) {
			console.error("Failed to update error feedback:", feedbackError)
		}
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

		const memoriesTable = document.querySelector('[role="dialog"] table tbody')
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

function updateChatGPTIconFeedback(
	message: string,
	iconElement: HTMLElement,
	resetAfter = 0,
) {
	if (!iconElement.dataset.originalHtml) {
		iconElement.dataset.originalHtml = iconElement.innerHTML
	}

	const feedbackDiv = document.createElement("div")
	feedbackDiv.style.cssText = `
		display: flex; 
		align-items: center; 
		gap: 6px; 
		padding: 4px 8px; 
		background: #513EA9; 
		border-radius: 12px; 
		color: white; 
		font-size: 12px; 
		font-weight: 500;
		cursor: ${message === "Included Memories" ? "pointer" : "default"};
		position: relative;
	`

	feedbackDiv.innerHTML = `
		<span>✓</span>
		<span>${message}</span>
	`

	if (message === "Included Memories" && iconElement.dataset.memoriesData) {
		const popup = document.createElement("div")
		popup.style.cssText = `
			position: fixed;
			bottom: 80px;
			left: 50%;
			transform: translateX(-50%);
			background: #1a1a1a;
			color: white;
			padding: 0;
			border-radius: 12px;
			font-size: 13px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			max-width: 500px;
			max-height: 400px;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
			z-index: 999999;
			display: none;
			border: 1px solid #333;
		`

		const header = document.createElement("div")
		header.style.cssText = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 8px;
			border-bottom: 1px solid #333;
			opacity: 0.8;
		`
		header.innerHTML = `
			<span style="font-weight: 600; color: #fff;">Included Memories</span>
		`

		const content = document.createElement("div")
		content.style.cssText = `
			padding: 0;
			max-height: 300px;
			overflow-y: auto;
		`

		const memoriesText = iconElement.dataset.memoriesData || ""
		console.log("Memories text:", memoriesText)
		const individualMemories = memoriesText
			.split(/[,\n]/)
			.map((memory) => memory.trim())
			.filter((memory) => memory.length > 0 && memory !== ",")
		console.log("Individual memories:", individualMemories)

		individualMemories.forEach((memory, index) => {
			const memoryItem = document.createElement("div")
			memoryItem.style.cssText = `
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 10px;
				font-size: 13px;
				line-height: 1.4;
			`

			const memoryText = document.createElement("div")
			memoryText.style.cssText = `
				flex: 1;
				color: #e5e5e5;
			`
			memoryText.textContent = memory.trim()

			const removeBtn = document.createElement("button")
			removeBtn.style.cssText = `
				background: transparent;
				color: #9ca3af;
				border: none;
				padding: 4px;
				border-radius: 4px;
				cursor: pointer;
				flex-shrink: 0;
				height: fit-content;
				display: flex;
				align-items: center;
				justify-content: center;
			`
			removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`
			removeBtn.dataset.memoryIndex = index.toString()

			removeBtn.addEventListener("mouseenter", () => {
				removeBtn.style.color = "#ef4444"
			})
			removeBtn.addEventListener("mouseleave", () => {
				removeBtn.style.color = "#9ca3af"
			})

			memoryItem.appendChild(memoryText)
			memoryItem.appendChild(removeBtn)
			content.appendChild(memoryItem)
		})

		popup.appendChild(header)
		popup.appendChild(content)
		document.body.appendChild(popup)

		feedbackDiv.addEventListener("mouseenter", () => {
			const textSpan = feedbackDiv.querySelector("span:last-child")
			if (textSpan) {
				textSpan.textContent = "Click to see memories"
			}
		})

		feedbackDiv.addEventListener("mouseleave", () => {
			const textSpan = feedbackDiv.querySelector("span:last-child")
			if (textSpan) {
				textSpan.textContent = "Included Memories"
			}
		})

		feedbackDiv.addEventListener("click", (e) => {
			e.stopPropagation()
			popup.style.display = "block"
		})

		document.addEventListener("click", (e) => {
			if (!popup.contains(e.target as Node)) {
				popup.style.display = "none"
			}
		})

		content.querySelectorAll("button[data-memory-index]").forEach((button) => {
			const htmlButton = button as HTMLButtonElement
			htmlButton.addEventListener("click", () => {
				const index = Number.parseInt(htmlButton.dataset.memoryIndex || "0", 10)
				const memoryItem = htmlButton.parentElement

				if (memoryItem) {
					content.removeChild(memoryItem)
				}

				const currentMemories = (iconElement.dataset.memoriesData || "")
					.split(/[,\n]/)
					.map((memory) => memory.trim())
					.filter((memory) => memory.length > 0 && memory !== ",")
				currentMemories.splice(index, 1)

				const updatedMemories = currentMemories.join(" ,")

				iconElement.dataset.memoriesData = updatedMemories

				const promptElement = document.getElementById("prompt-textarea")
				if (promptElement) {
					promptElement.dataset.supermemories = `<div>Supermemories of user (only for the reference): ${updatedMemories}</div>`
				}

				content
					.querySelectorAll("button[data-memory-index]")
					.forEach((btn, newIndex) => {
						const htmlBtn = btn as HTMLButtonElement
						htmlBtn.dataset.memoryIndex = newIndex.toString()
					})

				if (currentMemories.length <= 1) {
					if (promptElement?.dataset.supermemories) {
						delete promptElement.dataset.supermemories
						delete iconElement.dataset.memoriesData
						iconElement.innerHTML = iconElement.dataset.originalHtml || ""
						delete iconElement.dataset.originalHtml
					}
					popup.style.display = "none"
					if (document.body.contains(popup)) {
						document.body.removeChild(popup)
					}
				}
			})
		})

		setTimeout(() => {
			if (document.body.contains(popup)) {
				document.body.removeChild(popup)
			}
		}, 300000)
	}

	iconElement.innerHTML = ""
	iconElement.appendChild(feedbackDiv)

	if (resetAfter > 0) {
		setTimeout(() => {
			iconElement.innerHTML = iconElement.dataset.originalHtml || ""
			delete iconElement.dataset.originalHtml
		}, resetAfter)
	}
}

function addSaveChatGPTElementBeforeComposerBtn() {
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
			await getRelatedMemoriesForChatGPT(
				POSTHOG_EVENT_KEY.CHATGPT_CHAT_MEMORIES_SEARCHED,
			)
		})

		saveChatGPTElement.id = `${ELEMENT_IDS.CHATGPT_INPUT_BAR_ELEMENT}-before-composer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

		button.setAttribute("data-supermemory-icon-added-before", "true")

		grandParent.insertBefore(saveChatGPTElement, parent)

		setupChatGPTAutoFetch()
	})
}

async function setupChatGPTAutoFetch() {
	const autoSearch = (await autoSearchEnabled.getValue()) ?? false

	if (!autoSearch) {
		return
	}

	const promptTextarea = document.getElementById("prompt-textarea")
	if (
		!promptTextarea ||
		promptTextarea.hasAttribute("data-supermemory-auto-fetch")
	) {
		return
	}

	promptTextarea.setAttribute("data-supermemory-auto-fetch", "true")

	const handleInput = () => {
		if (chatGPTDebounceTimeout) {
			clearTimeout(chatGPTDebounceTimeout)
		}

		chatGPTDebounceTimeout = setTimeout(async () => {
			const content = promptTextarea.textContent?.trim() || ""

			if (content.length > 2) {
				await getRelatedMemoriesForChatGPT(
					POSTHOG_EVENT_KEY.CHATGPT_CHAT_MEMORIES_AUTO_SEARCHED,
				)
			} else if (content.length === 0) {
				const icons = document.querySelectorAll(
					'[id*="sm-chatgpt-input-bar-element-before-composer"]',
				)

				icons.forEach((icon) => {
					const iconElement = icon as HTMLElement
					if (iconElement.dataset.originalHtml) {
						iconElement.innerHTML = iconElement.dataset.originalHtml
						delete iconElement.dataset.originalHtml
						delete iconElement.dataset.memoriesData
					}
				})

				if (promptTextarea.dataset.supermemories) {
					delete promptTextarea.dataset.supermemories
				}
			}
		}, UI_CONFIG.AUTO_SEARCH_DEBOUNCE_DELAY)
	}

	promptTextarea.addEventListener("input", handleInput)
}

function setupChatGPTPromptCapture() {
	if (document.body.hasAttribute("data-chatgpt-prompt-capture-setup")) {
		return
	}
	document.body.setAttribute("data-chatgpt-prompt-capture-setup", "true")

	const capturePromptContent = async (source: string) => {
		const autoCapture = (await autoCapturePromptsEnabled.getValue()) ?? false

		if (!autoCapture) {
			console.log("Auto capture prompts is disabled, skipping prompt capture")
			return
		}
		const promptTextarea = document.getElementById("prompt-textarea")

		let promptContent = ""
		if (promptTextarea) {
			promptContent = promptTextarea.textContent || ""
		}

		const storedMemories = promptTextarea?.dataset.supermemories
		if (
			storedMemories &&
			promptTextarea &&
			!promptContent.includes("Supermemories of user")
		) {
			promptTextarea.innerHTML = `${promptTextarea.innerHTML} ${storedMemories}`
			promptContent = promptTextarea.textContent || ""
		}

		if (promptTextarea && promptContent.trim()) {
			console.log(`ChatGPT prompt submitted via ${source}:`, promptContent)

			try {
				await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.CAPTURE_PROMPT,
					data: {
						prompt: promptContent,
						platform: "chatgpt",
						source: source,
					},
				})
			} catch (error) {
				console.error("Error sending ChatGPT prompt to background:", error)
			}
		}

		const icons = document.querySelectorAll(
			'[id*="sm-chatgpt-input-bar-element-before-composer"]',
		)

		icons.forEach((icon) => {
			const iconElement = icon as HTMLElement
			if (iconElement.dataset.originalHtml) {
				iconElement.innerHTML = iconElement.dataset.originalHtml
				delete iconElement.dataset.originalHtml
				delete iconElement.dataset.memoriesData
			}
		})

		if (promptTextarea?.dataset.supermemories) {
			delete promptTextarea.dataset.supermemories
		}
	}

	document.addEventListener(
		"click",
		async (event) => {
			const target = event.target as HTMLElement
			if (
				target.id === "composer-submit-button" ||
				target.closest("#composer-submit-button")
			) {
				await capturePromptContent("button click")
			}
		},
		true,
	)

	document.addEventListener(
		"keydown",
		async (event) => {
			const target = event.target as HTMLElement

			if (
				target.id === "prompt-textarea" &&
				event.key === "Enter" &&
				!event.shiftKey
			) {
				await capturePromptContent("Enter key")
			}
		},
		true,
	)
}
