import {
	DOMAINS,
	ELEMENT_IDS,
	MESSAGE_TYPES,
	POSTHOG_EVENT_KEY,
	STORAGE_KEYS,
	UI_CONFIG,
} from "../../utils/constants"
import { trackEvent } from "../../utils/posthog"
import {
	createProjectSelectionModal,
	createSaveTweetElement,
	DOMUtils,
} from "../../utils/ui-components"

async function loadSpaceGroteskFonts(): Promise<void> {
	if (document.getElementById("supermemory-modal-styles")) {
		return Promise.resolve()
	}

	const style = document.createElement("style")
	style.id = "supermemory-modal-styles"
	style.textContent = `
     @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap');
    `
	document.head.appendChild(style)

	await document.fonts.ready
}

/**
 * Check if import intent is valid (exists and not expired)
 */
async function checkAndConsumeImportIntent(): Promise<boolean> {
	try {
		const result = await browser.storage.local.get(
			STORAGE_KEYS.TWITTER_BOOKMARKS_IMPORT_INTENT_UNTIL,
		)
		const intentUntil = result[
			STORAGE_KEYS.TWITTER_BOOKMARKS_IMPORT_INTENT_UNTIL
		] as number | undefined

		if (intentUntil && Date.now() < intentUntil) {
			await browser.storage.local.remove(
				STORAGE_KEYS.TWITTER_BOOKMARKS_IMPORT_INTENT_UNTIL,
			)
			return true
		}
		return false
	} catch (error) {
		console.error("Error checking import intent:", error)
		return false
	}
}

/**
 * Check if onboarding toast has been shown before
 */
async function hasOnboardingBeenShown(): Promise<boolean> {
	try {
		const result = await browser.storage.local.get(
			STORAGE_KEYS.TWITTER_BOOKMARKS_ONBOARDING_SEEN,
		)
		return !!result[STORAGE_KEYS.TWITTER_BOOKMARKS_ONBOARDING_SEEN]
	} catch (error) {
		console.error("Error checking onboarding status:", error)
		return true // Default to true to avoid showing toast on error
	}
}

/**
 * Mark onboarding toast as shown
 */
async function markOnboardingAsShown(): Promise<void> {
	try {
		await browser.storage.local.set({
			[STORAGE_KEYS.TWITTER_BOOKMARKS_ONBOARDING_SEEN]: true,
		})
	} catch (error) {
		console.error("Error marking onboarding as shown:", error)
	}
}

export async function initializeTwitter() {
	if (!DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
		return
	}

	if (window.location.pathname === "/i/bookmarks") {
		setTimeout(async () => {
			if (window.location.pathname === "/i/bookmarks") {
				await handleBookmarksPageLoad()
			}
		}, 2000)
	} else {
		// Clean up any injected UI if navigating away
		removeAllTwitterUI()
	}
}

/**
 * Handle what to show when user lands on bookmarks page
 */
async function handleBookmarksPageLoad() {
	if (window.location.pathname !== "/i/bookmarks") {
		return
	}

	addTwitterImportButtonForFolders() // Add buttons to bookmark folders

	const hasIntent = await checkAndConsumeImportIntent()

	if (hasIntent) {
		await openImportModal()
		return
	}

	const onboardingShown = await hasOnboardingBeenShown()

	if (!onboardingShown) {
		await showOnboardingToast()
		await markOnboardingAsShown()
	}
}

/**
 * Opens the import modal and handles the import flow
 */
export async function openImportModal() {
	try {
		const response = await browser.runtime.sendMessage({
			action: MESSAGE_TYPES.FETCH_PROJECTS,
		})

		const projects = response.success && response.data ? response.data : []

		if (projects.length === 0) {
			await browser.runtime.sendMessage({
				type: MESSAGE_TYPES.BATCH_IMPORT_ALL,
			})
			await trackEvent(POSTHOG_EVENT_KEY.TWITTER_IMPORT_STARTED, {
				source: `${POSTHOG_EVENT_KEY.SOURCE}_content_script`,
			})
		} else {
			await showAllBookmarksProjectModal(projects)
		}
	} catch (error) {
		console.error("Error opening import modal:", error)
		await browser.runtime.sendMessage({
			type: MESSAGE_TYPES.BATCH_IMPORT_ALL,
		})
	}
}

async function showAllBookmarksProjectModal(
	projects: Array<{ id: string; name: string; containerTag: string }>,
) {
	await loadSpaceGroteskFonts()

	const modal = createProjectSelectionModal(
		projects,
		async (selectedProject) => {
			modal.remove()

			try {
				await browser.runtime.sendMessage({
					type: MESSAGE_TYPES.BATCH_IMPORT_ALL,
					selectedProject: selectedProject,
				})
				await trackEvent(POSTHOG_EVENT_KEY.TWITTER_IMPORT_STARTED, {
					source: `${POSTHOG_EVENT_KEY.SOURCE}_content_script`,
					project_selected: true,
				})
			} catch (error) {
				console.error("Error importing all bookmarks:", error)
			}
		},
		() => {
			modal.remove()
		},
	)

	document.body.appendChild(modal)
}

/**
 * Shows the one-time onboarding toast with progress bar
 */
async function showOnboardingToast() {
	await loadSpaceGroteskFonts()

	// Remove any existing toast
	const existingToast = document.getElementById(
		ELEMENT_IDS.TWITTER_ONBOARDING_TOAST,
	)
	if (existingToast) {
		existingToast.remove()
	}

	const duration = UI_CONFIG.ONBOARDING_TOAST_DURATION

	// Create toast container
	const toast = document.createElement("div")
	toast.id = ELEMENT_IDS.TWITTER_ONBOARDING_TOAST
	toast.style.cssText = `
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 2147483647;
		background: #ffffff;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 14px;
		color: #374151;
		min-width: 320px;
		max-width: 380px;
		box-shadow: 0 4px 24px 0 rgba(0,0,0,0.18), 0 1.5px 6px 0 rgba(0,0,0,0.12);
		animation: smSlideInUp 0.3s ease-out;
		overflow: hidden;
	`

	// Add keyframe animations if not already present
	if (!document.getElementById("supermemory-onboarding-toast-styles")) {
		const style = document.createElement("style")
		style.id = "supermemory-onboarding-toast-styles"
		style.textContent = `
			@keyframes smSlideInUp {
				from { transform: translateY(100%); opacity: 0; }
				to { transform: translateY(0); opacity: 1; }
			}
			@keyframes smFadeOut {
				from { transform: translateY(0); opacity: 1; }
				to { transform: translateY(100%); opacity: 0; }
			}
			@keyframes smProgressGrow {
				from { transform: scaleX(0); }
				to { transform: scaleX(1); }
			}
			@keyframes smPulse {
				0%, 100% { opacity: 1; }
				50% { opacity: 0.4; }
			}
		`
		document.head.appendChild(style)
	}

	// Header with icon, text and close button
	const header = document.createElement("div")
	header.style.cssText =
		"display: flex; align-items: flex-start; gap: 12px; position: relative;"

	const iconUrl = browser.runtime.getURL("/icon-16.png")
	const icon = document.createElement("img")
	icon.src = iconUrl
	icon.alt = "Supermemory"
	icon.style.cssText = "width: 24px; height: 24px; border-radius: 4px; flex-shrink: 0; margin-top: 2px;"

	const textContainer = document.createElement("div")
	textContainer.style.cssText = "display: flex; flex-direction: column; gap: 4px; flex: 1;"

	const title = document.createElement("span")
	title.style.cssText = "font-weight: 600; font-size: 14px; color: #111827;"
	title.textContent = "Import X/Twitter Bookmarks"

	const description = document.createElement("span")
	description.style.cssText = "font-size: 13px; color: #6b7280; line-height: 1.4;"
	description.textContent =
		"You can import all your Twitter bookmarks to Supermemory with one click."

	textContainer.appendChild(title)
	textContainer.appendChild(description)

	// Close button
	const closeButton = document.createElement("button")
	closeButton.setAttribute("aria-label", "Close onboarding toast")
	closeButton.style.cssText = `
		position: absolute;
		top: 0;
		right: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 4px;
		color: #9ca3af;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s;
	`
	closeButton.innerHTML = `
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<line x1="18" y1="6" x2="6" y2="18"></line>
			<line x1="6" y1="6" x2="18" y2="18"></line>
		</svg>
	`
	closeButton.addEventListener("mouseenter", () => {
		closeButton.style.backgroundColor = "#f3f4f6"
	})
	closeButton.addEventListener("mouseleave", () => {
		closeButton.style.backgroundColor = "transparent"
	})
	closeButton.addEventListener("click", () => {
		dismissToast(toast)
	})

	header.appendChild(icon)
	header.appendChild(textContainer)
	header.appendChild(closeButton)

	// Action buttons
	const buttonsContainer = document.createElement("div")
	buttonsContainer.style.cssText = "display: flex; gap: 8px; margin-top: 4px;"

	const importButton = document.createElement("button")
	importButton.style.cssText = `
		padding: 8px 16px;
		border: none;
		border-radius: 8px;
		background: linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%);
		color: white;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.2s;
		font-family: inherit;
	`
	importButton.textContent = "Import now"
	importButton.addEventListener("mouseenter", () => {
		importButton.style.opacity = "0.9"
	})
	importButton.addEventListener("mouseleave", () => {
		importButton.style.opacity = "1"
	})
	importButton.addEventListener("click", async () => {
		dismissToast(toast)
		await openImportModal()
	})

	const learnMoreButton = document.createElement("button")
	learnMoreButton.style.cssText = `
		padding: 8px 16px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: transparent;
		color: #374151;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		font-family: inherit;
	`
	learnMoreButton.textContent = "Learn more"
	learnMoreButton.addEventListener("mouseenter", () => {
		learnMoreButton.style.backgroundColor = "#f9fafb"
	})
	learnMoreButton.addEventListener("mouseleave", () => {
		learnMoreButton.style.backgroundColor = "transparent"
	})
	learnMoreButton.addEventListener("click", () => {
		window.open(
			"https://docs.supermemory.ai/connectors/twitter",
			"_blank",
		)
	})

	buttonsContainer.appendChild(importButton)
	buttonsContainer.appendChild(learnMoreButton)

	// Progress bar container
	const progressBarContainer = document.createElement("div")
	progressBarContainer.setAttribute("role", "progressbar")
	progressBarContainer.setAttribute("aria-valuemin", "0")
	progressBarContainer.setAttribute("aria-valuemax", "100")
	progressBarContainer.setAttribute("aria-valuenow", "0")
	progressBarContainer.setAttribute("aria-label", "Onboarding toast auto-dismiss progress")
	progressBarContainer.style.cssText = `
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: #e5e7eb;
	`

	const progressBar = document.createElement("div")
	progressBar.style.cssText = `
		height: 100%;
		background: linear-gradient(90deg, #0ff0d2, #5bd3fb, #1e0ff0);
		transform-origin: left;
		animation: smProgressGrow ${duration}ms linear forwards;
	`
	
	// Update progress bar ARIA value as animation progresses
	const startTime = Date.now()
	const updateProgress = () => {
		const elapsed = Date.now() - startTime
		const progress = Math.min(100, Math.round((elapsed / duration) * 100))
		progressBarContainer.setAttribute("aria-valuenow", String(progress))
		if (progress < 100) {
			requestAnimationFrame(updateProgress)
		}
	}
	requestAnimationFrame(updateProgress)

	progressBarContainer.appendChild(progressBar)

	// Assemble toast
	toast.appendChild(header)
	toast.appendChild(buttonsContainer)
	toast.appendChild(progressBarContainer)

	document.body.appendChild(toast)

	// Auto-dismiss after duration
	setTimeout(() => {
		if (document.body.contains(toast)) {
			dismissToast(toast)
		}
	}, duration)
}

/**
 * Dismiss the toast with animation
 */
function dismissToast(toast: HTMLElement) {
	toast.style.animation = "smFadeOut 0.3s ease-out forwards"
	setTimeout(() => {
		if (document.body.contains(toast)) {
			toast.remove()
		}
	}, 300)
}

/**
 * Remove all Twitter-specific injected UI
 */
function removeAllTwitterUI() {
	// Remove import button (legacy)
	if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)) {
		DOMUtils.removeElement(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)
	}
	// Remove onboarding toast
	if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_ONBOARDING_TOAST)) {
		DOMUtils.removeElement(ELEMENT_IDS.TWITTER_ONBOARDING_TOAST)
	}
	// Remove import progress toast
	if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_PROGRESS_TOAST)) {
		DOMUtils.removeElement(ELEMENT_IDS.TWITTER_IMPORT_PROGRESS_TOAST)
	}
	// Remove any folder buttons
	document.querySelectorAll("[data-supermemory-button]").forEach((button) => {
		button.remove()
	})
}

/**
 * Shows or updates the import progress toast in the bottom-right
 */
function showOrUpdateImportProgressToast(message: string, isComplete = false) {
	let toast = document.getElementById(ELEMENT_IDS.TWITTER_IMPORT_PROGRESS_TOAST)

	if (!toast) {
		// Ensure animation styles are available
		if (!document.getElementById("supermemory-onboarding-toast-styles")) {
			const style = document.createElement("style")
			style.id = "supermemory-onboarding-toast-styles"
			style.textContent = `
				@keyframes smSlideInUp {
					from { transform: translateY(100%); opacity: 0; }
					to { transform: translateY(0); opacity: 1; }
				}
				@keyframes smFadeOut {
					from { transform: translateY(0); opacity: 1; }
					to { transform: translateY(100%); opacity: 0; }
				}
				@keyframes smPulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.4; }
				}
			`
			document.head.appendChild(style)
		}

		// Create new toast
		toast = document.createElement("div")
		toast.id = ELEMENT_IDS.TWITTER_IMPORT_PROGRESS_TOAST
		toast.style.cssText = `
			position: fixed;
			bottom: 20px;
			right: 20px;
			z-index: 2147483647;
			background: #ffffff;
			border-radius: 12px;
			padding: 14px 16px;
			display: flex;
			align-items: center;
			gap: 12px;
			font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			font-size: 14px;
			color: #374151;
			min-width: 280px;
			max-width: 360px;
			box-shadow: 0 4px 24px 0 rgba(0,0,0,0.18), 0 1.5px 6px 0 rgba(0,0,0,0.12);
			animation: smSlideInUp 0.3s ease-out;
		`

		const iconUrl = browser.runtime.getURL("/icon-16.png")
		const icon = document.createElement("img")
		icon.src = iconUrl
		icon.alt = "Supermemory"
		icon.id = "sm-import-progress-icon"
		icon.style.cssText =
			"width: 20px; height: 20px; border-radius: 4px; flex-shrink: 0; animation: smPulse 1.5s ease-in-out infinite;"

		const textSpan = document.createElement("span")
		textSpan.id = "sm-import-progress-text"
		textSpan.style.cssText = "font-weight: 500; flex: 1;"
		textSpan.textContent = message

		toast.appendChild(icon)
		toast.appendChild(textSpan)
		document.body.appendChild(toast)
	} else {
		// Update existing toast
		const textSpan = toast.querySelector(
			"#sm-import-progress-text",
		) as HTMLSpanElement
		if (textSpan) {
			textSpan.textContent = message
		}
	}

	// Style for completion
	if (isComplete) {
		const icon = toast.querySelector(
			"#sm-import-progress-icon",
		) as HTMLImageElement
		if (icon) {
			icon.style.animation = "none"
			icon.style.opacity = "1"
		}

		const textSpan = toast.querySelector(
			"#sm-import-progress-text",
		) as HTMLSpanElement
		if (textSpan) {
			textSpan.style.color = "#059669"
		}

		// Auto-dismiss after 4 seconds on completion
		setTimeout(() => {
			const existingToast = document.getElementById(
				ELEMENT_IDS.TWITTER_IMPORT_PROGRESS_TOAST,
			)
			if (existingToast) {
				dismissToast(existingToast)
			}
		}, 4000)
	}
}

export function updateTwitterImportUI(message: {
	type: string
	importedMessage?: string
	totalImported?: number
}) {
	if (message.type === MESSAGE_TYPES.IMPORT_UPDATE && message.importedMessage) {
		showOrUpdateImportProgressToast(message.importedMessage, false)
	}

	if (message.type === MESSAGE_TYPES.IMPORT_DONE) {
		showOrUpdateImportProgressToast(
			`✓ Imported ${message.totalImported} tweets!`,
			true,
		)
	}
}

export async function handleTwitterNavigation() {
	if (!DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
		return
	}

	if (window.location.pathname === "/i/bookmarks") {
		addTwitterImportButtonForFolders()
		await handleBookmarksPageLoad()
	} else {
		removeAllTwitterUI()
	}
}

/**
 * Adds import buttons to bookmark folders
 */
function addTwitterImportButtonForFolders() {
	if (window.location.pathname !== "/i/bookmarks") {
		return
	}

	const targetElements = document.querySelectorAll(
		".css-175oi2r.r-1wtj0ep.r-16x9es5.r-1mmae3n.r-o7ynqc.r-6416eg.r-1ny4l3l.r-1loqt21",
	)

	targetElements.forEach((element) => {
		addButtonToElement(element as HTMLElement)
	})
}

/**
 * Adds an import button to a bookmark folder element
 */
function addButtonToElement(element: HTMLElement) {
	if (element.querySelector("[data-supermemory-button]")) {
		return
	}

	loadSpaceGroteskFonts()

	const button = createSaveTweetElement(async () => {
		const url = element.getAttribute("href")
		const bookmarkCollectionId = url?.split("/").pop()
		if (bookmarkCollectionId) {
			await showFolderProjectSelectionModal(bookmarkCollectionId)
		}
	})

	button.setAttribute("data-supermemory-button", "true")

	element.appendChild(button)
	element.style.flexDirection = "row"
	element.style.alignItems = "center"
	element.style.justifyContent = "center"
	element.style.gap = "10px"
	element.style.padding = "10px"
}

/**
 * Shows the project selection modal for folder imports
 */
async function showFolderProjectSelectionModal(bookmarkCollectionId: string) {
	await loadSpaceGroteskFonts()

	const modal = createProjectSelectionModal(
		[],
		async (selectedProject) => {
			modal.remove()

			try {
				await browser.runtime.sendMessage({
					type: MESSAGE_TYPES.BATCH_IMPORT_ALL,
					isFolderImport: true,
					bookmarkCollectionId: bookmarkCollectionId,
					selectedProject: selectedProject,
				})
			} catch (error) {
				console.error("Error importing bookmarks:", error)
			}
		},
		() => {
			modal.remove()
		},
	)

	document.body.appendChild(modal)

	try {
		const response = await browser.runtime.sendMessage({
			action: MESSAGE_TYPES.FETCH_PROJECTS,
		})

		if (response.success && response.data) {
			const projects = response.data
			updateModalWithProjects(modal, projects)
		} else {
			console.error("Failed to fetch projects:", response.error)
			updateModalWithProjects(modal, [])
		}
	} catch (error) {
		console.error("Error fetching projects:", error)
		updateModalWithProjects(modal, [])
	}
}

/**
 * Updates the modal with fetched projects
 */
function updateModalWithProjects(
	modal: HTMLElement,
	projects: Array<{ id: string; name: string; containerTag: string }>,
) {
	const select = modal.querySelector("#project-select") as HTMLSelectElement
	if (!select) return

	while (select.children.length > 1) {
		select.removeChild(select.children[1])
	}

	if (projects.length === 0) {
		const noProjectsOption = document.createElement("option")
		noProjectsOption.value = ""
		noProjectsOption.textContent = "No projects available"
		noProjectsOption.disabled = true
		select.appendChild(noProjectsOption)

		const importButton = modal.querySelector(
			"button:last-child",
		) as HTMLButtonElement
		if (importButton) {
			importButton.disabled = true
			importButton.style.cssText = `
				padding: 10px 16px;
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-radius: 12px;
				background: rgba(255, 255, 255, 0.05);
				color: rgba(255, 255, 255, 0.3);
				font-size: 14px;
				font-weight: 500;
				cursor: not-allowed;
				transition: all 0.2s ease;
			`
		}
	} else {
		projects.forEach((project) => {
			const option = document.createElement("option")
			option.value = project.id
			option.textContent = project.name
			option.dataset.containerTag = project.containerTag
			select.appendChild(option)
		})
	}
}
