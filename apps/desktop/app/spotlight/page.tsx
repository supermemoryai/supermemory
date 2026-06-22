"use client"

import { Search } from "lucide-react"

// Phase 1 stub for the frameless spotlight window. Phase 5 wires the Rust
// global-shortcut, window show/hide on blur/Esc, input focus on show, and real
// /v3/search results.
export default function SpotlightPage() {
	return (
		<div className="flex h-screen items-start justify-center bg-transparent p-3">
			<div className="w-full overflow-hidden rounded-xl border border-border/60 bg-popover/95 shadow-2xl backdrop-blur">
				<div className="flex items-center gap-3 px-4 py-3">
					<Search className="size-4 shrink-0 text-muted-foreground" />
					<input
						aria-label="Search your memories"
						placeholder="Search your memories…"
						className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
					/>
				</div>
			</div>
		</div>
	)
}
