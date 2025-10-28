import {
	DOMAINS,
	ELEMENT_IDS,
	MESSAGE_TYPES,
	POSTHOG_EVENT_KEY,
} from "../../utils/constants"
import { trackEvent } from "../../utils/posthog"
import {
	createTwitterImportButton,
	createProjectSelectionModal,
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

export function initializeTwitter() {
	if (!DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
		return
	}

	// Initial setup
	if (window.location.pathname === "/i/bookmarks") {
		setTimeout(() => {
			addTwitterImportButton()
			addTwitterImportButtonForFolders()
		}, 2000)
	} else {
		// Remove button if not on bookmarks page
		if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)) {
			DOMUtils.removeElement(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)
		}
	}
}

function addTwitterImportButton() {
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

function addButtonToElement(element: HTMLElement) {
	if (element.querySelector("[data-supermemory-button]")) {
		return
	}

	loadSpaceGroteskFonts()

	const button = createSaveTweetElement(async () => {
		const url = element.getAttribute("href")
		const bookmarkCollectionId = url?.split("/").pop()
		console.log("Bookmark collection ID:", bookmarkCollectionId)
		if (bookmarkCollectionId) {
			await showProjectSelectionModal(bookmarkCollectionId)
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

export function updateTwitterImportUI(message: {
	type: string
	importedMessage?: string
	totalImported?: number
}) {
	const importButton = document.getElementById(
		ELEMENT_IDS.TWITTER_IMPORT_BUTTON,
	)
	if (!importButton) return

	const existingImg = importButton.querySelector("img")
	if (existingImg) {
		existingImg.remove()
		const iconUrl = browser.runtime.getURL("/icon-16.png")
		importButton.style.backgroundImage = `url("${iconUrl}")`
		importButton.style.backgroundRepeat = "no-repeat"
		importButton.style.backgroundSize = "20px 20px"
		importButton.style.backgroundPosition = "8px center"
		importButton.style.padding = "10px 16px 10px 32px"
	}

	let textSpan = importButton.querySelector(
		"#sm-import-text",
	) as HTMLSpanElement
	if (!textSpan) {
		textSpan = document.createElement("span")
		textSpan.id = "sm-import-text"
		textSpan.style.cssText = "font-weight: 500; font-size: 14px;"
		importButton.appendChild(textSpan)
	}

	if (message.type === MESSAGE_TYPES.IMPORT_UPDATE) {
		textSpan.textContent = message.importedMessage || ""
		importButton.style.cursor = "default"
	}

	if (message.type === MESSAGE_TYPES.IMPORT_DONE) {
		textSpan.textContent = `✓ Imported ${message.totalImported} tweets!`
		textSpan.style.color = "#059669"

		setTimeout(() => {
			textSpan.textContent = "Import Bookmarks"
			textSpan.style.color = ""
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
		addTwitterImportButtonForFolders()
	} else {
		if (DOMUtils.elementExists(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)) {
			DOMUtils.removeElement(ELEMENT_IDS.TWITTER_IMPORT_BUTTON)
		}
		document.querySelectorAll("[data-supermemory-button]").forEach((button) => {
			button.remove()
		})
	}
}

/**
 * Shows the project selection modal for folder imports
 * @param bookmarkCollectionId - The ID of the bookmark collection to import
 */
async function showProjectSelectionModal(bookmarkCollectionId: string) {
	try {
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

				if (projects.length === 0) {
					console.warn("No projects available for import")
					updateModalWithProjects(modal, [])
				} else {
					updateModalWithProjects(modal, projects)
				}
			} else {
				console.error("Failed to fetch projects:", response.error)
				updateModalWithProjects(modal, [])
			}
		} catch (error) {
			console.error("Error fetching projects:", error)
			updateModalWithProjects(modal, [])
		}
	} catch (error) {
		console.error("Error showing project selection modal:", error)
	}
}

/**
 * Updates the modal with fetched projects
 * @param modal - The modal element
 * @param projects - Array of projects to populate the dropdown
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
				border: none;
				border-radius: 8px;
				background: #d1d5db;
				color: #9ca3af;
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
