import {
	DOMAINS,
	ELEMENT_IDS,
	MESSAGE_TYPES,
	POSTHOG_EVENT_KEY,
	UI_CONFIG,
} from "../../utils/constants"
import {
	autoCapturePromptsEnabled,
	autoSearchEnabled,
} from "../../utils/storage"
import {
	createGeminiInputBarElement,
	DOMUtils,
} from "../../utils/ui-components"
import {
	acceptMemorySuggestion,
	clearMemorySuggestion,
	hasAcceptedSupermemoryContext,
	serializeMemoriesForDataset,
	setMemoryMarkerStatus,
	showLoadingSuggestion,
	showMarkerPopover,
	showMemorySuggestion,
	syncAcceptedSupermemoryState,
} from "./memory-suggestion"

let geminiDebounceTimeout: NodeJS.Timeout | null = null
let geminiRouteObserver: MutationObserver | null = null
let geminiUrlCheckInterval: NodeJS.Timeout | null = null
let geminiObserverThrottle: NodeJS.Timeout | null = null
const GEMINI_DEBUG = false
const GEMINI_LOG_PREFIX = "[supermemory:gemini]"

type GeminiInput = HTMLElement | HTMLTextAreaElement

export function initializeGemini() {
	debugGemini("initializeGemini called", {
		host: window.location.hostname,
		href: window.location.href,
	})

	if (!DOMUtils.isOnDomain(DOMAINS.GEMINI)) {
		debugGemini("not on Gemini domain, skipping")
		return
	}

	if (document.body.hasAttribute("data-gemini-initialized")) {
		debugGemini("already initialized")
		return
	}

	setTimeout(() => {
		addSupermemoryIconToGeminiInput()
		setupGeminiAutoFetch()
	}, 2000)

	setupGeminiPromptCapture()
	setupGeminiRouteChangeDetection()

	document.body.setAttribute("data-gemini-initialized", "true")
	debugGemini("initialized listeners")
}

function debugGemini(message: string, data?: unknown) {
	if (!GEMINI_DEBUG) return

	if (data === undefined) {
		console.log(GEMINI_LOG_PREFIX, message)
		return
	}

	console.log(GEMINI_LOG_PREFIX, message, data)
}

function setupGeminiRouteChangeDetection() {
	if (geminiRouteObserver) {
		geminiRouteObserver.disconnect()
	}
	if (geminiUrlCheckInterval) {
		clearInterval(geminiUrlCheckInterval)
	}
	if (geminiObserverThrottle) {
		clearTimeout(geminiObserverThrottle)
		geminiObserverThrottle = null
	}

	let currentUrl = window.location.href

	const recheckGeminiUI = () => {
		addSupermemoryIconToGeminiInput()
		setupGeminiAutoFetch()
	}

	const checkForRouteChange = () => {
		if (window.location.href !== currentUrl) {
			currentUrl = window.location.href
			debugGemini("route changed, rechecking UI", currentUrl)
			setTimeout(recheckGeminiUI, 1000)
		}
	}

	geminiUrlCheckInterval = setInterval(checkForRouteChange, 2000)

	geminiRouteObserver = new MutationObserver((mutations) => {
		if (geminiObserverThrottle) {
			return
		}

		const shouldRecheck = mutations.some((mutation) =>
			Array.from(mutation.addedNodes).some((node) => {
				if (node.nodeType !== Node.ELEMENT_NODE) {
					return false
				}

				const element = node as Element
				return (
					element.matches?.("rich-textarea, textarea, button") ||
					element.matches?.('[contenteditable="true"]') ||
					!!element.querySelector?.(
						'rich-textarea, textarea, button, [contenteditable="true"]',
					)
				)
			}),
		)

		if (shouldRecheck) {
			geminiObserverThrottle = setTimeout(() => {
				geminiObserverThrottle = null
				debugGemini("DOM changed near Gemini composer, rechecking UI")
				recheckGeminiUI()
			}, 300)
		}
	})

	try {
		geminiRouteObserver.observe(document.body, {
			childList: true,
			subtree: true,
		})
	} catch (error) {
		console.error("Failed to set up Gemini route observer:", error)
		if (geminiUrlCheckInterval) {
			clearInterval(geminiUrlCheckInterval)
		}
		geminiUrlCheckInterval = setInterval(checkForRouteChange, 1000)
	}
}

function addSupermemoryIconToGeminiInput() {
	const input = getGeminiPromptInput()
	if (!input) {
		debugGemini("prompt input not found", getGeminiDomSnapshot())
		return
	}

	const composer = findGeminiComposerRoot(input)
	if (!composer?.querySelector) {
		debugGemini("composer root not found", describeElement(input))
		return
	}

	const existingMarkers = Array.from(
		document.querySelectorAll(
			`[id*="${ELEMENT_IDS.GEMINI_INPUT_BAR_ELEMENT}"]`,
		),
	)
	if (existingMarkers.length > 1) {
		debugGemini("removed duplicate markers", existingMarkers.length)
		for (const marker of existingMarkers) {
			marker.remove()
		}
	} else if (existingMarkers.length === 1) {
		debugGemini("marker already exists")
		return
	}

	const buttons = findGeminiComposerButtons(input, composer)
	debugGemini("candidate Gemini buttons", {
		input: describeElement(input),
		composer: describeElement(composer),
		buttons: buttons.map((button) => ({
			label: buttonLabel(button),
			element: describeElement(button),
		})),
	})

	const micButton = buttons.find((button) => isGeminiMicButton(button))
	const sendButton = buttons.find((button) => isGeminiSendButton(button))
	const anchorButton = micButton || sendButton || buttons[buttons.length - 1]
	const anchorSlot = findGeminiButtonSlot(anchorButton, composer)
	const targetContainer =
		anchorSlot?.parentElement ||
		(input.closest("rich-textarea") as HTMLElement | null)?.parentElement ||
		input.parentElement

	if (!targetContainer) {
		debugGemini("could not find insertion target", {
			anchor: anchorButton ? describeElement(anchorButton) : null,
			input: describeElement(input),
		})
		return
	}

	const supermemoryIcon = createGeminiInputBarElement(async () => {
		await getRelatedMemoriesForGemini(
			POSTHOG_EVENT_KEY.GEMINI_CHAT_MEMORIES_SEARCHED,
		)
	})

	supermemoryIcon.id = `${ELEMENT_IDS.GEMINI_INPUT_BAR_ELEMENT}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

	if (anchorSlot?.parentElement === targetContainer) {
		targetContainer.insertBefore(supermemoryIcon, anchorSlot)
		debugGemini("inserted marker before anchor button", {
			anchorLabel: anchorButton ? buttonLabel(anchorButton) : null,
			anchorSlot: describeElement(anchorSlot),
			target: describeElement(targetContainer),
		})
		return
	}

	targetContainer.appendChild(supermemoryIcon)
	debugGemini("inserted marker into fallback target", {
		target: describeElement(targetContainer),
	})
}

function getGeminiPromptInput(): GeminiInput | null {
	return document.querySelector(
		'rich-textarea .ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], .ql-editor[contenteditable="true"], div[contenteditable="true"], textarea',
	) as GeminiInput | null
}

function findGeminiComposerRoot(input: GeminiInput): HTMLElement {
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

function findGeminiComposerButtons(
	input: GeminiInput,
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
			rect.left > inputRect.left - 80 && rect.left < inputRect.right + 240

		return verticallyNear && horizontallyNear
	})
}

function buttonLabel(button: HTMLButtonElement): string {
	return [
		button.getAttribute("aria-label"),
		button.getAttribute("title"),
		button.getAttribute("data-testid"),
		button.getAttribute("data-test-id"),
		button.getAttribute("jsname"),
		button.textContent,
	]
		.filter(Boolean)
		.join(" ")
}

function isGeminiMicButton(button: HTMLButtonElement): boolean {
	return /mic|microphone|voice|dictate|audio/i.test(buttonLabel(button))
}

function isGeminiSendButton(button: HTMLButtonElement): boolean {
	const label = buttonLabel(button)
	if (/send|submit/i.test(label)) {
		return true
	}

	return !!button.querySelector(
		'mat-icon[fonticon="send"], mat-icon[data-mat-icon-name="send"], [data-icon-name="send"]',
	)
}

function findGeminiButtonSlot(
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

function getGeminiDomSnapshot() {
	return {
		richTextareas: document.querySelectorAll("rich-textarea").length,
		qlEditors: document.querySelectorAll(".ql-editor").length,
		contenteditables: document.querySelectorAll('[contenteditable="true"]')
			.length,
		textareas: document.querySelectorAll("textarea").length,
		buttons: document.querySelectorAll("button").length,
	}
}

function getInputText(input: GeminiInput | null): string {
	if (!input) return ""
	if (input instanceof HTMLTextAreaElement) {
		return input.value || ""
	}

	return input.innerText || input.textContent || ""
}

async function getRelatedMemoriesForGemini(actionSource: string) {
	try {
		const isAutoSearch =
			actionSource === POSTHOG_EVENT_KEY.GEMINI_CHAT_MEMORIES_AUTO_SEARCHED
		const input = getGeminiPromptInput()
		const userQuery = getInputText(input).trim()
		debugGemini("manual/auto memory search requested", {
			actionSource,
			hasInput: !!input,
			queryLength: userQuery.length,
		})

		if (!userQuery) {
			debugGemini("memory search skipped because query is empty")
			return
		}

		const iconElement = document.querySelector(
			`[id*="${ELEMENT_IDS.GEMINI_INPUT_BAR_ELEMENT}"]`,
		) as HTMLElement | null

		if (!iconElement) {
			console.warn("Gemini icon element not found, cannot update feedback")
			return
		}

		if (input && isAutoSearch) {
			showLoadingSuggestion("gemini", input)
		}
		setMemoryMarkerStatus(iconElement, "searching")
		if (!isAutoSearch) {
			updateGeminiIconFeedback("Searching memories...", iconElement)
		}

		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error("Memory search timeout")),
				UI_CONFIG.API_REQUEST_TIMEOUT,
			),
		)

		const response = (await Promise.race([
			browser.runtime.sendMessage({
				action: MESSAGE_TYPES.GET_RELATED_MEMORIES,
				data: userQuery,
				actionSource,
			}),
			timeoutPromise,
		])) as { success?: boolean; data?: string }

		debugGemini("memory search response", response)

		if (response?.success && response?.data && input) {
			const memoryText = showMemorySuggestion("gemini", input, response.data)
			iconElement.dataset.memoriesData = serializeMemoriesForDataset(
				response.data,
			)
			iconElement.dataset.supermemories = memoryText
			if (isAutoSearch) {
				setMemoryMarkerStatus(iconElement, "found")
			} else {
				updateGeminiIconFeedback("Included Memories", iconElement)
			}
			return
		}

		if (isAutoSearch) {
			setMemoryMarkerStatus(iconElement, "none")
		} else {
			updateGeminiIconFeedback("No memories found", iconElement, 1800)
		}
	} catch (error) {
		console.error("Error getting related memories for Gemini:", error)
		const iconElement = document.querySelector(
			`[id*="${ELEMENT_IDS.GEMINI_INPUT_BAR_ELEMENT}"]`,
		) as HTMLElement | null
		if (iconElement) {
			if (
				actionSource === POSTHOG_EVENT_KEY.GEMINI_CHAT_MEMORIES_AUTO_SEARCHED
			) {
				setMemoryMarkerStatus(iconElement, "error")
			} else {
				updateGeminiIconFeedback("Error fetching memories", iconElement, 1800)
			}
		}
	}
}

function updateGeminiIconFeedback(
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

function setupGeminiPromptCapture() {
	if (document.body.hasAttribute("data-gemini-prompt-capture-setup")) {
		return
	}

	document.body.setAttribute("data-gemini-prompt-capture-setup", "true")

	const captureGeminiPromptContent = async (source: string) => {
		const autoCapture = (await autoCapturePromptsEnabled.getValue()) ?? false
		debugGemini("capture requested", { source, autoCapture })

		if (!autoCapture) {
			debugGemini("auto prompt capture disabled")
			return
		}

		const input = getGeminiPromptInput()
		const promptContent = getInputText(input)
		debugGemini("capture input state", {
			hasInput: !!input,
			promptLength: promptContent.length,
			hasStoredMemories: !!input?.dataset.supermemories,
		})

		if (promptContent.trim()) {
			try {
				const response = await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.CAPTURE_PROMPT,
					data: {
						prompt: promptContent,
						platform: "gemini",
						source: window.location.href,
					},
				})
				debugGemini("capture response", response)
			} catch (error) {
				console.error("Error sending Gemini prompt to background:", error)
			}
		} else {
			debugGemini("capture skipped because prompt is empty")
		}

		const icons = document.querySelectorAll(
			`[id*="${ELEMENT_IDS.GEMINI_INPUT_BAR_ELEMENT}"]`,
		)

		icons.forEach((icon) => {
			const iconElement = icon as HTMLElement
			iconElement.querySelector("[data-supermemory-status-badge]")?.remove()
			delete iconElement.dataset.supermemoryStatus
			delete iconElement.dataset.memoriesData
			if (iconElement.dataset.originalHtml) {
				iconElement.innerHTML = iconElement.dataset.originalHtml
				delete iconElement.dataset.originalHtml
			}
		})

		if (input?.dataset.supermemories) {
			clearMemorySuggestion("gemini", input)
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
			if (sendButton && isGeminiSendButton(sendButton as HTMLButtonElement)) {
				debugGemini("send button click detected", {
					label: buttonLabel(sendButton as HTMLButtonElement),
					element: describeElement(sendButton),
				})
				await captureGeminiPromptContent("button click")
			}
		},
		true,
	)

	document.addEventListener(
		"keydown",
		async (event) => {
			const target = event.target as HTMLElement

			const activeInput =
				(target.closest('[contenteditable="true"]') as GeminiInput | null) ||
				(target.matches("textarea") ? (target as HTMLTextAreaElement) : null)
			if (acceptMemorySuggestion(event, "gemini", activeInput)) {
				return
			}

			if (
				(target.matches("textarea") ||
					target.matches('[contenteditable="true"]') ||
					target.closest('[contenteditable="true"]')) &&
				event.key === "Enter" &&
				!event.shiftKey
			) {
				debugGemini("Enter submit detected", {
					target: describeElement(target),
				})
				await captureGeminiPromptContent("Enter key")
			}
		},
		true,
	)
}

async function setupGeminiAutoFetch() {
	const autoSearch = (await autoSearchEnabled.getValue()) ?? false
	debugGemini("setup auto fetch", { autoSearch })
	if (!autoSearch) {
		return
	}

	const input = getGeminiPromptInput()
	if (!input || input.hasAttribute("data-supermemory-auto-fetch")) {
		debugGemini("auto fetch skipped", {
			hasInput: !!input,
			alreadyAttached: input?.hasAttribute("data-supermemory-auto-fetch"),
		})
		return
	}

	input.setAttribute("data-supermemory-auto-fetch", "true")
	debugGemini("auto fetch attached", describeElement(input))

	const handleInput = () => {
		const content = getInputText(input).trim()
		syncAcceptedSupermemoryState(input)

		if (content.length === 0) {
			clearMemorySuggestion("gemini", input)
			document
				.querySelectorAll(`[id*="${ELEMENT_IDS.GEMINI_INPUT_BAR_ELEMENT}"]`)
				.forEach((icon) => {
					setMemoryMarkerStatus(icon as HTMLElement, "neutral")
				})
		}

		if (geminiDebounceTimeout) {
			clearTimeout(geminiDebounceTimeout)
		}

		geminiDebounceTimeout = setTimeout(async () => {
			if (hasAcceptedSupermemoryContext(input)) {
				clearMemorySuggestion("gemini", input)
				return
			}

			if (content.length > 2) {
				await getRelatedMemoriesForGemini(
					POSTHOG_EVENT_KEY.GEMINI_CHAT_MEMORIES_AUTO_SEARCHED,
				)
			} else if (content.length === 0) {
				const icons = document.querySelectorAll(
					`[id*="${ELEMENT_IDS.GEMINI_INPUT_BAR_ELEMENT}"]`,
				)

				icons.forEach((icon) => {
					const iconElement = icon as HTMLElement
					iconElement.querySelector("[data-supermemory-status-badge]")?.remove()
					delete iconElement.dataset.supermemoryStatus
					delete iconElement.dataset.memoriesData
					if (iconElement.dataset.originalHtml) {
						iconElement.innerHTML = iconElement.dataset.originalHtml
						delete iconElement.dataset.originalHtml
					}
				})

				if (input.dataset.supermemories) {
					clearMemorySuggestion("gemini", input)
				}
			}
		}, UI_CONFIG.AUTO_SEARCH_DEBOUNCE_DELAY)
	}

	input.addEventListener("input", handleInput)
}
