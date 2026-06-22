"use client"

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@ui/components/command"
import { FileText, Hash, MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"

// Mock data for Phase 1. Phase 5 swaps this for /v3/search results and wires the
// OS-global hotkey via the Rust global-shortcut plugin. The point here is to
// mount the real command-palette UI (cmdk + shared theme) behind an in-app
// Cmd/Ctrl+K — the precursor to the spotlight window.
const MOCK_RESULTS = [
	{ id: "1", title: "Q3 planning notes", kind: "doc" },
	{ id: "2", title: "Tauri vs Electron — research", kind: "doc" },
	{ id: "3", title: "engineering", kind: "space" },
	{ id: "4", title: "Desktop app architecture", kind: "chat" },
] as const

const ICONS = { doc: FileText, space: Hash, chat: MessageSquare }

export function SearchCommand({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput placeholder="Search your memories…" />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup heading="Memories">
					{MOCK_RESULTS.map((result) => {
						const Icon = ICONS[result.kind]
						return (
							<CommandItem
								key={result.id}
								value={result.title}
								onSelect={() => onOpenChange(false)}
							>
								<Icon />
								{result.title}
							</CommandItem>
						)
					})}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	)
}

// In-app Cmd/Ctrl+K toggles the palette. (The OS-global hotkey arrives in Phase 5
// from the Rust side; this is the in-window shortcut.)
export function useCommandK() {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				setOpen((prev) => !prev)
			}
		}
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [])

	return { open, setOpen }
}
