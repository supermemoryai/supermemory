"use client"

// Invisible drag strip for the frameless main window.
export function Titlebar() {
	return (
		<header data-tauri-drag-region className="h-2.5 shrink-0 bg-transparent" />
	)
}
