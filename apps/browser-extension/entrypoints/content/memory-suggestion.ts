type SuggestionInput = HTMLElement | HTMLTextAreaElement

const SUGGESTION_ATTR = "data-supermemory-memory-suggestion"
const SUPERMEMORY_PREFIX = "Supermemories of user (only for the reference):"
const SUPERMEMORY_BLUE = "#1A88FF"

export function buildSupermemoryText(memories: unknown): string {
	const memoryText = Array.isArray(memories)
		? memories.join("").trim()
		: String(memories || "").trim()

	return `\n\n${SUPERMEMORY_PREFIX} ${memoryText}`
}

export function showMemorySuggestion(
	platform: string,
	input: SuggestionInput,
	memories: unknown,
): string {
	const suggestionText = buildSupermemoryText(memories)
	input.dataset.supermemories = suggestionText
	delete input.dataset.supermemoriesInjected

	removeMemorySuggestion(platform)

	const anchor = getSuggestionAnchor(input)
	if (!anchor) return suggestionText

	const previousPosition = window.getComputedStyle(anchor).position
	if (previousPosition === "static") {
		anchor.dataset.supermemoryPreviousPosition = "static"
		anchor.style.position = "relative"
	}

	const suggestion = createSuggestionContainer(platform, input, anchor)
	suggestion.dataset.supermemorySuggestionState = "ready"
	suggestion.style.gap = "8px"
	suggestion.style.alignItems = "center"

	const text = document.createElement("span")
	text.style.cssText = `
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`
	text.textContent = suggestionText.trim()

	const tabKey = document.createElement("span")
	tabKey.style.cssText = `
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 20px;
		padding: 0 8px;
		border-radius: 999px;
		background: ${SUPERMEMORY_BLUE};
		color: #FFFFFF;
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16) inset, 0 6px 18px rgba(26, 136, 255, 0.24);
		flex-shrink: 0;
	`
	tabKey.textContent = "Tab"

	suggestion.appendChild(text)
	suggestion.appendChild(tabKey)
	anchor.appendChild(suggestion)

	return suggestionText
}

export function showLoadingSuggestion(
	platform: string,
	input: SuggestionInput,
) {
	removeMemorySuggestion(platform)

	const anchor = getSuggestionAnchor(input)
	if (!anchor) return

	const previousPosition = window.getComputedStyle(anchor).position
	if (previousPosition === "static") {
		anchor.dataset.supermemoryPreviousPosition = "static"
		anchor.style.position = "relative"
	}

	ensureSuggestionAnimationStyle()

	const suggestion = createSuggestionContainer(platform, input, anchor)
	suggestion.dataset.supermemorySuggestionState = "loading"
	suggestion.style.gap = "4px"
	suggestion.setAttribute("aria-label", "supermemory searching memories")

	for (let index = 0; index < 3; index += 1) {
		const dot = document.createElement("span")
		dot.style.cssText = `
			width: 5px;
			height: 5px;
			border-radius: 999px;
			background: ${SUPERMEMORY_BLUE};
			animation: supermemorySuggestionDot 1s ease-in-out infinite;
			animation-delay: ${index * 0.14}s;
		`
		suggestion.appendChild(dot)
	}

	anchor.appendChild(suggestion)
}

function createSuggestionContainer(
	platform: string,
	input: SuggestionInput,
	anchor: HTMLElement,
): HTMLDivElement {
	const suggestion = document.createElement("div")
	suggestion.setAttribute(SUGGESTION_ATTR, platform)
	const position = getCaretPosition(input, anchor)
	const verticalOffset = platform === "gemini" ? -10 : 0
	suggestion.style.cssText = `
		position: absolute;
		left: ${position.left + 6}px;
		top: ${position.top + verticalOffset}px;
		max-width: min(540px, calc(100% - ${position.left + 220}px));
		display: inline-flex;
		align-items: center;
		height: 22px;
		color: rgba(255, 255, 255, 0.34);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 14px;
		line-height: 1.35;
		pointer-events: none;
		z-index: 2147483646;
	`
	return suggestion
}

export function removeMemorySuggestion(platform: string) {
	const elements = document.querySelectorAll(
		`[${SUGGESTION_ATTR}="${platform}"]`,
	)
	for (const element of elements) {
		element.remove()
	}
}

export function acceptMemorySuggestion(
	event: KeyboardEvent,
	platform: string,
	input: SuggestionInput | null,
): boolean {
	if (event.key !== "Tab" || !input?.dataset.supermemories) {
		return false
	}

	event.preventDefault()
	event.stopPropagation()

	const text = input.dataset.supermemories
	appendTextToInput(input, text)
	delete input.dataset.supermemories
	input.dataset.supermemoriesInjected = "true"
	removeMemorySuggestion(platform)

	return true
}

export function hasAcceptedSupermemoryContext(
	input: SuggestionInput | null,
): boolean {
	if (!input) return false
	const text =
		input instanceof HTMLTextAreaElement
			? input.value
			: input.innerText || input.textContent || ""

	return text.includes(SUPERMEMORY_PREFIX)
}

export function syncAcceptedSupermemoryState(input: SuggestionInput | null) {
	if (!input?.dataset.supermemoriesInjected) return

	if (!hasAcceptedSupermemoryContext(input)) {
		delete input.dataset.supermemoriesInjected
	}
}

export function clearMemorySuggestion(
	platform: string,
	input: SuggestionInput | null,
) {
	removeMemorySuggestion(platform)
	if (input?.dataset.supermemories) {
		delete input.dataset.supermemories
	}
	if (input?.dataset.supermemoriesInjected) {
		delete input.dataset.supermemoriesInjected
	}
}

export function setMemoryMarkerStatus(
	iconElement: HTMLElement | null,
	status: "neutral" | "searching" | "found" | "none" | "error",
) {
	if (!iconElement) return

	iconElement.querySelector("[data-supermemory-status-badge]")?.remove()

	if (status === "neutral" || status === "none") {
		delete iconElement.dataset.supermemoryStatus
		return
	}

	iconElement.dataset.supermemoryStatus = status
	const badge = document.createElement("span")
	badge.dataset.supermemoryStatusBadge = "true"
	badge.style.cssText = `
		position: absolute;
		top: 3px;
		right: 3px;
		width: ${status === "searching" ? "7px" : "8px"};
		height: ${status === "searching" ? "7px" : "8px"};
		border-radius: 999px;
		background: ${status === "found" ? "#36F3D7" : status === "searching" ? SUPERMEMORY_BLUE : status === "error" ? "#EF4444" : "rgba(255, 255, 255, 0.55)"};
		border: 1px solid rgba(5, 7, 10, 0.9);
		box-shadow: ${status === "found" ? "0 0 0 2px rgba(54, 243, 215, 0.18)" : "none"};
		pointer-events: none;
	`
	iconElement.appendChild(badge)
}

export function showMarkerPopover(
	iconElement: HTMLElement,
	message: string,
	memories?: string,
	resetAfter = 0,
) {
	iconElement.querySelector("[data-supermemory-marker-popover]")?.remove()
	ensureSuggestionAnimationStyle()

	const popover = document.createElement("div")
	popover.dataset.supermemoryMarkerPopover = "true"
	popover.style.cssText = `
		position: absolute;
		right: 0;
		bottom: calc(100% + 10px);
		min-width: 168px;
		max-width: 280px;
		padding: 10px;
		border-radius: 12px;
		background: rgba(10, 14, 20, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: #FAFAFA;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 12px;
		line-height: 1.35;
		text-align: left;
		z-index: 2147483647;
		pointer-events: auto;
	`

	const title = document.createElement("div")
	title.style.cssText = `
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 700;
		margin-bottom: ${memories ? "8px" : "0"};
	`

	if (message.toLowerCase().includes("searching")) {
		const dots = document.createElement("span")
		dots.style.cssText = "display: inline-flex; gap: 3px; align-items: center;"
		for (let index = 0; index < 3; index += 1) {
			const dot = document.createElement("span")
			dot.style.cssText = `
				width: 4px;
				height: 4px;
				border-radius: 999px;
				background: ${SUPERMEMORY_BLUE};
				animation: supermemorySuggestionDot 1s ease-in-out infinite;
				animation-delay: ${index * 0.14}s;
			`
			dots.appendChild(dot)
		}
		title.appendChild(dots)
	}

	const titleText = document.createElement("span")
	titleText.textContent =
		message === "Included Memories" ? "Included memories" : message
	title.appendChild(titleText)
	popover.appendChild(title)

	if (memories) {
		const list = document.createElement("div")
		list.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 6px;
			max-height: 160px;
			overflow-y: auto;
			color: rgba(255, 255, 255, 0.76);
		`

		memories
			.split(/[,\n]/)
			.map((memory) => memory.trim())
			.filter((memory) => memory.length > 0 && memory !== ",")
			.slice(0, 5)
			.forEach((memory) => {
				const item = document.createElement("div")
				item.textContent = memory
				list.appendChild(item)
			})

		popover.appendChild(list)
	}

	iconElement.appendChild(popover)

	if (resetAfter > 0) {
		setTimeout(() => {
			popover.remove()
		}, resetAfter)
	}
}

function ensureSuggestionAnimationStyle() {
	if (document.getElementById("supermemory-suggestion-animation-style")) {
		return
	}

	const style = document.createElement("style")
	style.id = "supermemory-suggestion-animation-style"
	style.textContent = `
		@keyframes supermemorySuggestionDot {
			0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
			40% { opacity: 1; transform: translateY(-1px); }
		}
	`
	document.head.appendChild(style)
}

function getSuggestionAnchor(input: SuggestionInput): HTMLElement | null {
	return (
		(input.closest("form") as HTMLElement | null) ||
		(input.closest('[role="textbox"]') as HTMLElement | null)?.parentElement ||
		input.parentElement
	)
}

function getCaretPosition(input: SuggestionInput, anchor: HTMLElement) {
	const anchorRect = anchor.getBoundingClientRect()

	if (!(input instanceof HTMLTextAreaElement)) {
		const selection = window.getSelection()
		if (selection?.rangeCount) {
			const range = selection.getRangeAt(0).cloneRange()
			if (input.contains(range.startContainer)) {
				range.collapse(true)
				let rect = range.getBoundingClientRect()
				if (rect.width === 0 && rect.height === 0) {
					const marker = document.createElement("span")
					marker.textContent = "\u200b"
					range.insertNode(marker)
					rect = marker.getBoundingClientRect()
					marker.remove()
				}

				if (rect.width || rect.height) {
					return {
						left: Math.max(18, rect.right - anchorRect.left + 4),
						top: Math.max(10, rect.top - anchorRect.top),
					}
				}
			}
		}
	}

	const inputRect = input.getBoundingClientRect()
	return {
		left: Math.max(18, inputRect.left - anchorRect.left + 18),
		top: Math.max(10, inputRect.top - anchorRect.top + 8),
	}
}

function appendTextToInput(input: SuggestionInput, text: string) {
	if (input instanceof HTMLTextAreaElement) {
		input.value = `${input.value}${text}`
		input.dispatchEvent(new Event("input", { bubbles: true }))
		return
	}

	input.focus()
	const selection = window.getSelection()
	const range = document.createRange()
	range.selectNodeContents(input)
	range.collapse(false)
	range.insertNode(document.createTextNode(text))
	range.collapse(false)
	selection?.removeAllRanges()
	selection?.addRange(range)
	input.dispatchEvent(
		new InputEvent("input", { bubbles: true, inputType: "insertText" }),
	)
}
