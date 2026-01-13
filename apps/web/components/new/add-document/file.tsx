"use client"

import { useState, useEffect } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import { FileIcon } from "lucide-react"
import { useHotkeys } from "react-hotkeys-hook"

export interface FileData {
	file: File | null
	title: string
	description: string
}

interface FileContentProps {
	onSubmit?: (data: { file: File; title: string; description: string }) => void
	onDataChange?: (data: FileData) => void
	isSubmitting?: boolean
	isOpen?: boolean
}

export function FileContent({ onSubmit, onDataChange, isSubmitting, isOpen }: FileContentProps) {
	const [isDragging, setIsDragging] = useState(false)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")

	const canSubmit = selectedFile !== null && !isSubmitting

	const handleSubmit = () => {
		if (canSubmit && onSubmit && selectedFile) {
			onSubmit({ file: selectedFile, title, description })
		}
	}

	const updateData = (newFile: File | null, newTitle: string, newDescription: string) => {
		onDataChange?.({ file: newFile, title: newTitle, description: newDescription })
	}

	const handleFileChange = (file: File | null) => {
		setSelectedFile(file)
		updateData(file, title, description)
	}

	const handleTitleChange = (newTitle: string) => {
		setTitle(newTitle)
		updateData(selectedFile, newTitle, description)
	}

	const handleDescriptionChange = (newDescription: string) => {
		setDescription(newDescription)
		updateData(selectedFile, title, newDescription)
	}

	useHotkeys("mod+enter", handleSubmit, {
		enabled: isOpen && canSubmit,
		enableOnFormTags: ["INPUT", "TEXTAREA"],
	})

	// Reset content when modal closes
	useEffect(() => {
		if (!isOpen) {
			setSelectedFile(null)
			setTitle("")
			setDescription("")
			onDataChange?.({ file: null, title: "", description: "" })
		}
	}, [isOpen, onDataChange])

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const file = e.dataTransfer.files[0]
		if (file) {
			handleFileChange(file)
		}
	}

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			handleFileChange(file)
		}
	}

	return (
		<div className={cn("h-full flex flex-col gap-6 pt-4", dmSansClassName())}>
			<div className="flex flex-col gap-2">
				<p className="text-[16px] font-medium pl-2">
					Upload a file (image, pdf, document, sheet)
				</p>
				<label
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={cn(
						"relative flex flex-col items-center justify-center gap-3 p-8 rounded-[14px] bg-[#14161A] shadow-inside-out border-2 border-dashed cursor-pointer transition-all",
						isDragging
							? "border-[#4BA0FA] bg-[#4BA0FA]/10"
							: "border-[#737373]/30 hover:border-[#737373]/50",
						isSubmitting && "opacity-50 pointer-events-none",
					)}
				>
					<input
						type="file"
						onChange={handleFileSelect}
						disabled={isSubmitting}
						className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
						accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
					/>
					<div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0F1217]">
						<FileIcon className="size-6 text-[#737373]" />
					</div>
					{selectedFile ? (
						<div className="text-center">
							<p className="text-white font-medium">{selectedFile.name}</p>
							<p className="text-[#737373] text-sm">
								{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
							</p>
						</div>
					) : (
						<div className="text-center">
							<p className="text-white">
								<span className="text-[#4BA0FA]">Click to upload</span> or drag
								and drop
							</p>
						</div>
					)}
				</label>
			</div>
			<div className="flex flex-col gap-2">
				<p className="text-[14px] font-semibold pl-2">Title (optional)</p>
				<input
					type="text"
					value={title}
					onChange={(e) => handleTitleChange(e.target.value)}
					placeholder="Give this file a title"
					disabled={isSubmitting}
					className="w-full p-4 rounded-[14px] bg-[#14161A] shadow-inside-out disabled:opacity-50"
				/>
			</div>
			<div className="flex flex-col gap-2">
				<p className="text-[14px] font-semibold pl-2">Description (optional)</p>
				<textarea
					value={description}
					onChange={(e) => handleDescriptionChange(e.target.value)}
					placeholder="Add notes or context about this file"
					disabled={isSubmitting}
					className="w-full p-4 rounded-[14px] bg-[#14161A] shadow-inside-out disabled:opacity-50"
				/>
			</div>
		</div>
	)
}
