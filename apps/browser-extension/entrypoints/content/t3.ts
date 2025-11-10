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
import { createT3InputBarElement, DOMUtils } from "../../utils/ui-components"

let t3DebounceTimeout: NodeJS.Timeout | null = null
let t3RouteObserver: MutationObserver | null = null
let t3UrlCheckInterval: NodeJS.Timeout | null = null
let t3ObserverThrottle: NodeJS.Timeout | null = null

export function initializeT3() {
	if (!DOMUtils.isOnDomain(DOMAINS.T3)) {
		return
	}

	if (document.body.hasAttribute("data-t3-initialized")) {
		return
	}

	setTimeout(() => {
		console.log("Adding supermemory icon to T3 input")
		addSupermemoryIconToT3Input()
		setupT3AutoFetch()
	}, 2000)

	setupT3PromptCapture()

	setupT3RouteChangeDetection()

	document.body.setAttribute("data-t3-initialized", "true")
}

function setupT3RouteChangeDetection() {
	if (t3RouteObserver) {
		t3RouteObserver.disconnect()
	}
	if (t3UrlCheckInterval) {
		clearInterval(t3UrlCheckInterval)
	}
	if (t3ObserverThrottle) {
		clearTimeout(t3ObserverThrottle)
		t3ObserverThrottle = null
	}

	let currentUrl = window.location.href

	const checkForRouteChange = () => {
		if (window.location.href !== currentUrl) {
			currentUrl = window.location.href
			console.log("T3 route changed, re-adding supermemory icon")
			setTimeout(() => {
				addSupermemoryIconToT3Input()
				setupT3AutoFetch()
			}, 1000)
		}
	}

	t3UrlCheckInterval = setInterval(checkForRouteChange, 2000)

	t3RouteObserver = new MutationObserver((mutations) => {
		if (t3ObserverThrottle) {
			return
		}

		let shouldRecheck = false
		mutations.forEach((mutation) => {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = node as Element
						if (
							element.querySelector?.("textarea") ||
							element.querySelector?.('div[contenteditable="true"]') ||
							element.matches?.("textarea") ||
							element.matches?.('div[contenteditable="true"]')
						) {
							shouldRecheck = true
						}
					}
				})
			}
		})

		if (shouldRecheck) {
			t3ObserverThrottle = setTimeout(() => {
				try {
					t3ObserverThrottle = null
					addSupermemoryIconToT3Input()
					setupT3AutoFetch()
				} catch (error) {
					console.error("Error in T3 observer callback:", error)
				}
			}, 300)
		}
	})

	try {
		t3RouteObserver.observe(document.body, {
			childList: true,
			subtree: true,
		})
	} catch (error) {
		console.error("Failed to set up T3 route observer:", error)
		if (t3UrlCheckInterval) {
			clearInterval(t3UrlCheckInterval)
		}
		t3UrlCheckInterval = setInterval(checkForRouteChange, 1000)
	}
}

function addSupermemoryIconToT3Input() {
	const targetContainers = document.querySelectorAll(
		".flex.min-w-0.items-center.gap-2",
	)

	const container = targetContainers[0]
	if (!container) {
		return
	}

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
		await getRelatedMemoriesForT3(POSTHOG_EVENT_KEY.T3_CHAT_MEMORIES_SEARCHED)
	})

	supermemoryIcon.id = `${ELEMENT_IDS.T3_INPUT_BAR_ELEMENT}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

	container.setAttribute("data-supermemory-icon-added", "true")

	container.insertBefore(supermemoryIcon, container.firstChild)
}

async function getRelatedMemoriesForT3(actionSource: string) {
	try {
		let userQuery = ""

		const supermemoryContainer = document.querySelector(
			'[data-supermemory-icon-added="true"]',
		)
		if (supermemoryContainer?.parentElement?.previousElementSibling) {
			const textareaElement =
				supermemoryContainer.parentElement.previousElementSibling.querySelector(
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
			console.log("No query text found for T3")
			return
		}

		const icon = document.querySelector('[id*="sm-t3-input-bar-element"]')

		const iconElement = icon as HTMLElement

		if (!iconElement) {
			console.warn("T3 icon element not found, cannot update feedback")
			return
		}

		updateT3IconFeedback("Searching memories...", iconElement)

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

		console.log("T3 memories response:", response)

		if (response?.success && response?.data) {
			let textareaElement = null
			const supermemoryContainer = document.querySelector(
				'[data-supermemory-icon-added="true"]',
			)
			if (supermemoryContainer?.parentElement?.previousElementSibling) {
				textareaElement =
					supermemoryContainer.parentElement.previousElementSibling.querySelector(
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
					;(textareaElement as HTMLTextAreaElement).dataset.supermemories =
						`<br>Supermemories of user (only for the reference): ${response.data}</br>`
				} else {
					;(textareaElement as HTMLElement).dataset.supermemories =
						`<br>Supermemories of user (only for the reference): ${response.data}</br>`
				}

				iconElement.dataset.memoriesData = response.data

				updateT3IconFeedback("Included Memories", iconElement)
			} else {
				console.warn("T3 input area not found after successful memory fetch")
				updateT3IconFeedback("Memories found", iconElement)
			}
		} else {
			console.warn("No memories found or API response invalid for T3")
			updateT3IconFeedback("No memories found", iconElement)
		}
	} catch (error) {
		console.error("Error getting related memories for T3:", error)
		try {
			const icon = document.querySelector(
				'[id*="sm-t3-input-bar-element"]',
			) as HTMLElement
			if (icon) {
				updateT3IconFeedback("Error fetching memories", icon)
			}
		} catch (feedbackError) {
			console.error("Failed to update T3 error feedback:", feedbackError)
		}
	}
}

function updateT3IconFeedback(
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
		padding: 6px 8px; 
		background: #513EA9; 
		border-radius: 6px; 
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

				const textareaElement =
					(document.querySelector("textarea") as HTMLTextAreaElement) ||
					(document.querySelector('div[contenteditable="true"]') as HTMLElement)
				if (textareaElement) {
					textareaElement.dataset.supermemories = `<div>Supermemories of user (only for the reference): ${updatedMemories}</div>`
				}

				content
					.querySelectorAll("button[data-memory-index]")
					.forEach((btn, newIndex) => {
						const htmlBtn = btn as HTMLButtonElement
						htmlBtn.dataset.memoryIndex = newIndex.toString()
					})

				if (currentMemories.length <= 1) {
					if (textareaElement?.dataset.supermemories) {
						delete textareaElement.dataset.supermemories
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

function setupT3PromptCapture() {
	if (document.body.hasAttribute("data-t3-prompt-capture-setup")) {
		return
	}
	document.body.setAttribute("data-t3-prompt-capture-setup", "true")

	const captureT3PromptContent = async (source: string) => {
		const autoCapture = (await autoCapturePromptsEnabled.getValue()) ?? false

		if (!autoCapture) {
			console.log("Auto capture prompts is disabled, skipping prompt capture")
			return
		}
		let promptContent = ""

		const textarea = document.querySelector("textarea") as HTMLTextAreaElement
		if (textarea) {
			promptContent = textarea.value || ""
		}

		if (!promptContent) {
			const contentEditableDiv = document.querySelector(
				'div[contenteditable="true"]',
			) as HTMLElement
			if (contentEditableDiv) {
				promptContent =
					contentEditableDiv.textContent || contentEditableDiv.innerText || ""
			}
		}

		const textareaElement =
			textarea ||
			(document.querySelector('div[contenteditable="true"]') as HTMLElement)
		const storedMemories = textareaElement?.dataset.supermemories
		if (
			storedMemories &&
			textareaElement &&
			!promptContent.includes("Supermemories of user")
		) {
			if (textareaElement.tagName === "TEXTAREA") {
				;(textareaElement as HTMLTextAreaElement).value =
					`${promptContent} ${storedMemories}`
				promptContent = (textareaElement as HTMLTextAreaElement).value
			} else {
				textareaElement.innerHTML = `${textareaElement.innerHTML} ${storedMemories}`
				promptContent =
					textareaElement.textContent || textareaElement.innerText || ""
			}
		}

		if (promptContent.trim()) {
			console.log(`T3 prompt submitted via ${source}:`, promptContent)

			try {
				await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.CAPTURE_PROMPT,
					data: {
						prompt: promptContent,
						platform: "t3",
						source: source,
					},
				})
			} catch (error) {
				console.error("Error sending T3 prompt to background:", error)
			}
		}

		const icons = document.querySelectorAll('[id*="sm-t3-input-bar-element"]')

		icons.forEach((icon) => {
			const iconElement = icon as HTMLElement
			if (iconElement.dataset.originalHtml) {
				iconElement.innerHTML = iconElement.dataset.originalHtml
				delete iconElement.dataset.originalHtml
				delete iconElement.dataset.memoriesData
			}
		})

		if (textareaElement?.dataset.supermemories) {
			delete textareaElement.dataset.supermemories
		}
	}

	const handleT3SendButtonClick = async (event: Event) => {
		const target = event.target as HTMLElement
		const sendButton =
			target.closest("button.focus-visible\\:ring-ring") ||
			target.closest('button[class*="bg-[rgb(162,59,103)]"]') ||
			target.closest('button[class*="rounded-lg"]')

		if (sendButton) {
			const textareaElement =
				(document.querySelector("textarea") as HTMLTextAreaElement) ||
				(document.querySelector('div[contenteditable="true"]') as HTMLElement)

			const hasMemories =
				textareaElement?.dataset.supermemories ||
				(
					document.querySelector(
						'[id*="sm-t3-input-bar-element"]',
					) as HTMLElement
				)?.dataset.memoriesData

			if (!hasMemories) {
				return // No memories present, let the button click proceed normally
			}

			event.preventDefault()
			event.stopPropagation()

			await captureT3PromptContent("button click")

			setTimeout(() => {
				const form = sendButton.closest("form")
				if (form) {
					form.requestSubmit()
				} else {
					const newEvent = new MouseEvent("click", {
						bubbles: true,
						cancelable: true,
						view: window,
					})
					document.removeEventListener("click", handleT3SendButtonClick, true)
					sendButton.dispatchEvent(newEvent)
					setTimeout(() => {
						document.addEventListener("click", handleT3SendButtonClick, true)
					}, 100)
				}
			}, 100)
		}
	}

	const handleT3EnterKey = async (event: KeyboardEvent) => {
		const target = event.target as HTMLElement

		if (
			(target.matches("textarea") ||
				target.matches('div[contenteditable="true"]')) &&
			event.key === "Enter" &&
			!event.shiftKey
		) {
			const textareaElement =
				(document.querySelector("textarea") as HTMLTextAreaElement) ||
				(document.querySelector('div[contenteditable="true"]') as HTMLElement)

			const hasMemories =
				textareaElement?.dataset.supermemories ||
				(
					document.querySelector(
						'[id*="sm-t3-input-bar-element"]',
					) as HTMLElement
				)?.dataset.memoriesData

			if (!hasMemories) {
				return // No memories present, let the Enter key proceed normally
			}

			event.preventDefault()
			event.stopPropagation()
			await captureT3PromptContent("Enter key")

			setTimeout(() => {
				const form = target.closest("form")
				if (form) {
					form.requestSubmit()
				} else {
					const newEvent = new KeyboardEvent("keydown", {
						key: "Enter",
						code: "Enter",
						bubbles: true,
						cancelable: true,
					})
					target.dispatchEvent(newEvent)
				}
			}, 100)
		}
	}

	document.addEventListener("click", handleT3SendButtonClick, true)
	document.addEventListener("keydown", handleT3EnterKey, true)
}

async function setupT3AutoFetch() {
	const autoSearch = (await autoSearchEnabled.getValue()) ?? false

	if (!autoSearch) {
		return
	}

	const textareaElement =
		(document.querySelector("textarea") as HTMLTextAreaElement) ||
		(document.querySelector('div[contenteditable="true"]') as HTMLElement)

	if (
		!textareaElement ||
		textareaElement.hasAttribute("data-supermemory-auto-fetch")
	) {
		return
	}

	textareaElement.setAttribute("data-supermemory-auto-fetch", "true")

	const handleInput = () => {
		if (t3DebounceTimeout) {
			clearTimeout(t3DebounceTimeout)
		}

		t3DebounceTimeout = setTimeout(async () => {
			let content = ""
			if (textareaElement.tagName === "TEXTAREA") {
				content = (textareaElement as HTMLTextAreaElement).value?.trim() || ""
			} else {
				content = textareaElement.textContent?.trim() || ""
			}

			if (content.length > 2) {
				await getRelatedMemoriesForT3(
					POSTHOG_EVENT_KEY.T3_CHAT_MEMORIES_AUTO_SEARCHED,
				)
			} else if (content.length === 0) {
				const icons = document.querySelectorAll(
					'[id*="sm-t3-input-bar-element"]',
				)

				icons.forEach((icon) => {
					const iconElement = icon as HTMLElement
					if (iconElement.dataset.originalHtml) {
						iconElement.innerHTML = iconElement.dataset.originalHtml
						delete iconElement.dataset.originalHtml
						delete iconElement.dataset.memoriesData
					}
				})

				if (textareaElement.dataset.supermemories) {
					delete textareaElement.dataset.supermemories
				}
			}
		}, UI_CONFIG.AUTO_SEARCH_DEBOUNCE_DELAY)
	}

	textareaElement.addEventListener("input", handleInput)
}
