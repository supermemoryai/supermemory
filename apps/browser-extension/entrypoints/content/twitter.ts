import {
	DOMAINS,
	ELEMENT_IDS,
	MESSAGE_TYPES,
	POSTHOG_EVENT_KEY,
} from "../../utils/constants"
import { trackEvent } from "../../utils/posthog"
import { createTwitterImportButton, DOMUtils } from "../../utils/ui-components"

export function initializeTwitter() {
	if (!DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
		return
	}

	// Initial setup
	if (window.location.pathname === "/i/bookmarks") {
		setTimeout(() => {
			addTwitterImportButton()
		}, 2000)
	} else {
		// Remove button if not on bookmarks page
		if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)) {
			DOMUtils.removeElement(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)
		}
	}
}

function addTwitterImportButton() {
	// Only show the import button on the bookmarks page
	if (window.location.pathname !== "/i/bookmarks") {
		return
	}

	if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)) {
		return
	}

	const button = createTwitterImportButton(async () => {
		try {
			await browser.runtime.sendMessage({
				type: MESSAGE_TYPES.BATCH_IMPORT_ALL,
			})
			await trackEvent(POSTHOG_EVENT_KEY.TWITTER_IMPORT_STARTED, {
				source: `${POSTHOG_EVENT_KEY.SOURCE}_content_script`,
			})
		} catch (error) {
			console.error("Error starting import:", error)
		}
	})

	document.body.appendChild(button)
}

export function updateTwitterImportUI(message: {
	type: string
	importedMessage?: string
	totalImported?: number
}) {
	const importButton = document.getElementById(
		ELEMENT_IDS.TWITTER_IMPORT_BUTTON,
	)
	if (!importButton) return

	const iconUrl = browser.runtime.getURL("/icon-16.png")

	if (message.type === MESSAGE_TYPES.IMPORT_UPDATE) {
		importButton.innerHTML = `
			<img src="${iconUrl}" width="20" height="20" alt="Save to Memory" style="border-radius: 4px;" />
			<span style="font-weight: 500; font-size: 14px;">${message.importedMessage}</span>
		`
		importButton.style.cursor = "default"
	}

	if (message.type === MESSAGE_TYPES.IMPORT_DONE) {
		importButton.innerHTML = `
			<img src="${iconUrl}" width="20" height="20" alt="Save to Memory" style="border-radius: 4px;" />
			<span style="font-weight: 500; font-size: 14px; color: #059669;">✓ Imported ${message.totalImported} tweets!</span>
		`

		setTimeout(() => {
			importButton.innerHTML = `
				<img src="${iconUrl}" width="20" height="20" alt="Save to Memory" style="border-radius: 4px;" />
				<span style="font-weight: 500; font-size: 14px;">Import Bookmarks</span>
			`
			importButton.style.cursor = "pointer"
		}, 3000)
	}
}

export function handleTwitterNavigation() {
	if (!DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
		return
	}

	if (window.location.pathname === "/i/bookmarks") {
		addTwitterImportButton()
	} else {
		if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)) {
			DOMUtils.removeElement(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)
		}
	}
}