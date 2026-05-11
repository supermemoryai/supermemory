import type { ModelId } from "@/lib/models"

const OTHER_MODELS: ModelId[] = [
	"gpt-5.1",
	"claude-sonnet-4.6",
	"gemini-2.5-pro",
]

function flattenError(e: unknown): string {
	if (e == null) return ""
	if (typeof e === "string") return e
	if (e instanceof Error) {
		const parts = [e.message]
		for (let c: unknown = e.cause; c instanceof Error; c = c.cause) {
			parts.push(c.message)
		}
		return parts.join(" ")
	}
	return String(e)
}

export function getNovaChatErrorCopy(error: unknown, model: ModelId) {
	const msg = flattenError(error)
	const geminiGeo =
		/user location is not supported/i.test(msg) ||
		(/failed_precondition/i.test(msg) && /location is not supported/i.test(msg))

	if (geminiGeo) {
		return {
			title: "This model isn't available in your region",
			body: "Gemini can't be used from your location. Try another model above.",
			otherModels: OTHER_MODELS.filter((id) => id !== model),
		}
	}

	const body =
		msg.length > 200
			? `${msg.slice(0, 197).trim()}…`
			: msg || "Try again or switch models."
	return {
		title: "Something went wrong",
		body,
		otherModels: OTHER_MODELS.filter((id) => id !== model),
	}
}
