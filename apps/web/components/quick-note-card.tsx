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
									d="M6.67 0.42C6.34 0.42 6.02 0.55 5.78 0.78C5.55 1.02 5.42 1.34 5.42 1.67V6.67C5.42 7 5.55 7.32 5.78 7.55C6.02 7.78 6.34 7.92 6.67 7.92C7 7.92 7.32 7.78 7.55 7.55C7.78 7.32 7.92 7 7.92 6.67C7.92 6.34 7.78 6.02 7.55 5.78C7.32 5.55 7 5.42 6.67 5.42H1.67C1.34 5.42 1.02 5.55 0.78 5.78C0.55 6.02 0.42 6.34 0.42 6.67C0.42 7 0.55 7.32 0.78 7.55C1.02 7.78 1.34 7.92 1.67 7.92C2 7.92 2.32 7.78 2.55 7.55C2.78 7.32 2.92 7 2.92 6.67V1.67C2.92 1.34 2.78 1.02 2.55 0.78C2.32 0.55 2 0.42 1.67 0.42C1.34 0.42 1.02 0.55 0.78 0.78C0.55 1.02 0.42 1.34 0.42 1.67C0.42 2 0.55 2.32 0.78 2.55C1.02 2.78 1.34 2.92 1.67 2.92H6.67C7 2.92 7.32 2.78 7.55 2.55C7.78 2.32 7.92 2 7.92 1.67C7.92 1.34 7.78 1.02 7.55 0.78C7.32 0.55 7 0.42 6.67 0.42Z"
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
