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
import {
	acceptMemorySuggestion,
	clearMemorySuggestion,
	hasAcceptedSupermemoryContext,
	setMemoryMarkerStatus,
	showLoadingSuggestion,
	showMarkerPopover,
	showMemorySuggestion,
	syncAcceptedSupermemoryState,
} from "./memory-suggestion"

let chatGPTDebounceTimeout: NodeJS.Timeout | null = null
let chatGPTRouteObserver: MutationObserver | null = null
let chatGPTUrlCheckInterval: NodeJS.Timeout | null = null
let chatGPTObserverThrottle: NodeJS.Timeout | null = null
const CHATGPT_DEBUG = true
const CHATGPT_LOG_PREFIX = "[supermemory:chatgpt]"

export function initializeChatGPT() {
	debugChatGPT("initializeChatGPT called", {
		host: window.location.hostname,
		href: window.location.href,
	})

	if (!DOMUtils.isOnDomain(DOMAINS.CHATGPT)) {
		debugChatGPT("not on ChatGPT domain, skipping")
		return
	}

	if (document.body.hasAttribute("data-chatgpt-initialized")) {
		debugChatGPT("already initialized")
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
	debugChatGPT("initialized listeners")
}

function debugChatGPT(message: string, data?: unknown) {
	if (!CHATGPT_DEBUG) return

	if (data === undefined) {
		console.log(CHATGPT_LOG_PREFIX, message)
		return
	}

	console.log(CHATGPT_LOG_PREFIX, message, data)
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
			debugChatGPT("route changed, re-adding supermemory elements", currentUrl)
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
							element.querySelector?.("button") ||
							element.querySelector?.('[role="dialog"]') ||
							element.matches?.("#prompt-textarea") ||
							element.matches?.("button") ||
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
					debugChatGPT("DOM changed near composer, rechecking UI")
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
		const isAutoSearch =
			actionSource === POSTHOG_EVENT_KEY.CHATGPT_CHAT_MEMORIES_AUTO_SEARCHED
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

		if (isAutoSearch) {
			const promptElement = document.getElementById("prompt-textarea")
			if (promptElement) {
				showLoadingSuggestion("chatgpt", promptElement)
			}
			setMemoryMarkerStatus(iconElement, "searching")
		} else {
			updateChatGPTIconFeedback("Searching memories...", iconElement)
		}

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
				const memoryText = showMemorySuggestion(
					"chatgpt",
					promptElement,
					response.data,
				)
				console.log(
					"Prompt element dataset:",
					memoryText,
				)

				iconElement.dataset.memoriesData = String(response.data)

				if (isAutoSearch) {
					setMemoryMarkerStatus(iconElement, "found")
				} else {
					updateChatGPTIconFeedback("Included Memories", iconElement)
				}
			} else {
				console.warn(
					"ChatGPT prompt element not found after successful memory fetch",
				)
				if (isAutoSearch) {
					setMemoryMarkerStatus(iconElement, "found")
				} else {
					updateChatGPTIconFeedback("Memories found", iconElement)
				}
			}
		} else {
			console.warn("No memories found or API response invalid")
			if (isAutoSearch) {
				setMemoryMarkerStatus(iconElement, "none")
			} else {
				updateChatGPTIconFeedback("No memories found", iconElement)
			}
		}
	} catch (error) {
		console.error("Error getting related memories:", error)
		try {
			const icon = document.querySelectorAll(
				'[id*="sm-chatgpt-input-bar-element-before-composer"]',
			)[0] as HTMLElement
			if (icon) {
				if (
					actionSource === POSTHOG_EVENT_KEY.CHATGPT_CHAT_MEMORIES_AUTO_SEARCHED
				) {
					setMemoryMarkerStatus(icon, "error")
				} else {
					updateChatGPTIconFeedback("Error fetching memories", icon)
				}
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
		".flex.items-center.gap-0\\.5",
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

		if (!memoriesTable.textContent) {
			DOMUtils.showToast("error")
			return
		}

		const combinedContent = `Memories from ChatGPT:\n\n${memoriesTable.textContent}`

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
	const memories = iconElement.dataset.memoriesData
	const fallbackReset =
		resetAfter || (message === "Included Memories" ? 0 : 2200)

	if (message === "Included Memories" || message === "Memories found") {
		setMemoryMarkerStatus(iconElement, "found")
		showMarkerPopover(iconElement, "Included Memories", memories)
		return
	}

	if (message.toLowerCase().includes("searching")) {
		setMemoryMarkerStatus(iconElement, "searching")
		showMarkerPopover(iconElement, message)
		return
	}

	setMemoryMarkerStatus(
		iconElement,
		message.toLowerCase().includes("error") ? "error" : "none",
	)
	showMarkerPopover(iconElement, message, undefined, fallbackReset)
	return

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
					promptElement.dataset.supermemories = `\n\nSupermemories of user (only for the reference): ${updatedMemories}`
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
	const promptInput = getChatGPTPromptInput()
	if (!promptInput) {
		debugChatGPT("prompt input not found", getChatGPTDomSnapshot())
		return
	}

	const composer = findChatGPTComposerRoot(promptInput)
	if (!composer?.querySelector) {
		debugChatGPT("composer root not found", describeElement(promptInput))
		return
	}

	const existingMarkers = Array.from(
		document.querySelectorAll(
			`[id*="${ELEMENT_IDS.CHATGPT_INPUT_BAR_ELEMENT}-before-composer"]`,
		),
	)
	if (existingMarkers.length > 1) {
		debugChatGPT("removed duplicate markers", existingMarkers.length)
		existingMarkers.forEach((marker) => marker.remove())
	} else if (existingMarkers.length === 1) {
		debugChatGPT("marker already exists")
		return
	}

	const buttons = findChatGPTComposerButtons(promptInput, composer)
	debugChatGPT("candidate ChatGPT buttons", {
		input: describeElement(promptInput),
		composer: describeElement(composer),
		buttons: buttons.map((button) => ({
			label: buttonLabel(button),
			element: describeElement(button),
		})),
	})

	const micButton = buttons.find((button) => isChatGPTMicButton(button))
	const voiceButton = buttons.find((button) => isChatGPTVoiceButton(button))
	const sendButton = buttons.find((button) => isChatGPTSendButton(button))
	const anchorButton = micButton || voiceButton || sendButton || buttons[buttons.length - 1]
	const anchorSlot = findChatGPTButtonSlot(anchorButton, composer)
	const speechContainer = composer.querySelector(
		'[data-testid="composer-speech-button-container"]',
	) as HTMLElement | null
	const targetContainer =
		anchorSlot?.parentElement ||
		speechContainer?.parentElement ||
		promptInput.parentElement

	if (!targetContainer) {
		debugChatGPT("could not find insertion target", {
			anchor: anchorButton ? describeElement(anchorButton) : null,
			input: describeElement(promptInput),
		})
		return
	}

	const saveChatGPTElement = createChatGPTInputBarElement(async () => {
		await getRelatedMemoriesForChatGPT(
			POSTHOG_EVENT_KEY.CHATGPT_CHAT_MEMORIES_SEARCHED,
		)
	})

	saveChatGPTElement.id = `${ELEMENT_IDS.CHATGPT_INPUT_BAR_ELEMENT}-before-composer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

	if (anchorSlot?.parentElement === targetContainer) {
		targetContainer.insertBefore(saveChatGPTElement, anchorSlot)
		debugChatGPT("inserted marker before anchor button", {
			anchorLabel: anchorButton ? buttonLabel(anchorButton) : null,
			anchorSlot: describeElement(anchorSlot),
			target: describeElement(targetContainer),
		})
	} else {
		targetContainer.appendChild(saveChatGPTElement)
		debugChatGPT("inserted marker into fallback target", {
			target: describeElement(targetContainer),
		})
	}

	setupChatGPTAutoFetch()
}

function getChatGPTPromptInput(): HTMLElement | null {
	return document.querySelector(
		'#prompt-textarea, [data-testid="prompt-textarea"], div[contenteditable="true"]',
	) as HTMLElement | null
}

function findChatGPTComposerRoot(input: HTMLElement): HTMLElement {
	const form = input.closest("form") as HTMLElement | null
	if (form) return form

	let current: HTMLElement | null = input
	for (let depth = 0; current && depth < 8; depth += 1) {
		if (current.querySelectorAll("button").length >= 2) {
			return current
		}
		current = current.parentElement
	}

	return input.parentElement || document.body
}

function findChatGPTComposerButtons(
	input: HTMLElement,
	composer: HTMLElement,
): HTMLButtonElement[] {
	const composerButtons = Array.from(composer.querySelectorAll("button"))
	if (composerButtons.length > 0) {
		return composerButtons
	}

	const inputRect = input.getBoundingClientRect()
	const allButtons = Array.from(document.querySelectorAll("button"))

	return allButtons.filter((button) => {
		const rect = button.getBoundingClientRect()
		const verticallyNear =
			Math.abs(rect.top + rect.height / 2 - (inputRect.top + inputRect.height / 2)) <
			120
		const horizontallyNear =
			rect.left > inputRect.left - 80 && rect.left < inputRect.right + 260

		return verticallyNear && horizontallyNear
	})
}

function buttonLabel(button: HTMLButtonElement): string {
	return [
		button.id,
		button.getAttribute("aria-label"),
		button.getAttribute("title"),
		button.getAttribute("data-testid"),
		button.getAttribute("data-test-id"),
		button.textContent,
	]
		.filter(Boolean)
		.join(" ")
}

function isChatGPTMicButton(button: HTMLButtonElement): boolean {
	return /mic|microphone|dictate/i.test(buttonLabel(button))
}

function isChatGPTVoiceButton(button: HTMLButtonElement): boolean {
	return /voice|audio|speech/i.test(buttonLabel(button))
}

function isChatGPTSendButton(button: HTMLButtonElement): boolean {
	const label = buttonLabel(button)
	return /composer-submit-button|send|submit/i.test(label)
}

function findChatGPTButtonSlot(
	button: HTMLButtonElement | undefined,
	composer: HTMLElement,
): HTMLElement | null {
	if (!button) return null

	let current: HTMLElement | null = button
	while (current?.parentElement && current.parentElement !== composer) {
		const parent: HTMLElement = current.parentElement
		const parentStyle = window.getComputedStyle(parent)
		const hasSiblingControls = parent.children.length > 1
		const isRow =
			parentStyle.display.includes("flex") &&
			parentStyle.flexDirection !== "column"

		if (hasSiblingControls && isRow) {
			return current
		}

		current = parent
	}

	return current || button
}

function describeElement(element: Element | null): string | null {
	if (!element) return null

	const parts = [element.tagName.toLowerCase()]
	if (element.id) parts.push(`#${element.id}`)
	if (element.className && typeof element.className === "string") {
		parts.push(
			`.${element.className
				.trim()
				.split(/\s+/)
				.slice(0, 4)
				.join(".")}`,
		)
	}

	for (const attr of ["aria-label", "data-testid", "data-test-id", "role"]) {
		const value = element.getAttribute(attr)
		if (value) parts.push(`[${attr}="${value}"]`)
	}

	return parts.join("")
}

function getChatGPTDomSnapshot() {
	return {
		promptTextareas: document.querySelectorAll("#prompt-textarea").length,
		contenteditables: document.querySelectorAll('[contenteditable="true"]')
			.length,
		textareas: document.querySelectorAll("textarea").length,
		buttons: document.querySelectorAll("button").length,
		composerButtons: document.querySelectorAll("button.composer-btn").length,
		speechContainers: document.querySelectorAll(
			'[data-testid="composer-speech-button-container"]',
		).length,
	}
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
		const content = promptTextarea.textContent?.trim() || ""
		syncAcceptedSupermemoryState(promptTextarea)

		if (content.length === 0) {
			clearMemorySuggestion("chatgpt", promptTextarea)
			document
				.querySelectorAll('[id*="sm-chatgpt-input-bar-element-before-composer"]')
				.forEach((icon) => {
					setMemoryMarkerStatus(icon as HTMLElement, "neutral")
				})
		}

		if (chatGPTDebounceTimeout) {
			clearTimeout(chatGPTDebounceTimeout)
		}

		chatGPTDebounceTimeout = setTimeout(async () => {
			if (hasAcceptedSupermemoryContext(promptTextarea)) {
				clearMemorySuggestion("chatgpt", promptTextarea)
				return
			}

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
					setMemoryMarkerStatus(iconElement, "neutral")
					if (iconElement.dataset.originalHtml) {
						iconElement.innerHTML = iconElement.dataset.originalHtml
						delete iconElement.dataset.originalHtml
						delete iconElement.dataset.memoriesData
					}
				})

				if (promptTextarea.dataset.supermemories) {
					clearMemorySuggestion("chatgpt", promptTextarea)
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
			clearMemorySuggestion("chatgpt", promptTextarea)
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
				(target.id === "prompt-textarea" ||
					target.closest("#prompt-textarea")) &&
				acceptMemorySuggestion(
					event,
					"chatgpt",
					document.getElementById("prompt-textarea"),
				)
			) {
				return
			}

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
