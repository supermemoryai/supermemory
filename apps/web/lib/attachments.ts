export const MAX_ATTACHMENTS = 5
export const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25MB
export const ALLOWED_MIME_PREFIXES = ["image/"]
export const ALLOWED_MIME_TYPES = [
	"application/pdf",
	"text/plain",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export function buildAttachmentKey(file: File): string {
	// lastModified may be undefined in some environments
	const last = (file as any)?.lastModified ?? 0
	return `${file.name}:${file.size}:${last}`
}

export function validateFile(file: File): string | null {
	if (file.size > MAX_FILE_BYTES) return `File exceeds 25MB: ${file.name}`
	const type = file.type
	const isImage = ALLOWED_MIME_PREFIXES.some((p) => type.startsWith(p))
	const allowed = isImage || ALLOWED_MIME_TYPES.includes(type)
	if (!allowed) return `Unsupported type: ${file.name}`
	return null
}

export function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result))
		reader.onerror = reject
		reader.readAsDataURL(file)
	})
}

export async function downscaleImageToDataUrl(
	file: File,
	maxDim = 1600,
	quality = 0.85,
): Promise<{ dataUrl: string; mimeType: string }> {
	const originalDataUrl = await fileToDataUrl(file)
	return new Promise((resolve) => {
		const img = new Image()
		img.onload = () => {
			let { width, height } = img as HTMLImageElement
			if (width <= maxDim && height <= maxDim) {
				resolve({ dataUrl: originalDataUrl, mimeType: file.type || "image/jpeg" })
				return
			}
			const scale = Math.min(maxDim / width, maxDim / height)
			width = Math.floor(width * scale)
			height = Math.floor(height * scale)
			const canvas = document.createElement("canvas")
			canvas.width = width
			canvas.height = height
			const ctx = canvas.getContext("2d")
			if (!ctx) {
				resolve({ dataUrl: originalDataUrl, mimeType: file.type || "image/jpeg" })
				return
			}
			ctx.drawImage(img, 0, 0, width, height)
			const outType = file.type && file.type.startsWith("image/png") ? "image/png" : "image/jpeg"
			const dataUrl = canvas.toDataURL(outType, outType === "image/jpeg" ? quality : undefined)
			resolve({ dataUrl, mimeType: outType })
		}
		img.onerror = () => resolve({ dataUrl: originalDataUrl, mimeType: file.type || "image/jpeg" })
		img.src = originalDataUrl
	})
}

export function filterDuplicates(files: File[], existingKeys: Set<string>) {
	const accepted: File[] = []
	const duplicates: File[] = []
	const newKeys = new Set<string>()
	for (const f of files) {
		const key = buildAttachmentKey(f)
		if (existingKeys.has(key) || newKeys.has(key)) {
			duplicates.push(f)
			continue
		}
		accepted.push(f)
		newKeys.add(key)
	}
	return { accepted, duplicates }
}

// Very rough safe budget for sessionStorage in bytes; keep well below 5MB typical limits
export const SESSION_BUDGET_BYTES = Math.floor(3.5 * 1024 * 1024)

// Estimate base64 data URL size (payload grows by ~4/3)
export function estimateDataUrlSize(bytes: number): number {
	return Math.ceil(bytes * 1.37) + 64 // +64 for small headers
}

export function wouldExceedSessionBudget(
	files: File[],
	extraTextBytes = 0,
): boolean {
	const total = files.reduce((sum, f) => sum + estimateDataUrlSize(f.size), 0) + extraTextBytes
	return total > SESSION_BUDGET_BYTES
}


