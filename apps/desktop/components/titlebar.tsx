"use client"

// Draggable strip for the frameless main window. On macOS the native traffic
// lights overlay the top-left (tauri.conf.json -> titleBarStyle: "Overlay"),
// so we pad left to clear them. `data-tauri-drag-region` is the hook that lets
// Tauri move the OS window when this strip is dragged.
export function Titlebar({ title = "Supermemory" }: { title?: string }) {
	return (
		<header
			data-tauri-drag-region
			className="flex h-10 shrink-0 items-center justify-center border-white/[0.06] border-b bg-[#05080D]/70 pl-20 font-medium text-[#737B86] text-xs backdrop-blur-md"
		>
			{title}
		</header>
	)
}
