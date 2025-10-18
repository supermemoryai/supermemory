"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { generateId } from "@lib/generate-id"
import { usePersistentChat } from "@/stores/chat"
import { ArrowUp, X } from "lucide-react"
import { Button } from "@ui/components/button"
import { ProjectSelector } from "./project-selector"
import { ModelSelector } from "./model-selector"
import { useAuth } from "@lib/auth-context"
import { AttachmentPicker } from "@/components/attachments/attachment-picker"
import { toast } from "sonner"
import {
	ALLOWED_MIME_PREFIXES,
	ALLOWED_MIME_TYPES,
	MAX_ATTACHMENTS,
	MAX_FILE_BYTES,
	SESSION_BUDGET_BYTES,
	buildAttachmentKey,
	downscaleImageToDataUrl,
	estimateDataUrlSize,
	fileToDataUrl,
	filterDuplicates,
	wouldExceedSessionBudget,
} from "@/lib/attachments"

export function ChatInput() {
	const [message, setMessage] = useState("")
	const [selectedModel, setSelectedModel] = useState<
		"gpt-5" | "claude-sonnet-4.5" | "gemini-2.5-pro"
	>("gemini-2.5-pro")

	// Attachments state and DnD for the home prompt

	interface AttachmentItem {
		id: string
		file: File
		kind: "image" | "doc"
		previewUrl?: string
		mimeType: string
		name: string
		size: number
	}

	const [attachments, setAttachments] = useState<AttachmentItem[]>([])
	const [isDraggingOverForm, setIsDraggingOverForm] = useState(false)
	const router = useRouter()
	const { setCurrentChatId } = usePersistentChat()
	const { user } = useAuth()

	useEffect(() => {
		const savedModel = localStorage.getItem("selectedModel") as
			| "gpt-5"
			| "claude-sonnet-4.5"
			| "gemini-2.5-pro"
		if (
			savedModel &&
			["gpt-5", "claude-sonnet-4.5", "gemini-2.5-pro"].includes(savedModel)
		) {
			setSelectedModel(savedModel)
		}
	}, [])

	const handleModelChange = (
		modelId: "gpt-5" | "claude-sonnet-4.5" | "gemini-2.5-pro",
	) => {
		setSelectedModel(modelId)
		localStorage.setItem("selectedModel", modelId)
	}

 function validateFile(file: File): string | null {
 		if (file.size > MAX_FILE_BYTES) return `File exceeds 25MB: ${file.name}`
 		const type = file.type
 		const isImage = ALLOWED_MIME_PREFIXES.some((p) => type.startsWith(p))
 		const allowed = isImage || ALLOWED_MIME_TYPES.includes(type)
 		if (!allowed) return `Unsupported type: ${file.name}`
 		return null
 	}

	function onFilesSelected(files: File[]) {
 		const existingKeys = new Set(attachments.map((a) => buildAttachmentKey(a.file)))
 		const { accepted, duplicates } = filterDuplicates(files, existingKeys)
 		duplicates.forEach((f) => toast.error(`Already attached: ${f.name}`))
 		const filtered: File[] = []
 		for (const file of accepted) {
			const err = validateFile(file)
			if (err) {
				toast.error(err)
				continue
			}
 			filtered.push(file)
 		}
 		if (attachments.length + filtered.length > MAX_ATTACHMENTS) {
 			toast.error(`You can attach up to ${MAX_ATTACHMENTS} files`)
 			return
 		}
 		// Optional: sessionStorage budget estimate for initial navigation pass-through
 		if (wouldExceedSessionBudget(filtered)) {
 			toast.error("Attachments too large to pass to chat. Please reduce size/count.")
 			return
 		}
 		const newItems: AttachmentItem[] = []
 		for (const file of filtered) {
 			const isImage = file.type.startsWith("image/")
			const item: AttachmentItem = {
				id: crypto.randomUUID(),
				file,
				kind: isImage ? "image" : "doc",
				previewUrl: isImage ? URL.createObjectURL(file) : undefined,
				mimeType: file.type,
				name: file.name,
				size: file.size,
			}
			newItems.push(item)
		}
		if (newItems.length > 0) setAttachments((prev) => [...prev, ...newItems])
	}

	function removeAttachment(id: string) {
		setAttachments((prev) => {
			const next = prev.filter((a) => a.id !== id)
			const removed = prev.find((a) => a.id === id)
			if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
			return next
		})
	}

 // fileToDataUrl and downscaleImageToDataUrl imported from utils

	const handleSend = async () => {
		if (!message.trim() && attachments.length === 0) return

		const newChatId = generateId()

		setCurrentChatId(newChatId)

		// Prepare attachments as parts for initial send
		let attachmentParts: any[] = []
		if (attachments.length > 0) {
			const processed = await Promise.all(
				attachments.map(async (a) => {
					if (a.kind === "image") {
						const res = await downscaleImageToDataUrl(a.file)
						return { type: "image", mimeType: res.mimeType, data: res.dataUrl }
					}
					const dataUrl = await fileToDataUrl(a.file)
					return { type: "file", name: a.name, mimeType: a.mimeType, data: dataUrl }
				}),
			)
			attachmentParts = processed
		}

		sessionStorage.setItem(`chat-model-${newChatId}`, selectedModel)
		if (message.trim()) sessionStorage.setItem(`chat-initial-${newChatId}`, message.trim())
		if (attachmentParts.length > 0)
			sessionStorage.setItem(
				`chat-initial-attachments-${newChatId}`,
				JSON.stringify(attachmentParts),
			)

		router.push(`/chat/${newChatId}`)

		setMessage("")
		attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
		setAttachments([])
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	return (
		<div className="flex-1 flex items-center justify-center px-4">
			<div className="w-full max-w-4xl">
				<div className="text-start mb-4">
					<h2 className="text-3xl font-bold text-foreground">
						Welcome, <span className="text-primary">{user?.name}</span>
					</h2>
				</div>
				<div className="relative">
					<form
						className={`flex flex-col items-end bg-card border border-border rounded-[14px] shadow-lg ${
							isDraggingOverForm ? "ring-2 ring-primary/40" : ""
						}`}
						onSubmit={(e) => {
							e.preventDefault()
							handleSend()
						}}
						onDragEnter={(e) => {
							e.preventDefault()
							e.stopPropagation()
							setIsDraggingOverForm(true)
						}}
						onDragOver={(e) => {
							e.preventDefault()
							e.stopPropagation()
							setIsDraggingOverForm(true)
						}}
						onDragLeave={(e) => {
							e.preventDefault()
							e.stopPropagation()
							setIsDraggingOverForm(false)
						}}
						onDrop={(e) => {
							e.preventDefault()
							e.stopPropagation()
							setIsDraggingOverForm(false)
							const files = Array.from(e.dataTransfer.files || [])
							if (files.length > 0) onFilesSelected(files)
						}}
					>
						{attachments.length > 0 && (
							<div className="w-full flex flex-wrap gap-2 px-6 pt-3">
								{attachments.map((a) => (
									<div
										key={a.id}
										className="flex items-center gap-2 border border-border rounded-md px-2 py-1 bg-accent/40"
									>
										{a.kind === "image" && a.previewUrl ? (
											<img
												src={a.previewUrl}
												alt={a.name}
												className="w-8 h-8 rounded object-cover"
											/>
										) : null}
										<div className="text-xs max-w-40 truncate">{a.name}</div>
										<Button
											variant="ghost"
											size="icon"
											type="button"
											onClick={() => removeAttachment(a.id)}
											aria-label={`Remove ${a.name}`}
										>
											<X className="size-3.5" />
										</Button>
									</div>
								))}
							</div>
						)}
						<textarea
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Ask your supermemory..."
							className="w-full text-foreground placeholder-muted-foreground rounded-md outline-none resize-none text-base leading-relaxed px-6 py-4 bg-transparent"
							rows={2}
						/>
						<div className="flex items-center gap-2 w-full justify-between py-2 px-3 rounded-b-[14px]">
							<div className="flex items-center gap-2">
								<AttachmentPicker
									onFilesSelected={onFilesSelected}
									accept=".pdf,.doc,.docx,.txt,image/*"
									multiple
								/>
								<ProjectSelector />
							</div>
							<div className="flex items-center gap-2">
								<ModelSelector
									selectedModel={selectedModel}
									onModelChange={handleModelChange}
								/>
								<Button
									onClick={handleSend}
									disabled={!message.trim() && attachments.length === 0}
									className="text-primary-foreground border-0 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed !bg-primary h-8 w-8"
									variant="outline"
									size="icon"
								>
									<ArrowUp className="size-3.5" />
								</Button>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}
