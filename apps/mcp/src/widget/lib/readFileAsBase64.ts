/**
 * Reads a File as a base64-encoded string (without the `data:...;base64,` prefix).
 */
export function readFileAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			if (typeof reader.result !== "string") {
				reject(new Error("Unable to read file as base64"))
				return
			}
			const result = reader.result
			const comma = result.indexOf(",")
			resolve(comma >= 0 ? result.slice(comma + 1) : result)
		}
		reader.onerror = () => reject(reader.error ?? new Error("read failed"))
		reader.readAsDataURL(file)
	})
}
