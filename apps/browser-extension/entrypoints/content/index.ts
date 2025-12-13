import { DOMAINS, MESSAGE_TYPES } from "../../utils/constants"
import { DOMUtils } from "../../utils/ui-components"
import { chatGPTAdapter } from "./chatgpt"
import { claudeAdapter } from "./claude"
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

		const platformAdapters = [chatGPTAdapter, claudeAdapter]

		const runPlatformAdapters = () => {
			platformAdapters.forEach((adapter) => {
				if (adapter.matches()) {
					adapter.init()
				}
			})

			if (DOMUtils.isOnDomain(DOMAINS.T3)) {
				initializeT3()
			}

			if (DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
				handleTwitterNavigation()
			}
		}

		runPlatformAdapters()
		initializeTwitter()

		const observer = new MutationObserver(runPlatformAdapters)
		const startObserving = () =>
			observer.observe(document.body, {
				childList: true,
				subtree: true,
			})

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", startObserving, {
				once: true,
			})
		} else {
			startObserving()
		}
	},
})
