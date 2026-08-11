import { AUTO_CHAT_SPACE_ID } from "./chat-auto-space"
import {
	getDefaultReasoningEffort,
	modelNames,
	type ModelId,
	type ReasoningEffort,
} from "./models"

export type ChatThreadSettings = {
	mode: "chat" | "research"
	model: ModelId
	reasoningEffort: ReasoningEffort
	spaceMode: "auto" | "manual"
	projectId: string
}

function isModelId(value: unknown): value is ModelId {
	return typeof value === "string" && value in modelNames
}

export function readChatThreadSettings(
	value: unknown,
	fallbackProjectId: string,
): ChatThreadSettings {
	const settings =
		typeof value === "object" && value !== null
			? (value as Record<string, unknown>)
			: {}
	const mode = settings.mode === "research" ? "research" : "chat"
	const model = isModelId(settings.model) ? settings.model : "grok-4.5"
	const reasoningEffort =
		settings.reasoningEffort === "instant" ||
		settings.reasoningEffort === "thinking"
			? settings.reasoningEffort
			: getDefaultReasoningEffort(model)
	const spaceMode = settings.spaceMode === "auto" ? "auto" : "manual"
	const storedProjectId =
		typeof settings.projectId === "string" && settings.projectId.length > 0
			? settings.projectId
			: fallbackProjectId
	const projectId = spaceMode === "auto" ? AUTO_CHAT_SPACE_ID : storedProjectId

	return { mode, model, reasoningEffort, spaceMode, projectId }
}
