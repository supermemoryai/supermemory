// Matches CHAT_ATTACHMENT_MAX_BYTES (components/chat/attachments.ts) and the
// 50MB limit enforced by the backend workers.
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

export const ALLOWED_EXTENSIONS = new Set([
	".pdf",
	".doc",
	".docx",
	".xls",
	".xlsx",
	".csv",
	".txt",
	".md",
	".mdx",
	".json",
	".html",
	".htm",
])

export const ALLOWED_MIME_TYPES = new Set([
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"text/csv",
	"text/plain",
	"text/markdown",
	"application/json",
	"text/html",
])

export type FileRejectionReason = "file-too-large" | "unsupported-type"

function normalizeMimeType(type: string): string {
	// Browsers may append parameters, e.g. "text/plain;charset=utf-8"
	const semicolon = type.indexOf(";")
	const bare = semicolon === -1 ? type : type.slice(0, semicolon)
	return bare.trim().toLowerCase()
}

export function isAcceptedFileType(file: File): boolean {
	const mimeType = normalizeMimeType(file.type)
	if (mimeType) {
		if (ALLOWED_MIME_TYPES.has(mimeType)) return true
		if (mimeType.startsWith("image/")) return true
	}
	const name = file.name.toLowerCase()
	const dot = name.lastIndexOf(".")
	const ext = dot === -1 ? "" : name.slice(dot)
	return ALLOWED_EXTENSIONS.has(ext)
}

export function getFileRejectionReason(file: File): FileRejectionReason | null {
	if (file.size > MAX_FILE_SIZE_BYTES) return "file-too-large"
	if (isAcceptedFileType(file)) return null
	return "unsupported-type"
}

export function isAcceptedFile(file: File): boolean {
	return getFileRejectionReason(file) === null
}
