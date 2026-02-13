import { ELEMENT_IDS, MESSAGE_TYPES, UI_CONFIG } from "../../utils/constants"
import { DOMUtils } from "../../utils/ui-components"

// State
let currentQuery = ""
let fabElement: HTMLElement | null = null
let panelElement: HTMLElement | null = null
const selectedResults: Set<number> = new Set()

/**
 * Get the selection rectangle for positioning the FAB
 */
function getSelectionRect(): DOMRect | null {
	const selection = window.getSelection()
	if (!selection || selection.rangeCount === 0) return null

	const range = selection.getRangeAt(0)
	return range.getBoundingClientRect()
}

/**
 * Check if the selection is inside our extension UI
 */
function isSelectionInsideExtensionUI(): boolean {
	const selection = window.getSelection()
	if (!selection || selection.rangeCount === 0) return false

	const anchorNode = selection.anchorNode
	if (!anchorNode) return false

	const element =
		anchorNode.nodeType === Node.ELEMENT_NODE
			? (anchorNode as Element)
			: anchorNode.parentElement

	if (!element) return false

	// Check if selection is inside FAB or panel
	return (
		!!element.closest(`#${ELEMENT_IDS.SELECTION_SEARCH_FAB}`) ||
		!!element.closest(`#${ELEMENT_IDS.SELECTION_SEARCH_PANEL}`)
	)
}

/**
 * Create the floating action button (FAB)
 */
function createFAB(): HTMLElement {
	const fab = document.createElement("div")
	fab.id = ELEMENT_IDS.SELECTION_SEARCH_FAB

	const iconUrl = browser.runtime.getURL("/icon-16.png")

	fab.innerHTML = `
		<button data-action="search" style="
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 6px 10px;
			background: transparent;
			border: none;
			color: #ffffff;
			font: inherit;
			cursor: pointer;
		">
			<img src="${iconUrl}" width="16" height="16" alt="Search" style="border-radius: 2px;" />
			<span>Search</span>
		</button>
		<div style="width: 1px; height: 16px; background: rgba(255, 255, 255, 0.15);"></div>
		<button data-action="save" style="
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 6px 10px;
			background: transparent;
			border: none;
			color: #ffffff;
			font: inherit;
			cursor: pointer;
		">
			<span style="
				width: 18px;
				height: 18px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				border: 1px solid rgba(255, 255, 255, 0.35);
				border-radius: 999px;
			">
				<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
					<path d="M5 1.5V8.5M1.5 5H8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</span>
			<span>Save</span>
		</button>
	`

	fab.style.cssText = `
		position: fixed;
		z-index: 2147483646;
		display: flex;
		align-items: center;
		gap: 0;
		padding: 4px 6px;
		background: #05070A;
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 13px;
		font-weight: 500;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: all 0.15s ease;
		user-select: none;
	`

	fab.addEventListener("mouseenter", () => {
		fab.style.background = "#0F151F"
		fab.style.borderColor = "rgba(255, 255, 255, 0.2)"
	})

	fab.addEventListener("mouseleave", () => {
		fab.style.background = "#05070A"
		fab.style.borderColor = "rgba(255, 255, 255, 0.1)"
	})

	const searchButton = fab.querySelector('button[data-action="search"]')
	searchButton?.addEventListener("click", (e) => {
		e.preventDefault()
		e.stopPropagation()
		triggerSearch()
	})

	const saveButton = fab.querySelector('button[data-action="save"]')
	saveButton?.addEventListener("click", (e) => {
		e.preventDefault()
		e.stopPropagation()
		void triggerSaveSelection()
	})

	return fab
}

/**
 * Show the FAB near the selection
 */
function showFAB(rect: DOMRect, text: string) {
	hideFAB()

	currentQuery = text
	fabElement = createFAB()

	fabElement.style.visibility = "hidden"
	document.body.appendChild(fabElement)

	// Position FAB above the selection, centered
	const fabWidth = fabElement.offsetWidth || 160
	let left = rect.left + rect.width / 2 - fabWidth / 2
	let top = rect.top - 40

	// Ensure FAB stays within viewport
	if (left < 10) left = 10
	if (left + fabWidth > window.innerWidth - 10) {
		left = window.innerWidth - fabWidth - 10
	}
	if (top < 10) {
		// Show below selection if not enough space above
		top = rect.bottom + 10
	}

	fabElement.style.left = `${left}px`
	fabElement.style.top = `${top}px`
	fabElement.style.visibility = "visible"
}

/**
 * Hide the FAB
 */
export function hideFAB() {
	if (fabElement) {
		fabElement.remove()
		fabElement = null
	}
}

/**
 * Trigger search with the current query
 */
async function triggerSearch() {
	if (!currentQuery) return

	hideFAB()
	showPanel(currentQuery, "loading")

	try {
		const response = await browser.runtime.sendMessage({
			action: MESSAGE_TYPES.SEARCH_SELECTION,
			data: currentQuery,
		})

		if (response.success) {
			showPanel(currentQuery, "results", response.data)
		} else if (response.isAuthError) {
			showPanel(currentQuery, "auth_error")
		} else {
			showPanel(currentQuery, "error", null, response.error)
		}
	} catch (error) {
		console.error("Search failed:", error)
		showPanel(
			currentQuery,
			"error",
			null,
			error instanceof Error ? error.message : "Search failed",
		)
	}
}

/**
 * Trigger save for the current selection
 * :) it saves
 */
async function triggerSaveSelection() {
	if (!currentQuery) return

	hideFAB()
	DOMUtils.showToast("loading")

	const data = buildSelectionMemoryData(currentQuery)

	try {
		const response = await browser.runtime.sendMessage({
			action: MESSAGE_TYPES.SAVE_MEMORY,
			data,
			actionSource: "selection_fab",
		})

		if (response?.success) {
			DOMUtils.showToast("success")
		} else {
			DOMUtils.showToast("error")
		}
	} catch (error) {
		console.error("Save failed:", error)
		DOMUtils.showToast("error")
	}
}

function buildSelectionMemoryData(text: string) {
	const url = window.location.href

	const ogImage =
		document
			.querySelector('meta[property="og:image"]')
			?.getAttribute("content") ||
		document.querySelector('meta[name="og:image"]')?.getAttribute("content") ||
		undefined

	const title =
		document
			.querySelector('meta[property="og:title"]')
			?.getAttribute("content") ||
		document.querySelector('meta[name="og:title"]')?.getAttribute("content") ||
		document.title ||
		undefined

	return {
		highlightedText: text,
		url,
		ogImage,
		title,
	}
}

/**
 * Create and show the search results panel
 */
function showPanel(
	query: string,
	state: "loading" | "results" | "error" | "auth_error",
	data?: unknown,
	errorMessage?: string,
) {
	hidePanel()
	selectedResults.clear()

	panelElement = document.createElement("div")
	panelElement.id = ELEMENT_IDS.SELECTION_SEARCH_PANEL

	panelElement.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 2147483647;
		width: 420px;
		max-width: 90vw;
		max-height: 70vh;
		background: #05070A;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	`

	// Header
	const header = document.createElement("div")
	header.style.cssText = `
		padding: 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-shrink: 0;
	`

	const iconUrl = browser.runtime.getURL("/icon-16.png")
	header.innerHTML = `
		<div style="display: flex; align-items: center; gap: 8px;">
			<img src="${iconUrl}" width="20" height="20" alt="supermemory" style="border-radius: 4px;" />
			<span style="font-size: 14px; font-weight: 600; color: #ffffff;">Search Results</span>
		</div>
		<button id="sm-panel-close" style="
			background: transparent;
			border: none;
			color: #737373;
			cursor: pointer;
			padding: 4px;
			font-size: 18px;
			line-height: 1;
			transition: color 0.15s;
		">×</button>
	`

	panelElement.appendChild(header)

	// Query display
	const queryDisplay = document.createElement("div")
	queryDisplay.style.cssText = `
		padding: 12px 16px;
		background: rgba(91, 126, 245, 0.04);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		flex-shrink: 0;
	`
	queryDisplay.innerHTML = `
		<div style="font-size: 12px; color: #737373; margin-bottom: 4px;">Searching for:</div>
		<div style="font-size: 13px; color: #ffffff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(query)}</div>
	`
	panelElement.appendChild(queryDisplay)

	// Content area
	const content = document.createElement("div")
	content.id = "sm-panel-content"
	content.style.cssText = `
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		min-height: 150px;
	`

	if (state === "loading") {
		content.innerHTML = `
			<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 150px; gap: 12px;">
				<div style="width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #5BD3FB; border-radius: 50%; animation: sm-spin 0.8s linear infinite;"></div>
				<span style="font-size: 14px; color: #737373;">Searching memories...</span>
			</div>
		`
	} else if (state === "auth_error") {
		content.innerHTML = `
			<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 150px; gap: 16px; text-align: center;">
				<div style="font-size: 14px; color: #ef4444;">Sign in required</div>
				<p style="font-size: 13px; color: #737373; margin: 0;">Please sign in to supermemory to search your memories.</p>
				<button id="sm-sign-in-btn" style="
					padding: 10px 20px;
					background: linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%);
					color: #ffffff;
					border: none;
					border-radius: 8px;
					font-size: 14px;
					font-weight: 500;
					cursor: pointer;
				">Sign in</button>
			</div>
		`
	} else if (state === "error") {
		content.innerHTML = `
			<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 150px; gap: 12px; text-align: center;">
				<div style="color: #ef4444; font-size: 14px;">Search failed</div>
				<p style="font-size: 13px; color: #737373; margin: 0;">${escapeHtml(errorMessage || "An error occurred")}</p>
			</div>
		`
	} else if (state === "results") {
		const response = data as {
			searchResults?: { results?: Array<{ memory?: string; id?: string }> }
		}
		const results = response?.searchResults?.results || []

		if (results.length === 0) {
			content.innerHTML = `
				<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 150px; gap: 12px; text-align: center;">
					<div style="font-size: 14px; color: #737373;">No memories found</div>
					<p style="font-size: 13px; color: #525966; margin: 0;">Try a different search query.</p>
				</div>
			`
		} else {
			content.innerHTML = results
				.map(
					(result, index) => `
				<div class="sm-result-item" data-index="${index}" style="
					display: flex;
					align-items: flex-start;
					gap: 12px;
					padding: 12px;
					background: rgba(91, 126, 245, 0.04);
					border-radius: 8px;
					margin-bottom: 8px;
					cursor: pointer;
					transition: background 0.15s;
					border: 1px solid transparent;
				">
					<input type="checkbox" data-index="${index}" style="
						margin-top: 2px;
						width: 16px;
						height: 16px;
						cursor: pointer;
						accent-color: #5BD3FB;
					" />
					<div style="flex: 1; min-width: 0;">
						<p style="font-size: 13px; color: #e5e5e5; margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(result.memory || "")}</p>
					</div>
				</div>
			`,
				)
				.join("")
		}
	}

	panelElement.appendChild(content)

	// Footer with copy button (only for results)
	if (state === "results") {
		const response = data as {
			searchResults?: { results?: Array<{ memory?: string }> }
		}
		const results = response?.searchResults?.results || []

		if (results.length > 0) {
			const footer = document.createElement("div")
			footer.style.cssText = `
				padding: 12px 16px;
				border-top: 1px solid rgba(255, 255, 255, 0.1);
				display: flex;
				justify-content: space-between;
				align-items: center;
				flex-shrink: 0;
			`
			footer.innerHTML = `
				<span id="sm-selected-count" style="font-size: 13px; color: #737373;">0 selected</span>
				<button id="sm-copy-btn" style="
					padding: 10px 16px;
					background: linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%);
					color: #ffffff;
					border: none;
					border-radius: 8px;
					font-size: 13px;
					font-weight: 500;
					cursor: pointer;
					opacity: 0.5;
					transition: opacity 0.15s;
				" disabled>Copy selected</button>
			`
			panelElement.appendChild(footer)
		}
	}

	// Add animations style
	if (!document.getElementById("sm-panel-styles")) {
		const style = document.createElement("style")
		style.id = "sm-panel-styles"
		style.textContent = `
			@keyframes sm-spin {
				from { transform: rotate(0deg); }
				to { transform: rotate(360deg); }
			}
			.sm-result-item:hover {
				background: rgba(91, 126, 245, 0.08) !important;
			}
			.sm-result-item.selected {
				border-color: rgba(91, 190, 251, 0.3) !important;
				background: rgba(91, 126, 245, 0.08) !important;
			}
		`
		document.head.appendChild(style)
	}

	document.body.appendChild(panelElement)

	// Event listeners
	setupPanelEventListeners(data)
}

/**
 * Setup event listeners for the panel
 */
function setupPanelEventListeners(data: unknown) {
	if (!panelElement) return

	// Close button
	const closeBtn = panelElement.querySelector("#sm-panel-close")
	closeBtn?.addEventListener("click", hidePanel)

	// Sign in button
	const signInBtn = panelElement.querySelector("#sm-sign-in-btn")
	signInBtn?.addEventListener("click", () => {
		window.open(
			import.meta.env.PROD
				? "https://app.supermemory.ai/login"
				: "http://localhost:3000/login",
			"_blank",
		)
	})

	// Result item checkboxes
	const checkboxes = panelElement.querySelectorAll(
		'.sm-result-item input[type="checkbox"]',
	)
	checkboxes.forEach((checkbox) => {
		checkbox.addEventListener("change", (e) => {
			const target = e.target as HTMLInputElement
			const index = Number.parseInt(target.dataset.index || "0", 10)
			const item = target.closest(".sm-result-item") as HTMLElement

			if (target.checked) {
				selectedResults.add(index)
				item?.classList.add("selected")
			} else {
				selectedResults.delete(index)
				item?.classList.remove("selected")
			}

			updateSelectionUI()
		})
	})

	// Result item click (toggle checkbox)
	const items = panelElement.querySelectorAll(".sm-result-item")
	items.forEach((item) => {
		item.addEventListener("click", (e) => {
			const target = e.target as HTMLElement
			if (target.tagName === "INPUT") return

			const checkbox = item.querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement
			if (checkbox) {
				checkbox.checked = !checkbox.checked
				checkbox.dispatchEvent(new Event("change"))
			}
		})
	})

	// Copy button
	const copyBtn = panelElement.querySelector("#sm-copy-btn")
	copyBtn?.addEventListener("click", () => {
		copySelectedResults(data)
	})

	// Close on escape
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			hidePanel()
		}
	}
	document.addEventListener("keydown", handleKeyDown)

	// Close on outside click
	const handleOutsideClick = (e: MouseEvent) => {
		if (panelElement && !panelElement.contains(e.target as Node)) {
			hidePanel()
		}
	}
	setTimeout(() => {
		document.addEventListener("click", handleOutsideClick)
	}, 100)

	// Cleanup listeners when panel is removed
	const observer = new MutationObserver(() => {
		if (!document.contains(panelElement)) {
			document.removeEventListener("keydown", handleKeyDown)
			document.removeEventListener("click", handleOutsideClick)
			observer.disconnect()
		}
	})
	observer.observe(document.body, { childList: true })
}

/**
 * Update the selection count UI
 */
function updateSelectionUI() {
	const countEl = document.getElementById("sm-selected-count")
	const copyBtn = document.getElementById("sm-copy-btn") as HTMLButtonElement

	if (countEl) {
		countEl.textContent = `${selectedResults.size} selected`
	}

	if (copyBtn) {
		copyBtn.disabled = selectedResults.size === 0
		copyBtn.style.opacity = selectedResults.size === 0 ? "0.5" : "1"
	}
}

/**
 * Copy selected results to clipboard
 */
async function copySelectedResults(data: unknown) {
	const response = data as {
		searchResults?: { results?: Array<{ memory?: string }> }
	}
	const results = response?.searchResults?.results || []

	const selectedMemories = Array.from(selectedResults)
		.sort((a, b) => a - b)
		.map((index) => results[index]?.memory)
		.filter(Boolean)

	if (selectedMemories.length === 0) return

	// Format the copied content
	const formattedContent = selectedMemories
		.map((memory, i) => `${i + 1}. ${memory}`)
		.join("\n\n")

	try {
		await navigator.clipboard.writeText(formattedContent)

		// Show copied feedback
		const copyBtn = document.getElementById("sm-copy-btn")
		if (copyBtn) {
			const originalText = copyBtn.textContent
			copyBtn.textContent = "Copied!"
			setTimeout(() => {
				if (copyBtn) copyBtn.textContent = originalText
			}, 1500)
		}

		// Track event
		browser.runtime.sendMessage({
			action: MESSAGE_TYPES.CAPTURE_PROMPT,
			data: {
				prompt: `Copied ${selectedMemories.length} memories`,
				platform: "selection_search",
				source: "copy_selected",
			},
		})
	} catch (error) {
		console.error("Failed to copy to clipboard:", error)
	}
}

/**
 * Hide the panel
 */
export function hidePanel() {
	if (panelElement) {
		panelElement.remove()
		panelElement = null
	}
	selectedResults.clear()
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
	const div = document.createElement("div")
	div.textContent = text
	return div.innerHTML
}

/**
 * Handle selection change
 */
function handleSelectionChange() {
	const selection = window.getSelection()
	const text = selection?.toString().trim() || ""

	// Hide FAB if selection is empty or inside extension UI
	if (
		!text ||
		text.length < UI_CONFIG.SELECTION_MIN_LENGTH ||
		text.length > UI_CONFIG.SELECTION_MAX_LENGTH ||
		isSelectionInsideExtensionUI()
	) {
		hideFAB()
		return
	}

	const rect = getSelectionRect()
	if (rect && rect.width > 0 && rect.height > 0) {
		showFAB(rect, text)
	}
}

/**
 * Handle message from background to open search panel
 */
export function handleOpenSearchPanel(query: string) {
	currentQuery = query
	hideFAB()
	triggerSearch()
}

/**
 * Initialize selection search functionality
 */
export function initializeSelectionSearch() {
	// Listen for mouseup to detect selection
	document.addEventListener("mouseup", () => {
		// Small delay to ensure selection is complete
		setTimeout(handleSelectionChange, 10)
	})

	// Listen for keyup for keyboard selection
	document.addEventListener("keyup", (e) => {
		if (e.shiftKey) {
			setTimeout(handleSelectionChange, 10)
		}
	})

	// Hide FAB when clicking elsewhere
	document.addEventListener("mousedown", (e) => {
		const target = e.target as HTMLElement
		if (
			fabElement &&
			!fabElement.contains(target) &&
			!panelElement?.contains(target)
		) {
			// Don't hide immediately to allow FAB click
			setTimeout(() => {
				const selection = window.getSelection()
				if (!selection || selection.toString().trim().length === 0) {
					hideFAB()
				}
			}, 100)
		}
	})
}
