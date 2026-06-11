import { createStore, get, set, del } from "idb-keyval"

const fileCacheStore = createStore("supermemory-file-cache", "blobs")

interface CachedFile {
	blob: Blob
	mimeType: string
}

export async function cacheFileBlob(
	documentId: string,
	blob: Blob,
	mimeType: string,
): Promise<void> {
	try {
		await set(
			documentId,
			{ blob, mimeType } satisfies CachedFile,
			fileCacheStore,
		)
	} catch {
		// Storage full or unavailable — non-critical, skip silently
	}
}

export async function getCachedFileBlob(
	documentId: string,
): Promise<Blob | null> {
	try {
		const cached = await get<CachedFile>(documentId, fileCacheStore)
		return cached?.blob ?? null
	} catch {
		return null
	}
}

export async function getCachedFileUrl(
	documentId: string,
): Promise<string | null> {
	const blob = await getCachedFileBlob(documentId)
	if (!blob) return null
	return URL.createObjectURL(blob)
}

export async function removeCachedFile(documentId: string): Promise<void> {
	try {
		await del(documentId, fileCacheStore)
	} catch {
		// non-critical
	}
}
