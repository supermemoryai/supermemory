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
		<div className="p-4 overflow-y-auto flex-1 w-full h-full mb-4! bg-[#14161A] shadow-inside-out rounded-[14px]">
			<TextEditor
				content={undefined}
				onContentChange={handleContentChange}
				onSubmit={handleSubmit}
			/>
		</div>
	)
}
