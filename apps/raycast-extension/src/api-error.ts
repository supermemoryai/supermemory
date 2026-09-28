export function extractApiErrorMessage(raw: string): string | undefined {
	const body = raw.trim()
	if (!body) return undefined

	try {
		const parsed: unknown = JSON.parse(body)
		if (parsed && typeof parsed === "object") {
			const error = Reflect.get(parsed, "error")
			if (typeof error === "string" && error.trim()) return error

			const message = Reflect.get(parsed, "message")
			if (typeof message === "string" && message.trim()) return message
		}
	} catch {
		return body
	}

	return undefined
}
