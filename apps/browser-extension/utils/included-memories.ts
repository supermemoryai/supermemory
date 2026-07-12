/**
 * Shared "Included Memories" pipeline for the chat-site content scripts
 * (ChatGPT, Claude, T3).
 *
 * The background script returns related memories as a string array. Storing
 * that array on a dataset attribute coerces it to a comma-joined string, and
 * the old popup re-split it on commas — fragmenting any memory whose content
 * itself contained a comma, and desyncing the per-row remove buttons from the
 * real memories. The helpers here keep the array intact by serializing it as
 * JSON and always rebuilding the injected prompt block from that single
 * source of truth.
 */

const PROMPT_PREFIX = "\n\nSupermemories of user (only for the reference): "

const POPUP_AUTO_DISMISS_MS = 300_000

export function serializeMemories(memories: string[]): string {
	return JSON.stringify(memories)
}

export function parseMemories(raw: string | undefined): string[] {
	if (!raw) return []
	try {
		const parsed = JSON.parse(raw)
		if (Array.isArray(parsed)) {
			return parsed.filter(
				(memory): memory is string =>
					typeof memory === "string" && memory.trim().length > 0,
			)
		}
	} catch {
		// Not JSON — fall through and treat it as legacy newline-joined text.
	}
	return raw
		.split("\n")
		.map((memory) => memory.trim())
		.filter((memory) => memory.length > 0)
}

export function buildPromptInjection(memories: string[]): string {
	const numbered = memories
		.map((memory, index) => `${index + 1}. ${memory}`)
		.join("\n")
	return `${PROMPT_PREFIX}${numbered}`
}

export interface IncludedMemoriesPopupOptions {
	iconElement: HTMLElement
	/** Site-specific lookup for the element carrying dataset.supermemories */
	getPromptElement: () => HTMLElement | null
}

export interface IncludedMemoriesPopupHandle {
	show: () => void
}

const activePopups = new WeakMap<HTMLElement, () => void>()

export function disposeIncludedMemoriesPopup(iconElement: HTMLElement): void {
	activePopups.get(iconElement)?.()
}

export function createIncludedMemoriesPopup({
	iconElement,
	getPromptElement,
}: IncludedMemoriesPopupOptions): IncludedMemoriesPopupHandle {
	// Replace any popup left over from a previous search so document-level
	// listeners and popup nodes don't accumulate as auto-search re-runs.
	disposeIncludedMemoriesPopup(iconElement)

	const memories = parseMemories(iconElement.dataset.memoriesData)

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

	const onDocumentClick = (e: MouseEvent) => {
		if (!popup.contains(e.target as Node)) {
			popup.style.display = "none"
		}
	}

	const dismissTimer = setTimeout(() => dispose(), POPUP_AUTO_DISMISS_MS)

	function dispose() {
		clearTimeout(dismissTimer)
		document.removeEventListener("click", onDocumentClick)
		popup.remove()
		activePopups.delete(iconElement)
	}

	const syncTargets = () => {
		iconElement.dataset.memoriesData = serializeMemories(memories)
		const promptElement = getPromptElement()
		if (promptElement) {
			promptElement.dataset.supermemories = buildPromptInjection(memories)
		}
	}

	const clearAll = () => {
		const promptElement = getPromptElement()
		if (promptElement?.dataset.supermemories) {
			delete promptElement.dataset.supermemories
		}
		delete iconElement.dataset.memoriesData
		iconElement.innerHTML = iconElement.dataset.originalHtml || ""
		delete iconElement.dataset.originalHtml
		dispose()
	}

	const renderRows = () => {
		content.innerHTML = ""
		memories.forEach((memory, index) => {
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
			memoryText.textContent = memory

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

			removeBtn.addEventListener("mouseenter", () => {
				removeBtn.style.color = "#ef4444"
			})
			removeBtn.addEventListener("mouseleave", () => {
				removeBtn.style.color = "#9ca3af"
			})

			removeBtn.addEventListener("click", () => {
				memories.splice(index, 1)
				if (memories.length === 0) {
					// Nothing left — remove the injected block entirely and
					// restore the icon.
					clearAll()
					return
				}
				syncTargets()
				renderRows()
			})

			memoryItem.appendChild(memoryText)
			memoryItem.appendChild(removeBtn)
			content.appendChild(memoryItem)
		})
	}

	renderRows()
	popup.appendChild(header)
	popup.appendChild(content)
	document.body.appendChild(popup)
	document.addEventListener("click", onDocumentClick)
	activePopups.set(iconElement, dispose)

	return {
		show: () => {
			popup.style.display = "block"
		},
	}
}
