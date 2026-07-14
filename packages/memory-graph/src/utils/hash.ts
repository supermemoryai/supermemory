export function hashString(value: string): number {
	let hash = 0
	for (let i = 0; i < value.length; i++) {
		hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0
	}
	return hash >>> 0
}
