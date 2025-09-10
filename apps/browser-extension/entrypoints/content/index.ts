import { DOMAINS, MESSAGE_TYPES } from "../../utils/constants"
import { DOMUtils } from "../../utils/ui-components"
import { initializeChatGPT } from "./chatgpt"
import { initializeClaude } from "./claude"
import { saveMemory, setupGlobalKeyboardShortcut, setupStorageListener } from "./shared"
import { initializeT3 } from "./t3"
import { handleTwitterNavigation, initializeTwitter, updateTwitterImportUI } from "./twitter"

export default defineContentScript({
	matches: ["<all_urls>"],
	main() {
		// Setup global event listeners
		browser.runtime.onMessage.addListener(async (message) => {
			if (message.action === MESSAGE_TYPES.SHOW_TOAST) {
				DOMUtils.showToast(message.state)
			} else if (message.action === MESSAGE_TYPES.SAVE_MEMORY) {
				await saveMemory()
			} else if (message.type === MESSAGE_TYPES.IMPORT_UPDATE) {
				updateTwitterImportUI(message)
			} else if (message.type === MESSAGE_TYPES.IMPORT_DONE) {
				updateTwitterImportUI(message)
			}
		})

		// Setup global keyboard shortcuts
		setupGlobalKeyboardShortcut()

		// Setup storage listener
		setupStorageListener()

		// Observer for dynamic content changes
		const observeForDynamicChanges = () => {
			const observer = new MutationObserver(() => {
				if (DOMUtils.isOnDomain(DOMAINS.CHATGPT)) {
					initializeChatGPT()
				}
				if (DOMUtils.isOnDomain(DOMAINS.CLAUDE)) {
					initializeClaude()
				}
				if (DOMUtils.isOnDomain(DOMAINS.T3)) {
					initializeT3()
				}
				if (DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
					handleTwitterNavigation()
				}
			})

			observer.observe(document.body, {
				childList: true,
				subtree: true,
			})
		}

		// Initialize platform-specific functionality
		initializeChatGPT()
		initializeClaude()
		initializeT3()
		initializeTwitter()

		// Start observing for dynamic changes
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", observeForDynamicChanges)
		} else {
			observeForDynamicChanges()
		}
	},
})