"use client"

import { useState, useEffect } from "react"
import { TextEditor } from "../text-editor"
import { isValidUrl } from "@/lib/url-helpers"

function detectContentType(plainText: string): "note" | "link" {
	const trimmed = plainText.trim()
	if (!trimmed) return "note"
	// Must be a single token (no whitespace)
	if (/\s/.test(trimmed)) return "note"
	// Try as-is first (has protocol)
	if (
		trimmed.startsWith("http://") ||
		trimmed.startsWith("https://") ||
		trimmed.startsWith("HTTP://") ||
		trimmed.startsWith("HTTPS://")
	) {
		if (isValidUrl(trimmed)) return "link"
		return "note"
	}
	// Protocol-less: require a dot to avoid classifying single words as links
	if (!trimmed.includes(".")) return "note"
	const withProtocol = `https://${trimmed}`
	if (isValidUrl(withProtocol)) return "link"
	return "note"
}

interface NoteContentProps {
	onSubmit?: (content: string, contentType: "note" | "link") => void
	onContentChange?: (content: string) => void
	onContentTypeChange?: (type: "note" | "link") => void
	onRequestSubmit?: () => void
	isSubmitting?: boolean
	isOpen?: boolean
}

export function NoteContent({
	onSubmit,
	onContentChange,
	onContentTypeChange,
	onRequestSubmit,
	isSubmitting,
	isOpen,
}: NoteContentProps) {
	const [content, setContent] = useState("")
	const [plainText, setPlainText] = useState("")

	const canSubmit = content.trim().length > 0 && !isSubmitting

	const handleSubmit = () => {
		if (canSubmit && onSubmit) {
			const type = detectContentType(plainText)
			if (type === "link") {
				onSubmit(plainText.trim(), "link")
			} else {
				onSubmit(content, "note")
			}
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
			setPlainText("")
			onContentChange?.("")
		}
	}, [isOpen, onContentChange])

	return (
		<div className="flex h-full min-h-[45dvh] w-full flex-1 overflow-y-auto rounded-[14px] bg-[#10151C] p-3 shadow-inside-out ring-1 ring-[#202A36] md:mb-4! md:bg-[#14161A] md:p-4 md:ring-0">
			<TextEditor
				content={undefined}
				onContentChange={handleContentChange}
				onPlainTextChange={(text) => {
					setPlainText(text)
					const type = detectContentType(text)
					onContentTypeChange?.(type)
				}}
				onSubmit={onRequestSubmit ?? handleSubmit}
				debounceMs={0}
			/>
		</div>
	)
}
