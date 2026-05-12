"use client"

import { useState, useEffect, useRef } from "react"
import { TextEditor } from "../text-editor"
import { isValidUrl } from "@/lib/url-helpers"
import { isAcceptedFile } from "./file"
import { toast } from "sonner"
import {
	FileIcon,
	XIcon,
	Loader2,
	CheckIcon,
	AlertCircleIcon,
} from "lucide-react"

function detectContentType(plainText: string): "note" | "link" {
	const trimmed = plainText.trim()
	if (!trimmed) return "note"
	// Must be a single token (no whitespace)
	if (/\s/.test(trimmed)) return "note"
	// Try as-is first (has protocol — case-insensitive check)
	const lower = trimmed.toLowerCase()
	if (lower.startsWith("http://") || lower.startsWith("https://")) {
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
	onPlainTextChange?: (text: string) => void
	onContentTypeChange?: (type: "note" | "link") => void
	onRequestSubmit?: () => void
	isSubmitting?: boolean
	isOpen?: boolean
	onFilesDropped?: (files: File[]) => void
	onRemoveFile?: (id: string) => void
	onRetryFile?: (id: string) => void
	droppedFiles?: {
		id: string
		name: string
		size: number
		status: "pending" | "uploading" | "success" | "error"
		errorMessage?: string
	}[]
}

export function NoteContent({
	onSubmit,
	onContentChange,
	onPlainTextChange,
	onContentTypeChange,
	onRequestSubmit,
	isSubmitting,
	isOpen,
	onFilesDropped,
	onRemoveFile,
	onRetryFile,
	droppedFiles,
}: NoteContentProps) {
	const [content, setContent] = useState("")
	const [plainText, setPlainText] = useState("")
	const [isDragging, setIsDragging] = useState(false)
	const dragCounter = useRef(0)

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

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault()
		dragCounter.current++
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		dragCounter.current--
		if (dragCounter.current === 0) setIsDragging(false)
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		dragCounter.current = 0
		setIsDragging(false)

		if (e.dataTransfer.files?.length) {
			const incoming = Array.from(e.dataTransfer.files)
			const accepted = incoming.filter(isAcceptedFile)
			const rejected = incoming.length - accepted.length
			if (rejected > 0) {
				toast.error(
					rejected === 1
						? "One file type is not supported"
						: `${rejected} files are not supported`,
				)
			}
			if (accepted.length > 0) {
				onFilesDropped?.(accepted)
			}
		}
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
		<div className="flex h-full flex-col">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop zone requires event handlers on a div */}
			<div
				className="relative flex min-h-[45dvh] w-full flex-1 overflow-y-auto rounded-[14px] bg-[#10151C] p-3 shadow-inside-out ring-1 ring-[#202A36] md:mb-4! md:bg-[#14161A] md:p-4 md:ring-0"
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
			>
				<TextEditor
					content={undefined}
					onContentChange={handleContentChange}
					onPlainTextChange={(text) => {
						setPlainText(text)
						onPlainTextChange?.(text)
						const type = detectContentType(text)
						onContentTypeChange?.(type)
					}}
					onSubmit={onRequestSubmit ?? handleSubmit}
					debounceMs={0}
				/>
				{isDragging && (
					<div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[14px] border-2 border-dashed border-[#4BA0FA] bg-[#4BA0FA]/10">
						<div className="flex items-center gap-2 text-sm text-[#4BA0FA]">
							<FileIcon className="size-4" />
							Drop files here
						</div>
					</div>
				)}
			</div>
			{droppedFiles && droppedFiles.length > 0 && (
				<div className="flex flex-wrap gap-2 px-1 pt-2">
					{droppedFiles.map((file) => (
						<div
							key={file.id}
							className="flex items-center gap-1.5 rounded-lg bg-[#14161A] px-2.5 py-1.5 text-xs text-[#D7DEE8]"
						>
							<FileIcon className="size-3 text-[#737373]" />
							<span className="max-w-[150px] truncate">{file.name}</span>
							<span className="text-[#737373]">
								{(file.size / 1024 / 1024).toFixed(1)}MB
							</span>
							{(file.status === "pending" || file.status === "error") &&
								onRemoveFile && (
									<button
										type="button"
										onClick={() => onRemoveFile(file.id)}
										className="ml-0.5 text-[#737373] hover:text-white"
									>
										<XIcon className="size-3" />
									</button>
								)}
							{file.status === "uploading" && (
								<Loader2 className="size-3 animate-spin text-[#4BA0FA]" />
							)}
							{file.status === "success" && (
								<CheckIcon className="size-3 text-green-500" />
							)}
							{file.status === "error" && (
								<>
									<span className="text-red-400" title={file.errorMessage}>
										<AlertCircleIcon className="size-3" />
									</span>
									{onRetryFile && (
										<button
											type="button"
											onClick={() => onRetryFile(file.id)}
											className="ml-0.5 text-xs text-[#4BA0FA] hover:underline"
										>
											Retry
										</button>
									)}
								</>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
