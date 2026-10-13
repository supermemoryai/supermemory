// Skips HTML error pages (proxy 5xx) so the toast falls back to the status text.
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
		return body.startsWith("<") ? undefined : body.slice(0, 300)
	}

	return undefined
}
