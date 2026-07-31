import {
	viewMessageSchema,
	type ViewMessage,
	type ViewName,
} from "../../shared/types"
import { getChatGptHostApi } from "./openaiHost"

const CHECKPOINT_VERSION = 1
const STORAGE_PREFIX = "supermemory:mcp:view:"
const CHECKPOINTABLE_VIEWS = new Set<ViewName>([
	"confirmation",
	"save-success",
	"upload-success",
])

interface CheckpointEnvelope {
	version: number
	view: ViewMessage
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function isViewMessage(value: unknown): value is ViewMessage {
	return viewMessageSchema.safeParse(value).success
}

function checkpointKey(viewId: string): string {
	return `${STORAGE_PREFIX}${viewId}`
}

function getStorage(): Storage | undefined {
	try {
		return typeof localStorage === "undefined" ? undefined : localStorage
	} catch {
		return undefined
	}
}

function modelContentForView(view: ViewMessage): string {
	switch (view.view) {
		case "confirmation":
			return `Supermemory active space is now "${view.containerTag}".`
		case "save-success":
			return `A memory was saved to Supermemory space "${view.containerTag}" with memory ID "${view.id}".`
		case "upload-success":
			return `"${view.fileName}" was uploaded to Supermemory space "${view.containerTag}" with document ID "${view.id}".`
		default:
			return "Supermemory widget state updated."
	}
}

function readHostCheckpoint(): ViewMessage | null {
	const state = getChatGptHostApi()?.widgetState
	if (!isRecord(state) || !isRecord(state.privateContent)) return null
	const checkpoint = state.privateContent.supermemoryView
	return isViewMessage(checkpoint) ? checkpoint : null
}

function readLocalCheckpoint(viewId: string): ViewMessage | null {
	const storage = getStorage()
	if (!storage) return null

	try {
		const raw = storage.getItem(checkpointKey(viewId))
		if (!raw) return null
		const parsed: unknown = JSON.parse(raw)
		if (!isRecord(parsed) || parsed.version !== CHECKPOINT_VERSION) return null
		return isViewMessage(parsed.view) ? parsed.view : null
	} catch {
		return null
	}
}

/**
 * Load the latest completed presentation state for this widget instance.
 * Business data remains authoritative on the server.
 */
export function loadViewCheckpoint(viewId?: string): ViewMessage | null {
	const hostView = readHostCheckpoint()
	if (hostView && (!viewId || hostView.viewId === viewId)) {
		return hostView
	}

	if (!viewId) return null
	const localView = readLocalCheckpoint(viewId)
	return localView?.viewId === viewId ? localView : null
}

/**
 * Save only compact terminal views. Forms and graph payloads can be large and
 * should always be reconstructed from server tool results.
 */
export function saveViewCheckpoint(view: ViewMessage): void {
	if (!view.viewId || !CHECKPOINTABLE_VIEWS.has(view.view)) return

	const envelope: CheckpointEnvelope = {
		version: CHECKPOINT_VERSION,
		view,
	}
	const storage = getStorage()
	if (storage) {
		try {
			storage.setItem(checkpointKey(view.viewId), JSON.stringify(envelope))
		} catch {
			// Sandboxed hosts may disable or quota-limit localStorage.
		}
	}

	const chatGptHost = getChatGptHostApi()
	if (!chatGptHost?.setWidgetState) return

	const currentState = isRecord(chatGptHost.widgetState)
		? chatGptHost.widgetState
		: {}
	const currentPrivate = isRecord(currentState.privateContent)
		? currentState.privateContent
		: {}

	try {
		const stateResult = chatGptHost.setWidgetState({
			...currentState,
			modelContent: modelContentForView(view),
			privateContent: {
				...currentPrivate,
				supermemoryView: view,
			},
		})
		void Promise.resolve(stateResult).catch(() => {
			// The local checkpoint remains available if the async host write fails.
		})
	} catch {
		// The local checkpoint still covers hosts without widget-state support.
	}
}
