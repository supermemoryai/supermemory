"use client"

import { useRef, useCallback } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { Maximize2, Plus, Loader2 } from "lucide-react"
import { useProject } from "@/stores"
import { useQuickNoteDraft } from "@/stores/quick-note-draft"

interface QuickNoteCardProps {
	onSave: (content: string) => void
	onMaximize: (content: string) => void
	isSaving?: boolean
}

export function QuickNoteCard({
	onSave,
	onMaximize,
	isSaving = false,
}: QuickNoteCardProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const { selectedProject } = useProject()
	const { draft, setDraft } = useQuickNoteDraft(selectedProject)

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setDraft(e.target.value)
		},
		[setDraft],
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
				e.preventDefault()
				if (draft.trim() && !isSaving) {
					onSave(draft)
				}
			}
		},
		[draft, isSaving, onSave],
	)

	const handleSaveClick = useCallback(() => {
		if (draft.trim() && !isSaving) {
			onSave(draft)
		}
	}, [draft, isSaving, onSave])

	const handleMaximizeClick = useCallback(() => {
		onMaximize(draft)
	}, [draft, onMaximize])

	const canSave = draft.trim().length > 0 && !isSaving

	return (
		<div
			className="bg-[#1B1F24] rounded-[22px] p-1"
			style={{
				boxShadow:
					"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
			}}
		>
			<div
				id="quick-note-inner"
				className="bg-[#0B1017] rounded-[18px] p-3 relative"
				style={{
					boxShadow: "inset 1.421px 1.421px 4.263px 0 rgba(11, 15, 21, 0.4)",
				}}
			>
				<button
					type="button"
					onClick={handleMaximizeClick}
					className="absolute top-3 right-3 text-[#737373] hover:text-white transition-colors cursor-pointer"
					aria-label="Expand to full screen"
				>
					<Maximize2 className="size-[14px]" />
				</button>

				<textarea
					ref={textareaRef}
					value={draft}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					placeholder="Start writing..."
					disabled={isSaving}
					className={cn(
						dmSansClassName(),
						"w-full h-[120px] bg-transparent resize-none outline-none text-[12px] leading-normal text-white placeholder:text-[#737373] pr-5 disabled:opacity-50",
					)}
				/>

				<div
					id="quick-note-action-bar"
					className="bg-[#1B1F24] rounded-[8px] px-2 py-1.5 flex items-center justify-center gap-8 w-full"
					style={{
						boxShadow:
							"0 4px 20px 0 rgba(0, 0, 0, 0.25), inset 1px 1px 1px 0 rgba(255, 255, 255, 0.1)",
					}}
				>
					<button
						type="button"
						onClick={handleSaveClick}
						disabled={!canSave}
						className={cn(
							"flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
						)}
					>
						<span className="flex items-center gap-1.5">
							{isSaving ? (
								<Loader2 className="size-2 animate-spin text-[#fafafa]" />
							) : (
								<Plus className="size-2 text-[#fafafa]" />
							)}
							<span
								className={cn(
									dmSansClassName(),
									"text-[10px] font-medium text-[#fafafa]",
								)}
							>
								{isSaving ? "Saving..." : "Save note"}
							</span>
						</span>

						<span
							className={cn(
								"bg-[rgba(33,33,33,0.5)] border border-[rgba(115,115,115,0.2)] rounded px-1 py-0.5 flex items-center gap-1 h-4",
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
			</div>
		</div>
	)
}
