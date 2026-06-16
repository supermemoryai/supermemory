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
	createClaudeInputBarElement,
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

let claudeDebounceTimeout: NodeJS.Timeout | null = null
let claudeRouteObserver: MutationObserver | null = null
let claudeUrlCheckInterval: NodeJS.Timeout | null = null
let claudeObserverThrottle: NodeJS.Timeout | null = null
const CLAUDE_DEBUG = true
const CLAUDE_LOG_PREFIX = "[supermemory:claude]"

export function initializeClaude() {
	debugClaude("initializeClaude called", {
		host: window.location.hostname,
		href: window.location.href,
	})

	if (!DOMUtils.isOnDomain(DOMAINS.CLAUDE)) {
		debugClaude("not on Claude domain, skipping")
		return
	}

	if (document.body.hasAttribute("data-claude-initialized")) {
		debugClaude("already initialized")
		return
	}

	setTimeout(() => {
		addSupermemoryIconToClaudeInput()
		setupClaudeAutoFetch()
	}, 2000)

	setupClaudePromptCapture()

	setupClaudeRouteChangeDetection()

	document.body.setAttribute("data-claude-initialized", "true")
	debugClaude("initialized listeners")
}

function debugClaude(message: string, data?: unknown) {
	if (!CLAUDE_DEBUG) return

	if (data === undefined) {
		console.log(CLAUDE_LOG_PREFIX, message)
		return
	}

	console.log(CLAUDE_LOG_PREFIX, message, data)
}

function setupClaudeRouteChangeDetection() {
	if (claudeRouteObserver) {
		claudeRouteObserver.disconnect()
	}
	if (claudeUrlCheckInterval) {
		clearInterval(claudeUrlCheckInterval)
	}
	if (claudeObserverThrottle) {
		clearTimeout(claudeObserverThrottle)
		claudeObserverThrottle = null
	}

	let currentUrl = window.location.href

	const checkForRouteChange = () => {
		if (window.location.href !== currentUrl) {
			currentUrl = window.location.href
			debugClaude("route changed, re-adding supermemory icon", currentUrl)
			setTimeout(() => {
				addSupermemoryIconToClaudeInput()
				setupClaudeAutoFetch()
			}, 1000)
		}
	}

	claudeUrlCheckInterval = setInterval(checkForRouteChange, 2000)

	claudeRouteObserver = new MutationObserver((mutations) => {
		if (claudeObserverThrottle) {
			return
		}

		let shouldRecheck = false
		mutations.forEach((mutation) => {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = node as Element
						if (
							element.querySelector?.('div[contenteditable="true"]') ||
							element.querySelector?.("textarea") ||
							element.querySelector?.("button") ||
							element.matches?.('div[contenteditable="true"]') ||
							element.matches?.("textarea") ||
							element.matches?.("button")
						) {
							shouldRecheck = true
						}
					}
				})
			}
		})

		if (shouldRecheck) {
			claudeObserverThrottle = setTimeout(() => {
				try {
					claudeObserverThrottle = null
					debugClaude("DOM changed near composer, rechecking UI")
					addSupermemoryIconToClaudeInput()
					setupClaudeAutoFetch()
				} catch (error) {
					console.error("Error in Claude observer callback:", error)
				}
			}, 300)
		}
	})

	try {
		claudeRouteObserver.observe(document.body, {
			childList: true,
			subtree: true,
		})
	} catch (error) {
		console.error("Failed to set up Claude route observer:", error)
		if (claudeUrlCheckInterval) {
			clearInterval(claudeUrlCheckInterval)
		}
		claudeUrlCheckInterval = setInterval(checkForRouteChange, 1000)
	}
}

function addSupermemoryIconToClaudeInput() {
	const input = getClaudePromptInput()
	if (!input) {
		debugClaude("prompt input not found", getClaudeDomSnapshot())
		return
	}

	const composer = findComposerRoot(input)
	if (!composer?.querySelector) {
		debugClaude("composer root not found", describeElement(input))
		return
	}

	const existingMarkers = Array.from(
		document.querySelectorAll(
			`[id*="${ELEMENT_IDS.CLAUDE_INPUT_BAR_ELEMENT}"]`,
		),
	)
	if (existingMarkers.length > 1) {
		debugClaude("removed duplicate markers", existingMarkers.length)
		for (const marker of existingMarkers) {
			marker.remove()
		}
	} else if (existingMarkers.length === 1) {
		debugClaude("marker already exists")
		return
	}

	const buttons = findClaudeComposerButtons(input, composer)
	debugClaude("candidate Claude buttons", {
		input: describeElement(input),
		composer: describeElement(composer),
		buttons: buttons.map((button) => ({
			label: buttonLabel(button),
			element: describeElement(button),
		})),
	})

	const micButton = buttons.find((button) => isClaudeMicButton(button))
	const voiceButton = buttons.find((button) => isClaudeVoiceButton(button))
	const sendButton = buttons.find((button) => isClaudeSendButton(button))
	const anchorButton =
		micButton || voiceButton || sendButton || buttons[buttons.length - 1]
	const anchorSlot = findClaudeButtonSlot(anchorButton, composer)
	const targetContainer = anchorSlot?.parentElement || input.parentElement

	if (!targetContainer) {
		debugClaude("could not find insertion target", {
			anchor: anchorButton ? describeElement(anchorButton) : null,
			input: describeElement(input),
		})
		return
	}

	const supermemoryIcon = createClaudeInputBarElement(async () => {
		await getRelatedMemoriesForClaude(
			POSTHOG_EVENT_KEY.CLAUDE_CHAT_MEMORIES_SEARCHED,
		)
	})

	supermemoryIcon.id = `${ELEMENT_IDS.CLAUDE_INPUT_BAR_ELEMENT}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

	if (anchorSlot?.parentElement === targetContainer) {
		targetContainer.insertBefore(supermemoryIcon, anchorSlot)
		debugClaude("inserted marker before anchor button", {
			anchorLabel: anchorButton ? buttonLabel(anchorButton) : null,
			anchorSlot: describeElement(anchorSlot),
			target: describeElement(targetContainer),
		})
		return
	}

	targetContainer.appendChild(supermemoryIcon)
	debugClaude("inserted marker into fallback target", {
		target: describeElement(targetContainer),
	})
}

function getClaudePromptInput(): HTMLElement | null {
	return document.querySelector(
		'.ProseMirror[contenteditable="true"], div[contenteditable="true"], textarea',
	) as HTMLElement | null
}

function findComposerRoot(input: HTMLElement): HTMLElement {
	return (
		(input.closest("form") as HTMLElement | null) ||
		(input.closest('[data-testid*="composer"]') as HTMLElement | null) ||
		(input.closest('[class*="composer"]') as HTMLElement | null) ||
		(input.closest(".relative") as HTMLElement | null) ||
		input.parentElement ||
		document.body
	)
}

function buttonLabel(button: HTMLButtonElement): string {
	return [
		button.getAttribute("aria-label"),
		button.getAttribute("title"),
		button.getAttribute("data-testid"),
		button.getAttribute("data-test-id"),
		button.textContent,
	]
		.filter(Boolean)
		.join(" ")
}

function findClaudeComposerButtons(
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
			Math.abs(
				rect.top + rect.height / 2 - (inputRect.top + inputRect.height / 2),
			) < 120
		const horizontallyNear =
			rect.left > inputRect.left - 80 && rect.left < inputRect.right + 260

		return verticallyNear && horizontallyNear
	})
}

function isClaudeMicButton(button: HTMLButtonElement): boolean {
	return /mic|microphone|dictate/i.test(buttonLabel(button))
}

function isClaudeVoiceButton(button: HTMLButtonElement): boolean {
	return /voice|audio|speech/i.test(buttonLabel(button))
}

function isClaudeSendButton(button: HTMLButtonElement): boolean {
	return /send|submit/i.test(buttonLabel(button))
}

function findClaudeButtonSlot(
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
			`.${element.className.trim().split(/\s+/).slice(0, 4).join(".")}`,
		)
	}

	for (const attr of ["aria-label", "data-testid", "data-test-id", "role"]) {
		const value = element.getAttribute(attr)
		if (value) parts.push(`[${attr}="${value}"]`)
	}

	return parts.join("")
}

function getClaudeDomSnapshot() {
	return {
		proseMirrors: document.querySelectorAll(".ProseMirror").length,
		contenteditables: document.querySelectorAll('[contenteditable="true"]')
			.length,
		textareas: document.querySelectorAll("textarea").length,
		buttons: document.querySelectorAll("button").length,
	}
}

async function getRelatedMemoriesForClaude(actionSource: string) {
	try {
		const isAutoSearch =
			actionSource === POSTHOG_EVENT_KEY.CLAUDE_CHAT_MEMORIES_AUTO_SEARCHED
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
			console.log("No query text found for Claude")
			return
		}

		const icon = document.querySelector('[id*="sm-claude-input-bar-element"]')

		const iconElement = icon as HTMLElement

		if (!iconElement) {
			console.warn("Claude icon element not found, cannot update feedback")
			return
		}

		if (isAutoSearch) {
			const input = getClaudePromptInput()
			if (input) {
				showLoadingSuggestion("claude", input)
			}
			setMemoryMarkerStatus(iconElement, "searching")
		} else {
			updateClaudeIconFeedback("Searching memories...", iconElement)
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

		console.log("Claude memories response:", response)

		if (response?.success && response?.data) {
			const textareaElement = document.querySelector(
				'div[contenteditable="true"]',
			) as HTMLElement

			if (textareaElement) {
				const memoryText = showMemorySuggestion(
					"claude",
					textareaElement,
					response.data,
				)
				console.log("Text element dataset:", memoryText)

				iconElement.dataset.memoriesData = String(response.data)

				if (isAutoSearch) {
					setMemoryMarkerStatus(iconElement, "found")
				} else {
					updateClaudeIconFeedback("Included Memories", iconElement)
				}
			} else {
				console.warn(
					"Claude input area not found after successful memory fetch",
				)
				if (isAutoSearch) {
					setMemoryMarkerStatus(iconElement, "found")
				} else {
					updateClaudeIconFeedback("Memories found", iconElement)
				}
			}
		} else {
			console.warn("No memories found or API response invalid for Claude")
			if (isAutoSearch) {
				setMemoryMarkerStatus(iconElement, "none")
			} else {
				updateClaudeIconFeedback("No memories found", iconElement)
			}
		}
	} catch (error) {
		console.error("Error getting related memories for Claude:", error)
		try {
			const icon = document.querySelector(
				'[id*="sm-claude-input-bar-element"]',
			) as HTMLElement
			if (icon) {
				if (
					actionSource === POSTHOG_EVENT_KEY.CLAUDE_CHAT_MEMORIES_AUTO_SEARCHED
				) {
					setMemoryMarkerStatus(icon, "error")
				} else {
					updateClaudeIconFeedback("Error fetching memories", icon)
				}
			}
		} catch (feedbackError) {
			console.error("Failed to update Claude error feedback:", feedbackError)
		}
	}
}

function updateClaudeIconFeedback(
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
}

function setupClaudePromptCapture() {
	if (document.body.hasAttribute("data-claude-prompt-capture-setup")) {
		return
	}
	document.body.setAttribute("data-claude-prompt-capture-setup", "true")
	const captureClaudePromptContent = async (source: string) => {
		const autoCapture = (await autoCapturePromptsEnabled.getValue()) ?? false

		if (!autoCapture) {
			console.log("Auto capture prompts is disabled, skipping prompt capture")
			return
		}
		let promptContent = ""

		const contentEditableDiv = document.querySelector(
			'div[contenteditable="true"]',
		) as HTMLElement
		if (contentEditableDiv) {
			promptContent =
				contentEditableDiv.textContent || contentEditableDiv.innerText || ""
		}

		if (!promptContent) {
			const textarea = document.querySelector("textarea") as HTMLTextAreaElement
			if (textarea) {
				promptContent = textarea.value || ""
			}
		}

		if (promptContent.trim()) {
			console.log(`Claude prompt submitted via ${source}:`, promptContent)

			try {
				await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.CAPTURE_PROMPT,
					data: {
						prompt: promptContent,
						platform: "claude",
						source: window.location.href,
					},
				})
			} catch (error) {
				console.error("Error sending Claude prompt to background:", error)
			}
		}

		const icons = document.querySelectorAll(
			'[id*="sm-claude-input-bar-element"]',
		)

		icons.forEach((icon) => {
			const iconElement = icon as HTMLElement
			if (iconElement.dataset.originalHtml) {
				iconElement.innerHTML = iconElement.dataset.originalHtml
				delete iconElement.dataset.originalHtml
				delete iconElement.dataset.memoriesData
			}
		})

		if (contentEditableDiv?.dataset.supermemories) {
			clearMemorySuggestion("claude", contentEditableDiv)
		}
	}

	document.addEventListener(
		"click",
		async (event) => {
			const target = event.target as HTMLElement
			if (target.closest('[data-supermemory-connected-indicator="true"]')) {
				return
			}

			const sendButton = target.closest("button")

			if (
				sendButton &&
				buttonLabel(sendButton as HTMLButtonElement).match(/send|submit/i)
			) {
				await captureClaudePromptContent("button click")
			}
		},
		true,
	)

	document.addEventListener(
		"keydown",
		async (event) => {
			const target = event.target as HTMLElement

			const activeInput =
				(target.closest('div[contenteditable="true"]') as HTMLElement | null) ||
				(target.matches("textarea") ? (target as HTMLTextAreaElement) : null)
			if (acceptMemorySuggestion(event, "claude", activeInput)) {
				return
			}

			if (
				(target.matches('div[contenteditable="true"]') ||
					target.matches(".ProseMirror") ||
					target.matches("textarea") ||
					target.closest('div[contenteditable="true"]') ||
					target.closest(".ProseMirror")) &&
				event.key === "Enter" &&
				!event.shiftKey
			) {
				await captureClaudePromptContent("Enter key")
			}
		},
		true,
	)
}

async function setupClaudeAutoFetch() {
	const autoSearch = (await autoSearchEnabled.getValue()) ?? false
	if (!autoSearch) {
		return
	}

	const textareaElement = document.querySelector(
		'div[contenteditable="true"]',
	) as HTMLElement

	if (
		!textareaElement ||
		textareaElement.hasAttribute("data-supermemory-auto-fetch")
	) {
		return
	}

	textareaElement.setAttribute("data-supermemory-auto-fetch", "true")

	const handleInput = () => {
		const content = textareaElement.textContent?.trim() || ""
		syncAcceptedSupermemoryState(textareaElement)

		if (content.length === 0) {
			clearMemorySuggestion("claude", textareaElement)
			document
				.querySelectorAll('[id*="sm-claude-input-bar-element"]')
				.forEach((icon) => {
					setMemoryMarkerStatus(icon as HTMLElement, "neutral")
				})
		}

		if (claudeDebounceTimeout) {
			clearTimeout(claudeDebounceTimeout)
		}

		claudeDebounceTimeout = setTimeout(async () => {
			if (hasAcceptedSupermemoryContext(textareaElement)) {
				clearMemorySuggestion("claude", textareaElement)
				return
			}

			if (content.length > 2) {
				await getRelatedMemoriesForClaude(
					POSTHOG_EVENT_KEY.CLAUDE_CHAT_MEMORIES_AUTO_SEARCHED,
				)
			} else if (content.length === 0) {
				const icons = document.querySelectorAll(
					'[id*="sm-claude-input-bar-element"]',
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

				if (textareaElement.dataset.supermemories) {
					clearMemorySuggestion("claude", textareaElement)
				}
			}
		}, UI_CONFIG.AUTO_SEARCH_DEBOUNCE_DELAY)
	}

	textareaElement.addEventListener("input", handleInput)
}
