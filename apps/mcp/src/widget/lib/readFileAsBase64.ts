export function readFileAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			if (typeof reader.result !== "string") {
				reject(new Error("Unable to read file as base64"))
				return
			}
			const comma = reader.result.indexOf(",")
			resolve(comma >= 0 ? reader.result.slice(comma + 1) : reader.result)
		}
		reader.onerror = () => reject(reader.error ?? new Error("File read failed"))
		reader.readAsDataURL(file)
	})
}
