export const MAX_DOCUMENT_FILE_BYTES = 50 * 1024 * 1024 // 50MB

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
	"application/json",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"text/markdown",
	"text/html",
	"text/plain",
	"text/csv",
])

export function isAcceptedFileType(file: File): boolean {
	if (file.type) {
		const baseMime = file.type.split(";")[0]?.trim().toLowerCase() ?? ""
		if (baseMime.startsWith("image/")) return true
		if (ALLOWED_MIME_TYPES.has(baseMime)) return true
	}

	const extIndex = file.name.lastIndexOf(".")
	if (extIndex === -1) return false

	return ALLOWED_EXTENSIONS.has(file.name.slice(extIndex).toLowerCase())
}

export function isAcceptedFile(file: File): boolean {
	if (file.size <= 0 || file.size > MAX_DOCUMENT_FILE_BYTES) return false
	return isAcceptedFileType(file)
}
