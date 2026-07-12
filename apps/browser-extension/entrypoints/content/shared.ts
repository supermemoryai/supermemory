import { MESSAGE_TYPES } from "../../utils/constants"
import { isExtensionAuthUrl } from "../../utils/extension-auth"
import { DOMUtils } from "../../utils/ui-components"
import { default as TurndownService } from "turndown"

export async function saveMemory() {
	try {
		DOMUtils.showToast("loading")

		const highlightedText = window.getSelection()?.toString() || ""
		const url = window.location.href

		const ogImage =
			document
				.querySelector('meta[property="og:image"]')
				?.getAttribute("content") ||
			document
				.querySelector('meta[name="og:image"]')
				?.getAttribute("content") ||
			undefined

		const title =
			document
				.querySelector('meta[property="og:title"]')
				?.getAttribute("content") ||
			document
				.querySelector('meta[name="og:title"]')
				?.getAttribute("content") ||
			document.title ||
			undefined

		const data: {
			html?: string
			markdown?: string
			highlightedText?: string
			url: string
			ogImage?: string
			title?: string
		} = {
			url,
		}

		if (ogImage) {
			data.ogImage = ogImage
		}

		if (title) {
			data.title = title
		}

		if (highlightedText) {
			data.highlightedText = highlightedText
		} else {
			const bodyClone = document.body.cloneNode(true) as HTMLElement
			const scripts = bodyClone.querySelectorAll("script")
			for (const script of scripts) {
				script.remove()
			}
			const html = bodyClone.innerHTML

			// Convert HTML to markdown
			const turndownService = new TurndownService()
			const markdown = turndownService.turndown(html)
			data.markdown = markdown
		}

		const response = await browser.runtime.sendMessage({
			action: MESSAGE_TYPES.SAVE_MEMORY,
			data,
			actionSource: "context_menu",
		})

		console.log("Response from enxtension:", response)
		if (response.success) {
			DOMUtils.showToast("success")
		} else {
			DOMUtils.showToast("error")
		}
	} catch (error) {
		console.error("Error saving memory:", error)
		DOMUtils.showToast("error")
	}
}

export function setupGlobalKeyboardShortcut() {
	document.addEventListener("keydown", async (event) => {
		if (
			(event.ctrlKey || event.metaKey) &&
			event.shiftKey &&
			event.key === "m"
		) {
			event.preventDefault()
			await saveMemory()
		}
	})
}

export async function setupExtensionAuth() {
	if (!isExtensionAuthUrl(window.location.href)) return

	try {
		const response = await browser.runtime.sendMessage({
			action: MESSAGE_TYPES.SYNC_EXTENSION_AUTH,
		})
		if (!response?.success) return

		const url = new URL(window.location.href)
		url.searchParams.delete("extension-auth-success")
		window.history.replaceState({}, "", url.toString())
	} catch {
		// Do nothing
	}
}
