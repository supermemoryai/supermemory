"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { FileIcon, XIcon, AlertCircleIcon, CheckIcon } from "lucide-react"
import { useHotkeys } from "react-hotkeys-hook"
import { toast } from "sonner"

export const FILE_ACCEPT =
	"image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.mdx,text/markdown"

export type FileQueueItemStatus = "pending" | "uploading" | "success" | "error"

export interface FileQueueItem {
	id: string
	file: File
	status: FileQueueItemStatus
	errorMessage?: string
}

export interface FileData {
	items: FileQueueItem[]
	title: string
	description: string
}

interface FileContentProps {
	data: FileData
	onDataChange: (data: FileData) => void
	onRequestSubmit: () => void
	isSubmitting?: boolean
	isOpen?: boolean
}

function isAcceptedFile(file: File): boolean {
	const name = file.name.toLowerCase()
	const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : ""
	const allowedExt = new Set([
		".pdf",
		".doc",
		".docx",
		".xls",
		".xlsx",
		".csv",
		".txt",
		".md",
		".mdx",
	])
	if (allowedExt.has(ext)) return true
	if (file.type.startsWith("image/")) return true
	if (file.type === "text/markdown") return true
	return false
}

function fileQueueKey(file: File): string {
	return `${file.name}:${file.size}:${file.lastModified}`
}

export function FileContent({
	data,
	onDataChange,
	onRequestSubmit,
	isSubmitting,
	isOpen,
}: FileContentProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [isDragging, setIsDragging] = useState(false)

	const anyUploading = data.items.some((i) => i.status === "uploading")
	const canSubmit =
		data.items.some((i) => i.status === "pending") &&
		!isSubmitting &&
		!anyUploading

	const updateData = useCallback(
		(partial: Partial<FileData>) => {
			onDataChange({ ...data, ...partial })
		},
		[data, onDataChange],
	)

	const addFiles = useCallback(
		(fileList: FileList | File[]) => {
			const incoming = Array.from(fileList)
			const accepted = incoming.filter(isAcceptedFile)
			const rejected = incoming.length - accepted.length
			if (rejected > 0) {
				toast.error(
					rejected === 1
						? "One file type is not supported"
						: `${rejected} files are not supported`,
				)
			}
			if (accepted.length === 0) return

			const existingKeys = new Set(data.items.map((i) => fileQueueKey(i.file)))
			let duplicateCount = 0
			const toAdd: FileQueueItem[] = []
			for (const file of accepted) {
				const key = fileQueueKey(file)
				if (existingKeys.has(key)) {
					duplicateCount++
					continue
				}
				existingKeys.add(key)
				toAdd.push({
					id: crypto.randomUUID(),
					file,
					status: "pending",
				})
			}
			if (duplicateCount > 0) {
				toast.message(
					duplicateCount === 1
						? "Skipped duplicate file"
						: `Skipped ${duplicateCount} duplicate files`,
				)
			}
			if (toAdd.length === 0) return
			onDataChange({
				...data,
				items: [...data.items, ...toAdd],
			})
		},
		[data, onDataChange],
	)

	const removeItem = useCallback(
		(id: string) => {
			onDataChange({
				...data,
				items: data.items.filter((i) => i.id !== id),
			})
		},
		[data, onDataChange],
	)

	const handleTitleChange = useCallback(
		(title: string) => updateData({ title }),
		[updateData],
	)

	const handleDescriptionChange = useCallback(
		(description: string) => updateData({ description }),
		[updateData],
	)

	useHotkeys("mod+enter", onRequestSubmit, {
		enabled: Boolean(isOpen && canSubmit),
		enableOnFormTags: ["INPUT", "TEXTAREA"],
	})

	useEffect(() => {
		if (!isOpen && inputRef.current) {
			inputRef.current.value = ""
		}
	}, [isOpen])

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
		if (e.dataTransfer.files?.length) {
			addFiles(e.dataTransfer.files)
		}
	}

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const list = e.target.files
		if (list?.length) {
			addFiles(list)
		}
		e.target.value = ""
	}

	const showTitleDescription = data.items.length <= 1
	const hasItems = data.items.length > 0

	return (
		<div className={cn("h-full flex flex-col gap-6 pt-4", dmSansClassName())}>
			<div className="flex flex-col gap-2">
				<p className="text-[16px] font-medium pl-2">
					Upload files (images, PDF, documents, sheets, markdown)
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
						(isSubmitting || anyUploading) && "opacity-50 pointer-events-none",
					)}
				>
					<input
						ref={inputRef}
						type="file"
						multiple
						onChange={handleFileSelect}
						disabled={isSubmitting}
						className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
						accept={FILE_ACCEPT}
					/>
					<div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0F1217]">
						<FileIcon className="size-6 text-[#737373]" />
					</div>
					{hasItems ? (
						<p className="text-center text-[#737373] text-sm pointer-events-none">
							Add more files or use the list below
						</p>
					) : (
						<div className="text-center pointer-events-none">
							<p className="text-white">
								<span className="text-[#4BA0FA]">Click to upload</span> or drag
								and drop
							</p>
							<p className="text-[#737373] text-sm mt-1">
								Multiple files allowed
							</p>
						</div>
					)}
				</label>
			</div>

			{hasItems ? (
				<ul
					id="file-upload-queue"
					className="flex flex-col gap-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1"
				>
					{data.items.map((item) => (
						<li
							key={item.id}
							className="relative overflow-hidden rounded-[12px] bg-[#14161A] shadow-inside-out text-sm"
						>
							{item.status === "uploading" ? (
								<div
									className={cn(
										"absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden pointer-events-none",
										"bg-[rgb(46_53_61/0.65)]",
									)}
									aria-hidden
								>
									<div
										className={cn(
											"h-full w-0 bg-linear-to-r from-[#3580c4] via-[#4ba0fa] to-[#6ec5fc]",
											"animate-file-upload-grow motion-reduce:animate-none",
											"motion-reduce:w-[88%] motion-reduce:opacity-85",
										)}
									/>
								</div>
							) : null}
							{item.status === "success" ? (
								<div
									className="absolute bottom-0 left-0 right-0 h-0.5 pointer-events-none bg-emerald-500/80"
									aria-hidden
								/>
							) : null}
							<div className="flex items-start gap-3 p-3 pb-3.5">
								<div className="min-w-0 flex-1">
									{item.status === "uploading" ? (
										<span className="sr-only">Uploading {item.file.name}</span>
									) : null}
									<p className="text-white font-medium truncate">
										{item.file.name}
									</p>
									<p className="text-[#737373] text-xs">
										{(item.file.size / 1024 / 1024).toFixed(2)} MB
									</p>
									{item.status === "error" && item.errorMessage ? (
										<p className="text-red-400 text-xs mt-1 flex items-center gap-1">
											<AlertCircleIcon className="size-3.5 shrink-0" />
											{item.errorMessage}
										</p>
									) : null}
								</div>
								<div className="flex items-center gap-2 shrink-0">
									{item.status === "pending" ? (
										<button
											type="button"
											onClick={() => removeItem(item.id)}
											disabled={isSubmitting}
											className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#2E353D] disabled:opacity-50"
											aria-label={`Remove ${item.file.name}`}
										>
											<XIcon className="size-4" />
										</button>
									) : null}
									{item.status === "success" ? (
										<CheckIcon className="size-4 text-green-500" aria-hidden />
									) : null}
									{item.status === "error" ? (
										<button
											type="button"
											onClick={() => {
												onDataChange({
													...data,
													items: data.items.map((i) =>
														i.id === item.id
															? {
																	...i,
																	status: "pending" as const,
																	errorMessage: undefined,
																}
															: i,
													),
												})
											}}
											disabled={isSubmitting}
											className="text-xs text-[#4BA0FA] hover:underline disabled:opacity-50"
										>
											Retry
										</button>
									) : null}
								</div>
							</div>
						</li>
					))}
				</ul>
			) : null}

			{showTitleDescription ? (
				<>
					<div className="flex flex-col gap-2">
						<p className="text-[14px] font-semibold pl-2">Title (optional)</p>
						<input
							type="text"
							value={data.title}
							onChange={(e) => handleTitleChange(e.target.value)}
							placeholder="Give this file a title"
							disabled={isSubmitting}
							className="w-full p-4 rounded-[14px] bg-[#14161A] shadow-inside-out disabled:opacity-50"
						/>
					</div>
					<div className="flex flex-col gap-2">
						<p className="text-[14px] font-semibold pl-2">
							Description (optional)
						</p>
						<textarea
							value={data.description}
							onChange={(e) => handleDescriptionChange(e.target.value)}
							placeholder="Add notes or context about this file"
							disabled={isSubmitting}
							className="w-full p-4 rounded-[14px] bg-[#14161A] shadow-inside-out disabled:opacity-50"
						/>
					</div>
				</>
			) : (
				<p className="text-[#737373] text-sm pl-2">
					Title and description apply only when uploading a single file. With
					multiple files, each document uses its file name.
				</p>
			)}
		</div>
	)
}
