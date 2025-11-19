/**
 * UI Components Module
 * Reusable UI components for the browser extension
 */

import { ELEMENT_IDS, UI_CONFIG } from "./constants"
import type { ToastState } from "./types"

/**
 * Creates a toast notification element
 * @param state - The state of the toast (loading, success, error)
 * @returns HTMLElement - The toast element
 */
export function createToast(state: ToastState): HTMLElement {
	const toast = document.createElement("div")
	toast.id = ELEMENT_IDS.SUPERMEMORY_TOAST

	toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    background: #ffffff;
    border-radius: 9999px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: #374151;
    min-width: 200px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.18), 0 1.5px 6px 0 rgba(0,0,0,0.12);
  `

	// Add keyframe animations and fonts if not already present
	if (!document.getElementById("supermemory-toast-styles")) {
		const style = document.createElement("style")
		style.id = "supermemory-toast-styles"
		style.textContent = `
      @font-face {
        font-family: 'Space Grotesk';
        font-style: normal;
        font-weight: 300;
        font-display: swap;
        src: url('${chrome.runtime.getURL("fonts/SpaceGrotesk-Light.ttf")}') format('truetype');
      }
      @font-face {
        font-family: 'Space Grotesk';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url('${chrome.runtime.getURL("fonts/SpaceGrotesk-Regular.ttf")}') format('truetype');
      }
      @font-face {
        font-family: 'Space Grotesk';
        font-style: normal;
        font-weight: 500;
        font-display: swap;
        src: url('${chrome.runtime.getURL("fonts/SpaceGrotesk-Medium.ttf")}') format('truetype');
      }
      @font-face {
        font-family: 'Space Grotesk';
        font-style: normal;
        font-weight: 600;
        font-display: swap;
        src: url('${chrome.runtime.getURL("fonts/SpaceGrotesk-SemiBold.ttf")}') format('truetype');
      }
      @font-face {
        font-family: 'Space Grotesk';
        font-style: normal;
        font-weight: 700;
        font-display: swap;
        src: url('${chrome.runtime.getURL("fonts/SpaceGrotesk-Bold.ttf")}') format('truetype');
      }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `
		document.head.appendChild(style)
	}

	const icon = document.createElement("div")
	icon.style.cssText = "width: 20px; height: 20px; flex-shrink: 0;"

	let textElement: HTMLElement = document.createElement("span")
	textElement.style.fontWeight = "500"

	// Configure toast based on state
	switch (state) {
		case "loading":
			icon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6V2" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
          <path d="M12 22V18" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
          <path d="M20.49 8.51L18.36 6.38" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
          <path d="M5.64 17.64L3.51 15.51" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
          <path d="M22 12H18" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
          <path d="M6 12H2" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
          <path d="M20.49 15.49L18.36 17.62" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
          <path d="M5.64 6.36L3.51 8.49" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        </svg>
      `
			icon.style.animation = "spin 1s linear infinite"
			textElement.textContent = "Adding to Memory..."
			break

		case "success": {
			const iconUrl = browser.runtime.getURL("/icon-16.png")
			icon.innerHTML = `<img src="${iconUrl}" width="20" height="20" alt="Success" style="border-radius: 2px;" />`
			textElement.textContent = "Added to Memory"
			break
		}

		case "error": {
			icon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#ef4444"/>
          <path d="M15 9L9 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 9L15 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
			const textContainer = document.createElement("div")
			textContainer.style.cssText =
				"display: flex; flex-direction: column; gap: 2px;"

			const mainText = document.createElement("span")
			mainText.style.cssText = "font-weight: 500; line-height: 1.2;"
			mainText.textContent = "Failed to save memory"

			const helperText = document.createElement("span")
			helperText.style.cssText =
				"font-size: 12px; color: #6b7280; font-weight: 400; line-height: 1.2;"
			helperText.textContent = "Make sure you are logged in"

			textContainer.appendChild(mainText)
			textContainer.appendChild(helperText)

			textElement = textContainer
			break
		}
	}

	toast.appendChild(icon)
	toast.appendChild(textElement)

	return toast
}

/**
 * Creates the Twitter import button
 * @param onClick - Click handler for the button
 * @returns HTMLElement - The button element
 */
export function createTwitterImportButton(onClick: () => void): HTMLElement {
	const button = document.createElement("div")
	button.id = ELEMENT_IDS.TWITTER_IMPORT_BUTTON
	button.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 2147483646;
    background: #ffffff;
    color: black;
    border: none;
    border-radius: 50px;
    padding: 10px 16px 10px 32px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
	font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

	const iconUrl = browser.runtime.getURL("/icon-16.png")

	button.style.backgroundImage = `url("${iconUrl}")`
	button.style.backgroundRepeat = "no-repeat"
	button.style.backgroundSize = "20px 20px"
	button.style.backgroundPosition = "8px center"

	const textSpan = document.createElement("span")
	textSpan.id = "sm-import-text"
	textSpan.style.cssText = "font-weight: 500; font-size: 12px;"
	textSpan.textContent = "Import Bookmarks"
	button.appendChild(textSpan)

	button.addEventListener("mouseenter", () => {
		button.style.opacity = "0.8"
		button.style.boxShadow = "0 4px 12px rgba(29, 155, 240, 0.4)"
	})

	button.addEventListener("mouseleave", () => {
		button.style.opacity = "1"
		button.style.boxShadow = "0 2px 8px rgba(29, 155, 240, 0.3)"
	})

	button.addEventListener("click", onClick)

	return button
}

/**
 * Creates a save tweet element button for Twitter/X
 * @param onClick - Click handler for the button
 * @returns HTMLElement - The save button element
 */
export function createSaveTweetElement(onClick: () => void): HTMLElement {
	const iconButton = document.createElement("div")
	iconButton.style.cssText = `
    display: inline-flex;
    align-items: flex-end;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    cursor: pointer;
    margin-right: 10px;
    margin-bottom: 2px;
    z-index: 1000;
  `

	const iconFileName = "/icon-16.png"
	const iconUrl = browser.runtime.getURL(iconFileName)
	iconButton.innerHTML = `
    <img src="${iconUrl}" width="20" height="20" alt="Save to Memory" style="border-radius: 4px;" />
  `

	iconButton.addEventListener("mouseenter", () => {
		iconButton.style.opacity = "1"
	})

	iconButton.addEventListener("mouseleave", () => {
		iconButton.style.opacity = "0.7"
	})

	iconButton.addEventListener("click", (event) => {
		event.stopPropagation()
		event.preventDefault()
		onClick()
	})

	return iconButton
}

/**
 * Creates a save element button for ChatGPT input bar
 * @param onClick - Click handler for the button
 * @returns HTMLElement - The save button element
 */
export function createChatGPTInputBarElement(onClick: () => void): HTMLElement {
	const iconButton = document.createElement("div")
	iconButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: auto;
    height: 24px;
    cursor: pointer;
    transition: opacity 0.2s ease;
    border-radius: 50%;
  `

	// Use appropriate icon based on theme
	const iconFileName = "/icon-16.png"
	const iconUrl = browser.runtime.getURL(iconFileName)
	iconButton.innerHTML = `
    <img src="${iconUrl}" width="20" height="20" alt="Save to Memory" style="border-radius: 50%;" />
  `

	iconButton.addEventListener("mouseenter", () => {
		iconButton.style.opacity = "0.8"
	})

	iconButton.addEventListener("mouseleave", () => {
		iconButton.style.opacity = "1"
	})

	iconButton.addEventListener("click", (event) => {
		event.stopPropagation()
		event.preventDefault()
		onClick()
	})

	return iconButton
}

/**
 * Creates a save element button for Claude input bar
 * @param onClick - Click handler for the button
 * @returns HTMLElement - The save button element
 */
export function createClaudeInputBarElement(onClick: () => void): HTMLElement {
	const iconButton = document.createElement("div")
	iconButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: auto;
    height: 32px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 6px;
    background: transparent;
  `

	const iconFileName = "/icon-16.png"
	const iconUrl = browser.runtime.getURL(iconFileName)
	iconButton.innerHTML = `
    <img src="${iconUrl}" width="20" height="20" alt="Get Related Memories from supermemory" style="border-radius: 4px;" />
  `

	iconButton.addEventListener("mouseenter", () => {
		iconButton.style.backgroundColor = "rgba(0, 0, 0, 0.05)"
		iconButton.style.borderColor = "rgba(0, 0, 0, 0.2)"
	})

	iconButton.addEventListener("mouseleave", () => {
		iconButton.style.backgroundColor = "transparent"
		iconButton.style.borderColor = "rgba(0, 0, 0, 0.1)"
	})

	iconButton.addEventListener("click", (event) => {
		event.stopPropagation()
		event.preventDefault()
		onClick()
	})

	return iconButton
}

/**
 * Creates a save element button for T3.chat input bar
 * @param onClick - Click handler for the button
 * @returns HTMLElement - The save button element
 */
export function createT3InputBarElement(onClick: () => void): HTMLElement {
	const iconButton = document.createElement("div")
	iconButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: auto;
    height: 32px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 6px;
    background: transparent;
  `

	const iconFileName = "/icon-16.png"
	const iconUrl = browser.runtime.getURL(iconFileName)
	iconButton.innerHTML = `
    <img src="${iconUrl}" width="20" height="20" alt="Get Related Memories from supermemory" style="border-radius: 4px;" />
  `

	iconButton.addEventListener("mouseenter", () => {
		iconButton.style.backgroundColor = "rgba(0, 0, 0, 0.05)"
		iconButton.style.borderColor = "rgba(0, 0, 0, 0.2)"
	})

	iconButton.addEventListener("mouseleave", () => {
		iconButton.style.backgroundColor = "transparent"
		iconButton.style.borderColor = "rgba(0, 0, 0, 0.1)"
	})

	iconButton.addEventListener("click", (event) => {
		event.stopPropagation()
		event.preventDefault()
		onClick()
	})

	return iconButton
}

/**
 * Creates a project selection modal for Twitter folder imports
 * @param projects - Array of available projects
 * @param onImport - Callback when import is clicked with selected project
 * @param onClose - Callback when modal is closed
 * @returns HTMLElement - The modal element
 */
export function createProjectSelectionModal(
	projects: Array<{ id: string; name: string; containerTag: string }>,
	onImport: (project: {
		id: string
		name: string
		containerTag: string
	}) => void,
	onClose: () => void,
): HTMLElement {
	const modal = document.createElement("div")
	modal.id = "sm-project-selection-modal"
	modal.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2147483648;
		font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	`

	const dialog = document.createElement("div")
	dialog.style.cssText = `
		background: #05070A;
		border-radius: 12px;
		padding: 24px;
		max-width: 400px;
		width: 90%;
		box-shadow: 0 8px 32px rgba(5, 7, 10, 0.2);
		position: relative;
	`

	const header = document.createElement("div")
	header.style.cssText = `
		margin-bottom: 20px;
	`

	const iconUrl = browser.runtime.getURL("/icon-16.png")
	header.innerHTML = `
	<div style="display: flex; flex-direction: column; gap: 8px;">
	    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #ffffff; display: flex; align-items: center; gap: 8px;">
			<img src="${iconUrl}" width="20" height="20" alt="Supermemory" style="border-radius: 4px;" />
			Import to Supermemory
		</h3>
		<p style="margin: 0; font-size: 14px; font-weight: 400; color: #ffffff; opacity: 0.7;">
			The project you want to import your bookmarks to.
		</p>
	</div>
	`

	const form = document.createElement("div")
	form.style.cssText = `
		display: flex;
		flex-direction: column;
		gap: 16px;
	`

	const selectContainer = document.createElement("div")
	selectContainer.style.cssText = `
		display: flex;
		flex-direction: column;
		gap: 8px;
	`

	const label = document.createElement("label")
	label.style.cssText = `
		font-size: 14px;
		font-weight: 500;
		color: #ffffff;
	`
	label.textContent = "Select Project to import"

	const select = document.createElement("select")
	select.id = "project-select"
	select.style.cssText = `
		padding: 12px 40px 12px 16px;
		border: none;
		border-radius: 12px;
		font-size: 14px;
		background: rgba(91, 126, 245, 0.04);
		box-shadow: -1px -1px 1px 0 rgba(82, 89, 102, 0.08) inset, 2px 2px 1px 0 rgba(0, 0, 0, 0.50) inset;
		color: #ffffff;
		cursor: pointer;
		transition: border-color 0.2s ease;
		appearance: none;
		background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
		background-repeat: no-repeat;
		background-position: right 16px center;
		background-size: 16px;
		font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	`
	select.addEventListener("focus", () => {
		select.style.borderColor = "#1A88FF"
	})
	select.addEventListener("blur", () => {
		select.style.borderColor = "#374151"
	})

	// Add default option
	const defaultOption = document.createElement("option")
	defaultOption.value = ""
	defaultOption.textContent = "Choose a project..."
	defaultOption.disabled = true
	defaultOption.selected = true
	select.appendChild(defaultOption)

	// Add project options
	projects.forEach((project) => {
		const option = document.createElement("option")
		option.value = project.id
		option.textContent = project.name
		option.dataset.containerTag = project.containerTag
		select.appendChild(option)
	})

	const buttonContainer = document.createElement("div")
	buttonContainer.style.cssText = `
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 8px;
	`

	const cancelButton = document.createElement("button")
	cancelButton.textContent = "Cancel"
	cancelButton.style.cssText = `
		padding: 10px 16px;
		color: #ffffff;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border-radius: 10px;
		border: none;
		background: #05070A;
	`
	cancelButton.addEventListener("mouseenter", () => {
		cancelButton.style.backgroundColor = "#f9fafb"
		cancelButton.style.color = "#05070A"
	})
	cancelButton.addEventListener("mouseleave", () => {
		cancelButton.style.backgroundColor = "#05070A"
		cancelButton.style.color = "#ffffff"
	})

	const importButton = document.createElement("button")
	importButton.textContent = "Import"
	importButton.style.cssText = `
		padding: 10px 16px;
		border: none;
		border-radius: 12px;
		background: #d1d5db;
		color: #9ca3af;
		font-size: 14px;
		font-weight: 500;
		cursor: not-allowed;
		transition: all 0.2s ease;
	`
	importButton.disabled = true

	// Handle project selection
	select.addEventListener("change", () => {
		const selectedOption = select.options[select.selectedIndex]
		if (selectedOption.value) {
			importButton.disabled = false
			importButton.style.cssText = `
				padding: 10px 16px;
				border: none;
				border-radius: 12px;
				background: linear-gradient(203deg, #0FF0D2 -49.88%, #5BD3FB -33.14%, #1E0FF0 81.81%);
				box-shadow: 1px 1px 2px 1px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20);
				color: #ffffff;
				font-size: 14px;
				font-weight: 500;
				cursor: pointer;
				transition: all 0.2s ease;
			`
		} else {
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
	})

	// Handle import button click
	importButton.addEventListener("click", () => {
		const selectedOption = select.options[select.selectedIndex]
		if (selectedOption.value) {
			const selectedProject = {
				id: selectedOption.value,
				name: selectedOption.textContent,
				containerTag: selectedOption.dataset.containerTag || "",
			}
			onImport(selectedProject)
		}
	})

	// Handle cancel button click
	cancelButton.addEventListener("click", onClose)

	// Handle overlay click to close
	modal.addEventListener("click", (e) => {
		if (e.target === modal) {
			onClose()
		}
	})

	// Handle escape key
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			onClose()
		}
	}
	document.addEventListener("keydown", handleKeyDown)

	// Clean up event listener when modal is removed
	const observer = new MutationObserver(() => {
		if (!document.contains(modal)) {
			document.removeEventListener("keydown", handleKeyDown)
			observer.disconnect()
		}
	})
	observer.observe(document.body, { childList: true, subtree: true })

	selectContainer.appendChild(label)
	selectContainer.appendChild(select)
	form.appendChild(selectContainer)
	buttonContainer.appendChild(cancelButton)
	buttonContainer.appendChild(importButton)
	form.appendChild(buttonContainer)

	dialog.appendChild(header)
	dialog.appendChild(form)
	modal.appendChild(dialog)

	return modal
}

/**
 * Utility functions for DOM manipulation
 */
export const DOMUtils = {
	/**
	 * Check if current page is on specified domains
	 * @param domains - Array of domain names to check
	 * @returns boolean
	 */
	isOnDomain(domains: readonly string[]): boolean {
		return domains.includes(window.location.hostname)
	},

	/**
	 * Detect if the page is in dark mode based on color-scheme style
	 * @returns boolean - true if dark mode, false if light mode
	 */
	isDarkMode(): boolean {
		const htmlElement = document.documentElement
		const style = htmlElement.getAttribute("style")
		return style?.includes("color-scheme: dark") || false
	},

	/**
	 * Check if element exists in DOM
	 * @param id - Element ID to check
	 * @returns boolean
	 */
	elementExists(id: string): boolean {
		return !!document.getElementById(id)
	},

	/**
	 * Remove element from DOM if it exists
	 * @param id - Element ID to remove
	 */
	removeElement(id: string): void {
		const element = document.getElementById(id)
		element?.remove()
	},

	/**
	 * Show toast notification with auto-dismiss
	 * @param state - Toast state
	 * @param duration - Duration to show toast (default from config)
	 * @returns The toast element
	 */
	showToast(
		state: ToastState,
		duration: number = UI_CONFIG.TOAST_DURATION,
	): HTMLElement {
		const existingToast = document.getElementById(ELEMENT_IDS.SUPERMEMORY_TOAST)

		if ((state === "success" || state === "error") && existingToast) {
			const icon = existingToast.querySelector("div")
			const text = existingToast.querySelector("span")

			if (icon && text) {
				if (state === "success") {
					const iconUrl = browser.runtime.getURL("/icon-16.png")
					icon.innerHTML = `<img src="${iconUrl}" width="20" height="20" alt="Success" style="border-radius: 2px;" />`
					icon.style.animation = ""
					text.textContent = "Added to Memory"
				} else if (state === "error") {
					icon.innerHTML = `
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<circle cx="12" cy="12" r="10" fill="#ef4444"/>
							<path d="M15 9L9 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M9 9L15 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					`
					icon.style.animation = ""

					const textContainer = document.createElement("div")
					textContainer.style.cssText =
						"display: flex; flex-direction: column; gap: 2px;"

					const mainText = document.createElement("span")
					mainText.style.cssText = "font-weight: 500; line-height: 1.2;"
					mainText.textContent = "Failed to save memory"

					const helperText = document.createElement("span")
					helperText.style.cssText =
						"font-size: 12px; color: #6b7280; font-weight: 400; line-height: 1.2;"
					helperText.textContent = "Make sure you are logged in"

					textContainer.appendChild(mainText)
					textContainer.appendChild(helperText)

					text.innerHTML = ""
					text.appendChild(textContainer)
				}

				// Auto-dismiss
				setTimeout(() => {
					if (document.body.contains(existingToast)) {
						existingToast.style.animation = "fadeOut 0.3s ease-out"
						setTimeout(() => {
							if (document.body.contains(existingToast)) {
								existingToast.remove()
							}
						}, 300)
					}
				}, duration)

				return existingToast
			}
		}

		const existingToasts = document.querySelectorAll(
			`#${ELEMENT_IDS.SUPERMEMORY_TOAST}`,
		)
		existingToasts.forEach((toast) => {
			toast.remove()
		})

		const toast = createToast(state)
		document.body.appendChild(toast)

		// Auto-dismiss for success and error states
		if (state === "success" || state === "error") {
			setTimeout(() => {
				if (document.body.contains(toast)) {
					toast.style.animation = "fadeOut 0.3s ease-out"
					setTimeout(() => {
						if (document.body.contains(toast)) {
							toast.remove()
						}
					}, 300)
				}
			}, duration)
		}

		return toast
	},
}
