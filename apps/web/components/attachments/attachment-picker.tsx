"use client"

import { useRef, useState } from "react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { Paperclip } from "lucide-react"

export function AttachmentPicker({
	onFilesSelected,
	disabled,
	accept = ".pdf,.doc,.docx,.txt,image/*",
	multiple = true,
	className,
}: {
	onFilesSelected: (files: File[]) => void
	disabled?: boolean
	accept?: string
	multiple?: boolean
	className?: string
}) {
 	const inputRef = useRef<HTMLInputElement | null>(null)
 	const [isDragOver, setIsDragOver] = useState(false)

 	function handlePick() {
 		if (!disabled) inputRef.current?.click()
 	}

 	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
 		const files = Array.from(e.target.files || [])
 		if (files.length > 0) onFilesSelected(files)
 		// reset so selecting the same file again still fires change
 		e.currentTarget.value = ""
 	}

 	function preventDefaults(e: React.DragEvent) {
 		e.preventDefault()
 		e.stopPropagation()
 	}

 	function handleDrop(e: React.DragEvent) {
 		preventDefaults(e)
 		setIsDragOver(false)
 		if (disabled) return
 		const files = Array.from(e.dataTransfer.files || [])
 		if (files.length > 0) onFilesSelected(files)
 	}

 	return (
 		<div
 			className={cn(
 				"inline-flex items-center",
 				isDragOver ? "ring-2 ring-primary/40 rounded-lg" : "",
 				className,
 			)}
 			onDragEnter={(e) => {
 				preventDefaults(e)
 				setIsDragOver(true)
 			}}
 			onDragOver={preventDefaults}
 			onDragLeave={(e) => {
 				preventDefaults(e)
 				setIsDragOver(false)
 			}}
 			onDrop={handleDrop}
 		>
 			<input
 				ref={inputRef}
 				type="file"
 				accept={accept}
 				multiple={multiple}
 				className="hidden"
 				onChange={handleChange}
 			/>
 			<Button
 				variant="ghost"
 				size="icon"
 				type="button"
 				disabled={disabled}
 				aria-label="Attach files"
 				onClick={handlePick}
 			>
 				<Paperclip className="size-4" />
 			</Button>
 		</div>
 	)
}



