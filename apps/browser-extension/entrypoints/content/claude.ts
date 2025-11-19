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

let claudeDebounceTimeout: NodeJS.Timeout | null = null
let claudeRouteObserver: MutationObserver | null = null
let claudeUrlCheckInterval: NodeJS.Timeout | null = null
let claudeObserverThrottle: NodeJS.Timeout | null = null

export function initializeClaude() {
	if (!DOMUtils.isOnDomain(DOMAINS.CLAUDE)) {
		return
	}

	if (document.body.hasAttribute("data-claude-initialized")) {
		return
	}

	setTimeout(() => {
		addSupermemoryIconToClaudeInput()
		setupClaudeAutoFetch()
	}, 2000)

	setupClaudePromptCapture()

	setupClaudeRouteChangeDetection()

	document.body.setAttribute("data-claude-initialized", "true")
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
			console.log("Claude route changed, re-adding supermemory icon")
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
							element.matches?.('div[contenteditable="true"]') ||
							element.matches?.("textarea")
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
			await getRelatedMemoriesForClaude(
				POSTHOG_EVENT_KEY.CLAUDE_CHAT_MEMORIES_SEARCHED,
			)
		})

		supermemoryIcon.id = `${ELEMENT_IDS.CLAUDE_INPUT_BAR_ELEMENT}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

		container.setAttribute("data-supermemory-icon-added", "true")

		container.insertBefore(supermemoryIcon, container.firstChild)
	})
}

async function getRelatedMemoriesForClaude(actionSource: string) {
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
			console.log("No query text found for Claude")
			return
		}

		const icon = document.querySelector('[id*="sm-claude-input-bar-element"]')

		const iconElement = icon as HTMLElement

		if (!iconElement) {
			console.warn("Claude icon element not found, cannot update feedback")
			return
		}

		updateClaudeIconFeedback("Searching memories...", iconElement)

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
				textareaElement.dataset.supermemories = `<div>Supermemories of user (only for the reference): ${response.data}</div>`
				console.log(
					"Text element dataset:",
					textareaElement.dataset.supermemories,
				)

				iconElement.dataset.memoriesData = response.data

				updateClaudeIconFeedback("Included Memories", iconElement)
			} else {
				console.warn(
					"Claude input area not found after successful memory fetch",
				)
				updateClaudeIconFeedback("Memories found", iconElement)
			}
		} else {
			console.warn("No memories found or API response invalid for Claude")
			updateClaudeIconFeedback("No memories found", iconElement)
		}
	} catch (error) {
		console.error("Error getting related memories for Claude:", error)
		try {
			const icon = document.querySelector(
				'[id*="sm-claude-input-bar-element"]',
			) as HTMLElement
			if (icon) {
				updateClaudeIconFeedback("Error fetching memories", icon)
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

				const textareaElement = document.querySelector(
					'div[contenteditable="true"]',
				) as HTMLElement
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

		const storedMemories = contentEditableDiv?.dataset.supermemories
		if (
			storedMemories &&
			contentEditableDiv &&
			!promptContent.includes("Supermemories of user")
		) {
			contentEditableDiv.innerHTML = `${contentEditableDiv.innerHTML} ${storedMemories}`
			promptContent =
				contentEditableDiv.textContent || contentEditableDiv.innerText || ""
		}

		if (promptContent.trim()) {
			console.log(`Claude prompt submitted via ${source}:`, promptContent)

			try {
				await browser.runtime.sendMessage({
					action: MESSAGE_TYPES.CAPTURE_PROMPT,
					data: {
						prompt: promptContent,
						platform: "claude",
						source: source,
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
			delete contentEditableDiv.dataset.supermemories
		}
	}

	document.addEventListener(
		"click",
		async (event) => {
			const target = event.target as HTMLElement
			const sendButton =
				target.closest(
					"button.inline-flex.items-center.justify-center.relative.shrink-0.can-focus.select-none",
				) ||
				target.closest('button[class*="bg-accent-main-000"]') ||
				target.closest('button[class*="rounded-lg"]')

			if (sendButton) {
				await captureClaudePromptContent("button click")
			}
		},
		true,
	)

	document.addEventListener(
		"keydown",
		async (event) => {
			const target = event.target as HTMLElement

			if (
				(target.matches('div[contenteditable="true"]') ||
					target.matches(".ProseMirror") ||
					target.matches("textarea") ||
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
		if (claudeDebounceTimeout) {
			clearTimeout(claudeDebounceTimeout)
		}

		claudeDebounceTimeout = setTimeout(async () => {
			const content = textareaElement.textContent?.trim() || ""

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
