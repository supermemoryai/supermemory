"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { Logo } from "@ui/assets/Logo"
import { Minimize2, Plus, Loader2 } from "lucide-react"
import { useAuth } from "@lib/auth-context"
import { TextEditor } from "./text-editor"
import { useProject } from "@/stores"
import { useQuickNoteDraft } from "@/stores/quick-note-draft"

interface FullscreenNoteModalProps {
	isOpen: boolean
	onClose: () => void
	initialContent?: string
	onSave: (content: string) => void
	isSaving?: boolean
}

export function FullscreenNoteModal({
	isOpen,
	onClose,
	initialContent = "",
	onSave,
	isSaving = false,
}: FullscreenNoteModalProps) {
	const { user } = useAuth()
	const { selectedProject } = useProject()
	const { setDraft } = useQuickNoteDraft(selectedProject)
	const [content, setContent] = useState(initialContent)
	const contentRef = useRef(content)

	useEffect(() => {
		contentRef.current = content
	}, [content])

	useEffect(() => {
		if (isOpen) {
			setContent(initialContent)
		}
	}, [isOpen, initialContent])

	const displayName =
		user?.displayUsername ||
		(typeof window !== "undefined" && localStorage.getItem("username")) ||
		(typeof window !== "undefined" && localStorage.getItem("userName")) ||
		""
	const userName = displayName ? `${displayName.split(" ")[0]}'s` : "My"

	const handleSave = useCallback(() => {
		const currentContent = contentRef.current
		if (currentContent.trim() && !isSaving) {
			onSave(currentContent)
		}
	}, [isSaving, onSave])

	const handleContentChange = useCallback(
		(newContent: string) => {
			console.log("handleContentChange", newContent)
			setContent(newContent)
			setDraft(newContent)
		},
		[setDraft],
	)

	const canSave = content.trim().length > 0 && !isSaving

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				e.preventDefault()
				onClose()
			}
		}

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown)
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown)
		}
	}, [isOpen, onClose])

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"border-none bg-[#0D121A] flex flex-col p-0 gap-0",
					"w-screen! h-screen! max-w-none! max-h-none! rounded-none",
					dmSansClassName(),
				)}
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">New Note</DialogTitle>

				<header className="flex justify-between items-center p-3 md:p-4">
					<div className="flex items-center gap-2">
						<Logo className="h-7" />
						{userName && (
							<div className="flex flex-col items-start justify-center ml-2">
								<p className="text-[#8B8B8B] text-[11px] leading-tight">
									{userName}
								</p>
								<p className="text-white font-bold text-xl leading-none -mt-1">
									supermemory
								</p>
							</div>
						)}
					</div>

					<div
						id="fullscreen-close-controls"
						className="bg-[#1B1F24] rounded-[8px] px-3 py-2.5 flex items-center gap-2.5"
						style={{
							boxShadow:
								"0 4px 20px 0 rgba(0, 0, 0, 0.25), inset 1px 1px 1px 0 rgba(255, 255, 255, 0.1)",
						}}
					>
						<span
							className={cn(
								"bg-[rgba(33,33,33,0.5)] border border-[rgba(115,115,115,0.2)] rounded px-1 py-0.5 flex items-center justify-center h-4",
							)}
						>
							<span
								className={cn(
									dmSansClassName(),
									"text-[10px] font-medium text-[#737373]",
								)}
							>
								ESC
							</span>
						</span>
						<button
							type="button"
							onClick={onClose}
							className="text-[#fafafa] hover:text-white transition-colors cursor-pointer"
							aria-label="Close full screen"
						>
							<Minimize2 className="size-6" />
						</button>
					</div>
				</header>

				<main className="flex-1 flex flex-col items-center px-4 md:px-[288px] pt-8 md:pt-12 pb-24 overflow-auto">
					<div className="w-full max-w-[864px] space-y-4">
						<div className="min-h-[400px] flex-1">
							<TextEditor
								content={initialContent || undefined}
								onContentChange={handleContentChange}
								onSubmit={handleSave}
							/>
						</div>
					</div>
				</main>

				<div
					id="fullscreen-save-bar"
					className="fixed bottom-8 left-1/2 -translate-x-1/2"
				>
					<button
						type="button"
						onClick={handleSave}
						disabled={!canSave}
						className={cn(
							"bg-[#1B1F24] rounded-[8px] px-4 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
						)}
						style={{
							boxShadow:
								"0 4px 20px 0 rgba(0, 0, 0, 0.25), inset 1px 1px 1px 0 rgba(255, 255, 255, 0.1)",
						}}
					>
						{isSaving ? (
							<Loader2 className="size-2 animate-spin text-[#fafafa]" />
						) : (
							<Plus className="size-2 text-[#fafafa]" />
						)}
						<span
							className={cn(
								dmSansClassName(),
								"text-[14px] font-medium text-[#fafafa]",
							)}
						>
							{isSaving ? "Saving..." : "Save note"}
						</span>

						<span
							className={cn(
								"bg-[rgba(33,33,33,0.5)] border border-[rgba(115,115,115,0.2)] rounded px-1 py-0.5 flex items-center gap-1 h-4 ml-1",
							)}
						>
							<svg
								className="size-[10px]"
								viewBox="0 0 9 9"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Command Key</title>
								<path
									d="M6.66663 0.416626C6.33511 0.416626 6.01716 0.548322 5.78274 0.782743C5.54832 1.01716 5.41663 1.33511 5.41663 1.66663V6.66663C5.41663 6.99815 5.54832 7.31609 5.78274 7.55051C6.01716 7.78493 6.33511 7.91663 6.66663 7.91663C6.99815 7.91663 7.31609 7.78493 7.55051 7.55051C7.78493 7.31609 7.91663 6.99815 7.91663 6.66663C7.91663 6.33511 7.78493 6.01716 7.55051 5.78274C7.31609 5.54832 6.99815 5.41663 6.66663 5.41663H1.66663C1.33511 5.41663 1.01716 5.54832 0.782743 5.78274C0.548322 6.01716 0.416626 6.33511 0.416626 6.66663C0.416626 6.99815 0.548322 7.31609 0.782743 7.55051C1.01716 7.78493 1.33511 7.91663 1.66663 7.91663C1.99815 7.91663 2.31609 7.78493 2.55051 7.55051C2.78493 7.31609 2.91663 6.99815 2.91663 6.66663V1.66663C2.91663 1.33511 2.78493 1.01716 2.55051 0.782743C2.31609 0.548322 1.99815 0.416626 1.66663 0.416626C1.33511 0.416626 1.01716 0.548322 0.782743 0.782743C0.548322 1.01716 0.416626 1.33511 0.416626 1.66663C0.416626 1.99815 0.548322 2.31609 0.782743 2.55051C1.01716 2.78493 1.33511 2.91663 1.66663 2.91663H6.66663C6.99815 2.91663 7.31609 2.78493 7.55051 2.55051C7.78493 2.31609 7.91663 1.99815 7.91663 1.66663C7.91663 1.33511 7.78493 1.01716 7.55051 0.782743C7.31609 0.548322 6.99815 0.416626 6.66663 0.416626Z"
									stroke="#737373"
									strokeWidth="0.833333"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							<span
								className={cn(
									dmSansClassName(),
									"text-[10px] font-medium text-[#737373]",
								)}
							>
								Enter
							</span>
						</span>
					</button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
