"use client"

import { useState, useEffect } from "react"
import { TextEditor } from "../text-editor"

interface NoteContentProps {
	onSubmit?: (content: string) => void
	onContentChange?: (content: string) => void
	isSubmitting?: boolean
	isOpen?: boolean
}

export function NoteContent({
	onSubmit,
	onContentChange,
	isSubmitting,
	isOpen,
}: NoteContentProps) {
	const [content, setContent] = useState("")

	const canSubmit = content.trim().length > 0 && !isSubmitting

	const handleSubmit = () => {
		if (canSubmit && onSubmit) {
			onSubmit(content)
		}
	}

	const handleContentChange = (newContent: string) => {
		setContent(newContent)
		onContentChange?.(newContent)
	}

	// Reset content when modal closes
	useEffect(() => {
		if (!isOpen) {
			setContent("")
			onContentChange?.("")
		}
	}, [isOpen, onContentChange])

	return (
		<div className="flex h-full min-h-[45dvh] w-full flex-1 overflow-y-auto rounded-[14px] bg-[#10151C] p-3 shadow-inside-out ring-1 ring-[#202A36] md:mb-4! md:bg-[#14161A] md:p-4 md:ring-0">
			<TextEditor
				content={undefined}
				onContentChange={handleContentChange}
				onSubmit={handleSubmit}
				debounceMs={0}
			/>
		</div>
	)
}
