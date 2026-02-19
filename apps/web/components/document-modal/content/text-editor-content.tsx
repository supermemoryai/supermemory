"use client"

import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { TextEditor } from "../../text-editor"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@repo/ui/components/button"
import { Loader2 } from "lucide-react"

export interface TextEditorProps {
	documentId: string
	editorResetNonce: number
	initialEditorContent: string | undefined
	hasUnsavedChanges: boolean
	isSaving: boolean
	onContentChange: (content: string) => void
	onSave: () => void
	onReset: () => void
}

export function TextEditorContent({
	documentId,
	editorResetNonce,
	initialEditorContent,
	hasUnsavedChanges,
	isSaving,
	onContentChange,
	onSave,
	onReset,
}: TextEditorProps) {
	return (
		<>
			<div className="p-4 overflow-y-auto flex-1 scrollbar-thin">
				<TextEditor
					key={`${documentId}-${editorResetNonce}`}
					content={initialEditorContent}
					onContentChange={onContentChange}
					onSubmit={onSave}
				/>
			</div>
			<AnimatePresence>
				{hasUnsavedChanges && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 20 }}
						transition={{ duration: 0.2 }}
						className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-[#1B1F24] rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_1px_1px_1px_rgba(255,255,255,0.1)]"
					>
						<span className="text-sm text-[#737373]">Unsaved changes</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={onReset}
							disabled={isSaving}
							className="text-[#737373]/80 hover:text-white rounded-full px-3"
						>
							Cancel
						</Button>
						<Button
							variant="insideOut"
							size="sm"
							onClick={onSave}
							disabled={isSaving}
							className="hover:text-white rounded-full px-4"
						>
							{isSaving ? (
								<>
									<Loader2 className="size-4 animate-spin mr-1" />
									Saving...
								</>
							) : (
								<>
									Save
									<span
										className={cn(
											"bg-[#21212180] border border-[#73737333] text-[#737373] rounded-sm px-1 py-0.5 text-[10px] flex items-center justify-center",
											dmSansClassName(),
										)}
									>
										⌘+Enter
									</span>
								</>
							)}
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	)
}
