"use client"

import { GraphDialog } from "@/components/graph-dialog"
import { Header } from "@/components/header"
import { AddMemoryView } from "@/components/views/add-memory"
import { useEffect, useState } from "react"

export default function NavigationLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const [showAddMemoryView, setShowAddMemoryView] = useState(false)
	useEffect(() => {
		const handleKeydown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement
			const isInputField =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				target.closest('[contenteditable="true"]')

			if (isInputField) return

			// add memory shortcut
			if (
				event.key === "c" &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey &&
				!event.shiftKey
			) {
				event.preventDefault()
				setShowAddMemoryView(true)
			}
		}

		document.addEventListener("keydown", handleKeydown)

		return () => {
			document.removeEventListener("keydown", handleKeydown)
		}
	}, [])
	return (
		<div className="relative h-screen flex flex-col">
			<div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
				<Header onAddMemory={() => setShowAddMemoryView(true)} />
			</div>
			<div className="flex-1">{children}</div>
			{showAddMemoryView && (
				<AddMemoryView
					initialTab="note"
					onClose={() => setShowAddMemoryView(false)}
				/>
			)}

			<GraphDialog />
		</div>
	)
}
