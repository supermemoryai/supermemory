/**
 * Memory Popup Utilities
 * Standardized popup positioning and styling for memory display across platforms
 */

export interface MemoryPopupConfig {
	memoriesData: string
	onClose: () => void
	onRemove?: () => void
}

export function createMemoryPopup(config: MemoryPopupConfig): HTMLElement {
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
		overflow: hidden;
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
		<span style="font-size: 11px; font-weight: 600; letter-spacing: 0.5px;">INCLUDED MEMORIES</span>
		<div style="display: flex; gap: 4px;">
			${config.onRemove ? '<button id="remove-memories-btn" style="background: none; border: none; color: #ff4444; cursor: pointer; font-size: 14px; padding: 2px; border-radius: 2px;" title="Remove memories">✕</button>' : ""}
			<button id="close-popup-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 14px; padding: 2px; border-radius: 2px;">✕</button>
		</div>
	`

	const content = document.createElement("div")
	content.style.cssText = `
		padding: 8px;
		max-height: 300px;
		overflow-y: auto;
		line-height: 1.4;
	`
	content.textContent = config.memoriesData

	const closeBtn = header.querySelector("#close-popup-btn")
	closeBtn?.addEventListener("click", config.onClose)

	const removeBtn = header.querySelector("#remove-memories-btn")
	if (removeBtn && config.onRemove) {
		removeBtn.addEventListener("click", config.onRemove)
	}

	popup.appendChild(header)
	popup.appendChild(content)

	return popup
}

export function showMemoryPopup(popup: HTMLElement): void {
	popup.style.display = "block"

	setTimeout(() => {
		if (popup.style.display === "block") {
			hideMemoryPopup(popup)
		}
	}, 10000)
}

export function hideMemoryPopup(popup: HTMLElement): void {
	popup.style.display = "none"
}

export function toggleMemoryPopup(popup: HTMLElement): void {
	if (popup.style.display === "none" || popup.style.display === "") {
		showMemoryPopup(popup)
	} else {
		hideMemoryPopup(popup)
	}
}
