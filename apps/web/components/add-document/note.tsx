"use client"

import { useState } from "react"
import { TextEditor } from "../text-editor"

interface NoteContentProps {
	onSubmit?: (content: string) => void
	onContentChange?: (content: string) => void
	isSubmitting?: boolean
	isOpen?: boolean
	initialContent?: string
}

export function NoteContent({
	onSubmit,
	onContentChange,
	isSubmitting,
	initialContent,
}: NoteContentProps) {
	const [content, setContent] = useState(initialContent ?? "")
	const [seededContent] = useState(initialContent || undefined)

	const handleSubmit = (submittedContent = content) => {
		if (submittedContent.trim() && !isSubmitting && onSubmit) {
			onSubmit(submittedContent)
		}
	}

	const handleContentChange = (newContent: string) => {
		setContent(newContent)
		onContentChange?.(newContent)
	}

	return (
		<div className="flex h-full min-h-[45dvh] w-full flex-1 overflow-y-auto rounded-[14px] bg-[#10151C] p-3 shadow-inside-out ring-1 ring-[#202A36] md:mb-4! md:bg-[#14161A] md:p-4 md:ring-0">
			<TextEditor
				content={seededContent}
				onContentChange={handleContentChange}
				onSubmit={handleSubmit}
				debounceMs={0}
			/>
		</div>
	)
}
