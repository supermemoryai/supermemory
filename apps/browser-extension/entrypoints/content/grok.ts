import { DOMAINS, MESSAGE_TYPES } from "../../utils/constants"
import { DOMUtils } from "../../utils/ui-components"

let grokRouteObserver: MutationObserver | null = null
let grokUrlCheckInterval: NodeJS.Timeout | null = null
let grokObserverThrottle: NodeJS.Timeout | null = null
const GROK_IMPORT_INTENT_PARAM = "sm_grok_import"
const GROK_IMPORT_INTENT_VALUE = "memories"

export function initializeGrok() {
	if (!DOMUtils.isOnDomain(DOMAINS.GROK)) {
		return
	}

	if (document.body.hasAttribute("data-grok-initialized")) {
		return
	}

	setTimeout(() => {
		addSupermemoryButtonToGrokMemoryDialog()
		handleGrokImportIntent()
	}, 1000)

	setupGrokRouteChangeDetection()

	document.body.setAttribute("data-grok-initialized", "true")
}

function setupGrokRouteChangeDetection() {
	if (grokRouteObserver) {
		grokRouteObserver.disconnect()
	}
	if (grokUrlCheckInterval) {
		clearInterval(grokUrlCheckInterval)
	}
	if (grokObserverThrottle) {
		clearTimeout(grokObserverThrottle)
		grokObserverThrottle = null
	}

	let currentUrl = window.location.href

	const checkForRouteChange = () => {
		if (window.location.href !== currentUrl) {
			currentUrl = window.location.href
			setTimeout(() => {
				addSupermemoryButtonToGrokMemoryDialog()
				handleGrokImportIntent()
			}, 500)
		}
	}

	grokUrlCheckInterval = setInterval(checkForRouteChange, 2000)

	grokRouteObserver = new MutationObserver((mutations) => {
		if (grokObserverThrottle) {
			return
		}

		let shouldRecheck = false
		for (const mutation of mutations) {
			if (mutation.type !== "childList" || mutation.addedNodes.length === 0) {
				continue
			}

			for (const node of mutation.addedNodes) {
				if (node.nodeType !== Node.ELEMENT_NODE) {
					continue
				}

				const element = node as Element
				const text = element.textContent || ""
				if (
					element.querySelector?.('[role="dialog"]') ||
					element.matches?.('[role="dialog"]') ||
					text.includes("Data Controls") ||
					text.includes("Settings") ||
					text.includes("Memory from your chats")
				) {
					shouldRecheck = true
					break
				}
			}
		}

		if (shouldRecheck) {
			grokObserverThrottle = setTimeout(() => {
				grokObserverThrottle = null
				addSupermemoryButtonToGrokMemoryDialog()
				handleGrokImportIntent()
			}, 250)
		}
	})

	try {
		grokRouteObserver.observe(document.body, {
			childList: true,
			subtree: true,
		})
	} catch (error) {
		console.error("Failed to set up Grok route observer:", error)
		if (grokUrlCheckInterval) {
			clearInterval(grokUrlCheckInterval)
		}
		grokUrlCheckInterval = setInterval(checkForRouteChange, 1000)
	}
}

function hasGrokImportIntent() {
	return (
		new URLSearchParams(window.location.search).get(
			GROK_IMPORT_INTENT_PARAM,
		) === GROK_IMPORT_INTENT_VALUE
	)
}

function clearGrokImportIntent() {
	const url = new URL(window.location.href)
	url.searchParams.delete(GROK_IMPORT_INTENT_PARAM)
	window.history.replaceState(window.history.state, "", url.toString())
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function isVisible(element: HTMLElement) {
	const rect = element.getBoundingClientRect()
	const style = window.getComputedStyle(element)

	return (
		rect.width > 0 &&
		rect.height > 0 &&
		style.display !== "none" &&
		style.visibility !== "hidden" &&
		Number.parseFloat(style.opacity || "1") > 0
	)
}

function getNormalizedText(element: Element) {
	return (element.textContent || "").replace(/\s+/g, " ").trim()
}

function clickVisibleElementByText(
	labels: string[],
	root: ParentNode = document,
) {
	const elements = Array.from(
		root.querySelectorAll<HTMLElement>(
			"button, a, [role='button'], [role='tab'], [data-testid], div, span",
		),
	)

	for (const label of labels) {
		const matchingElement = elements.find((element) => {
			const text = getNormalizedText(element)
			return text === label && isVisible(element)
		})

		if (!matchingElement) {
			continue
		}

		const clickableElement =
			matchingElement.closest<HTMLElement>(
				"button, a, [role='button'], [role='tab']",
			) || matchingElement

		clickableElement.click()
		return true
	}

	return false
}

function getGrokSettingsDialog() {
	return Array.from(
		document.querySelectorAll<HTMLElement>('[role="dialog"]'),
	).find((dialog) => {
		const text = getNormalizedText(dialog)
		return (
			isVisible(dialog) &&
			text.includes("Data Controls") &&
			text.includes("Appearance") &&
			text.includes("Behavior")
		)
	})
}

function isGrokDataControlsVisible() {
	const text = getNormalizedText(document.body)
	return (
		text.includes("Data Controls") && text.includes("Memory from your chats")
	)
}

async function handleGrokImportIntent() {
	if (!hasGrokImportIntent()) return

	if (document.body.hasAttribute("data-grok-import-intent-running")) {
		return
	}

	document.body.setAttribute("data-grok-import-intent-running", "true")

	for (let attempt = 0; attempt < 24; attempt++) {
		addSupermemoryButtonToGrokMemoryDialog()

		if (getGrokMemoryDialog()) {
			clearGrokImportIntent()
			document.body.removeAttribute("data-grok-import-intent-running")
			return
		}

		const settingsDialog = getGrokSettingsDialog()
		if (settingsDialog) {
			if (isGrokDataControlsVisible()) {
				clearGrokImportIntent()
				document.body.removeAttribute("data-grok-import-intent-running")
				return
			}

			clickVisibleElementByText(["Data Controls"], settingsDialog)
		} else {
			clickVisibleElementByText(["Settings"], document)
		}

		await sleep(350)
	}

	document.body.removeAttribute("data-grok-import-intent-running")
}

function getGrokMemoryDialog(): HTMLElement | null {
	const dialogs = Array.from(
		document.querySelectorAll<HTMLElement>('[role="dialog"]'),
	)

	for (const dialog of dialogs) {
		const heading = Array.from(dialog.querySelectorAll("h1, h2, h3")).find(
			(element) => element.textContent?.trim() === "Memory from your chats",
		)
		if (heading) return dialog
	}

	const candidates = Array.from(document.querySelectorAll<HTMLElement>("div"))
		.filter((element) => {
			const text = element.textContent || ""
			if (
				!text.includes("Memory from your chats") ||
				!text.includes("This summary is regenerated")
			) {
				return false
			}

			const rect = element.getBoundingClientRect()
			return rect.width > 400 && rect.height > 250
		})
		.sort((a, b) => {
			const rectA = a.getBoundingClientRect()
			const rectB = b.getBoundingClientRect()
			return rectA.width * rectA.height - rectB.width * rectB.height
		})

	return candidates[0] || null
}

const GROK_MEMORY_UI_TEXT = [
	"Memory from your chats",
	"This summary is regenerated periodically from your conversations.",
	"Save to supermemory",
	"Close",
	"Delete memory",
	"Edit",
] as const

function escapeRegExp(text: string) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function sanitizeGrokMemoryText(text: string) {
	let sanitizedText = text

	for (const uiText of GROK_MEMORY_UI_TEXT) {
		sanitizedText = sanitizedText.replace(
			new RegExp(escapeRegExp(uiText), "g"),
			"\n",
		)
	}

	return sanitizedText
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line)
		.join("\n")
		.trim()
}

function getGrokMemoryText(dialog: HTMLElement): string {
	const clonedDialog = dialog.cloneNode(true) as HTMLElement
	clonedDialog.querySelector("#supermemory-save-button")?.remove()

	const possibleMemoryContainers = Array.from(
		clonedDialog.querySelectorAll<HTMLElement>(
			"article, section, [class*='overflow'], [class*='prose'], [class*='whitespace']",
		),
	)
		.map((element) => element.innerText || element.textContent || "")
		.map(sanitizeGrokMemoryText)
		.filter((text) => text.length > 30)
		.sort((a, b) => b.length - a.length)

	if (possibleMemoryContainers[0]) {
		return possibleMemoryContainers[0]
	}

	return sanitizeGrokMemoryText(
		clonedDialog.innerText || clonedDialog.textContent || "",
	)
}

function createSupermemoryButton(memoryDialog: HTMLElement) {
	const supermemoryButton = document.createElement("button")
	supermemoryButton.id = "supermemory-save-button"

	const iconUrl = browser.runtime.getURL("/icon-16.png")

	supermemoryButton.innerHTML = `
		<div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap;">
			<img src="${iconUrl}" alt="supermemory" style="width: 16px; height: 16px; flex-shrink: 0; border-radius: 2px;" />
			<span style="white-space: nowrap;">Save to supermemory</span>
		</div>
	`

	supermemoryButton.style.cssText = `
		display: inline-flex !important;
		align-items: center !important;
		justify-content: center !important;
		width: auto !important;
		min-width: 190px !important;
		background: #1C2026 !important;
		color: white !important;
		border: 1px solid #1C2026 !important;
		border-radius: 9999px !important;
		padding: 10px 16px !important;
		font-weight: 500 !important;
		font-size: 14px !important;
		line-height: 20px !important;
		white-space: nowrap !important;
		cursor: pointer !important;
		font-family: inherit !important;
		z-index: 1 !important;
	`

	supermemoryButton.addEventListener("mouseenter", () => {
		supermemoryButton.style.backgroundColor = "#2B2E33"
	})

	supermemoryButton.addEventListener("mouseleave", () => {
		supermemoryButton.style.backgroundColor = "#1C2026"
	})

	supermemoryButton.addEventListener("click", async () => {
		await saveGrokMemoriesToSupermemory(memoryDialog)
	})

	return supermemoryButton
}

function addSupermemoryButtonToGrokMemoryDialog() {
	const memoryDialog = getGrokMemoryDialog()
	if (!memoryDialog) return

	if (memoryDialog.querySelector("#supermemory-save-button")) return

	const supermemoryButton = createSupermemoryButton(memoryDialog)

	const heading = Array.from(memoryDialog.querySelectorAll("h1, h2, h3")).find(
		(element) => element.textContent?.trim() === "Memory from your chats",
	)

	const closeButton = Array.from(
		memoryDialog.querySelectorAll<HTMLButtonElement>("button"),
	).find((button) => {
		const label = button.getAttribute("aria-label")?.toLowerCase() || ""
		const text = button.textContent?.trim().toLowerCase() || ""
		return label.includes("close") || text === "×" || text === "x"
	})

	if (heading?.parentElement) {
		const header = heading.parentElement
		header.style.display = "flex"
		header.style.alignItems = "center"
		header.style.gap = "12px"

		const spacer = document.createElement("div")
		spacer.style.flex = "1"

		if (closeButton?.parentElement === header) {
			header.insertBefore(spacer, closeButton)
			header.insertBefore(supermemoryButton, closeButton)
		} else {
			header.appendChild(spacer)
			header.appendChild(supermemoryButton)
		}
		return
	}

	if (closeButton?.parentElement) {
		closeButton.parentElement.insertBefore(supermemoryButton, closeButton)
		return
	}

	memoryDialog.insertBefore(supermemoryButton, memoryDialog.firstChild)
}

async function saveGrokMemoriesToSupermemory(memoryDialog: HTMLElement) {
	try {
		DOMUtils.showToast("loading")

		const memoryText = getGrokMemoryText(memoryDialog)
		if (!memoryText) {
			DOMUtils.showToast("error")
			return
		}

		const response = await browser.runtime.sendMessage({
			action: MESSAGE_TYPES.SAVE_MEMORY,
			data: {
				content: memoryText,
				title: "Grok memories import",
			},
			actionSource: "grok_memories_dialog",
		})

		if (response.success) {
			DOMUtils.showToast("success")
		} else {
			DOMUtils.showToast("error")
		}
	} catch (error) {
		console.error("Error saving Grok memories to supermemory:", error)
		DOMUtils.showToast("error")
	}
}
