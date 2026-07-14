export const CHAT_ATTACHMENT_ACCEPT =
	"image/*,.pdf,application/pdf,.doc,.docx,.txt,.md,.mdx,.markdown,text/markdown"

export const CHAT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024

const SUPPORTED_EXTENSIONS = new Set([
	".pdf",
	".doc",
	".docx",
	".txt",
	".md",
	".mdx",
	".markdown",
])

export type ChatAttachment = {
	id: string
	documentId?: string
	filename: string
	mediaType: string
	size: number
	saveToMemory: boolean
	status: "ready" | "processing" | "failed"
	url?: string
	contentPreview?: string
}

export type ChatAttachmentDraftStatus =
	| "queued"
	| "uploading"
	| "uploaded"
	| "error"

export type ChatAttachmentDraft = {
	id: string
	file: File
	saveToMemory: boolean
	status: ChatAttachmentDraftStatus
	errorMessage?: string
	uploaded?: ChatAttachment
}

export type ChatAttachmentMessageMetadata = {
	attachments?: ChatAttachment[]
}

export function isAcceptedChatAttachment(file: File): boolean {
	if (file.size > CHAT_ATTACHMENT_MAX_BYTES) return false
	const name = file.name.toLowerCase()
	const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : ""
	if (SUPPORTED_EXTENSIONS.has(ext)) return true
	if (file.type.startsWith("image/")) return true
	if (file.type === "application/pdf") return true
	if (file.type === "text/markdown") return true
	return false
}

export function chatAttachmentKey(file: File): string {
	return `${file.name}:${file.size}:${file.lastModified}`
}

export function createChatAttachmentDraft(file: File): ChatAttachmentDraft {
	return {
		id: crypto.randomUUID(),
		file,
		saveToMemory: true,
		status: "queued",
	}
}

export function formatAttachmentSize(size: number): string {
	if (size < 1024) return `${size} B`
	const kb = size / 1024
	if (kb < 1024) return `${kb.toFixed(1)} KB`
	return `${(kb / 1024).toFixed(1)} MB`
}

export function getChatMessageAttachments(metadata: unknown): ChatAttachment[] {
	const attachments = (metadata as ChatAttachmentMessageMetadata | undefined)
		?.attachments
	return Array.isArray(attachments) ? attachments : []
}
