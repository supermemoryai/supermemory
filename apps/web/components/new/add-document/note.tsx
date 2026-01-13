"use client"

import { useState, useEffect } from "react"
import { useHotkeys } from "react-hotkeys-hook"

interface NoteContentProps {
	onSubmit?: (content: string) => void
	onContentChange?: (content: string) => void
	isSubmitting?: boolean
	isOpen?: boolean
}

export function NoteContent({ onSubmit, onContentChange, isSubmitting, isOpen }: NoteContentProps) {
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

	useHotkeys("mod+enter", handleSubmit, {
		enabled: isOpen && canSubmit,
		enableOnFormTags: ["TEXTAREA"],
	})

	// Reset content when modal closes
	useEffect(() => {
		if (!isOpen) {
			setContent("")
			onContentChange?.("")
		}
	}, [isOpen, onContentChange])

	return (
		<textarea
			value={content}
			onChange={(e) => handleContentChange(e.target.value)}
			placeholder="Write your note here..."
			disabled={isSubmitting}
			className="w-full h-full p-4 mb-4! rounded-[14px] bg-[#14161A] shadow-inside-out resize-none disabled:opacity-50"
		/>
	)
}
