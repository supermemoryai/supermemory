import { LRUCache } from "lru-cache"
import { buildMemoriesText } from "./memory-client"
import {
	MEMORY_CONTEXT_START,
	replaceMemoryContext,
	stripMemoryContext,
	wrapMemoryContext,
} from "./memory-context"
import type { Logger, MemoryMode, PromptTemplate } from "./types"

export const RECALL_TIMEOUT_MS = 3000

const MAX_TURNS_PER_CONVERSATION = 500
const MAX_CONVERSATIONS = 100

export interface TurnRecall {
	memories: string
	includesProfile: boolean
}

export type TurnRecallFetcher = (
	includeProfile: boolean,
	signal: AbortSignal,
) => Promise<TurnRecall>

// Keys a turn by its own text so trimmed or re-sent history still finds its block.
export const turnKey = (text: string): string =>
	stripMemoryContext(text).trim().replace(/\s+/g, " ")

type TextPart = { type: string; text?: string }

// Removes only SDK-added blocks, so caller-authored bytes reach the model exactly as sent.
export function withTurnMemory<C extends string | TextPart[]>(
	content: C,
	memories: string,
	textType = "text",
): C {
	if (typeof content === "string") {
		return replaceMemoryContext(content, memories) as C
	}
	const parts = content.flatMap((part) => {
		if (typeof part.text !== "string") return [part]
		if (!part.text.includes(MEMORY_CONTEXT_START)) return [part]
		const text = stripMemoryContext(part.text)
		return text ? [{ ...part, text }] : []
	})
	const block = wrapMemoryContext(memories)
	return (block ? [...parts, { type: textType, text: block }] : parts) as C
}

export interface BuildTurnRecallOptions {
	namespace: string
	query: string
	mode: MemoryMode
	baseUrl: string
	apiKey: string
	logger: Logger
	promptTemplate?: PromptTemplate
}

// The profile rides on one turn per conversation; every other turn carries only its own search.
export const turnRecallMode = (
	mode: MemoryMode,
	includeProfile: boolean,
	hasQuery: boolean,
): MemoryMode | null => {
	if (includeProfile && mode !== "query") return hasQuery ? mode : "profile"
	if (mode === "profile" || !hasQuery) return null
	return "query"
}

export const buildTurnRecall =
	(options: BuildTurnRecallOptions): TurnRecallFetcher =>
	async (includeProfile, signal) => {
		const mode = turnRecallMode(options.mode, includeProfile, !!options.query)
		if (!mode) return { memories: "", includesProfile: false }
		try {
			const memories = await buildMemoriesText({
				namespace: options.namespace,
				queryText: mode === "profile" ? "" : options.query,
				mode,
				baseUrl: options.baseUrl,
				apiKey: options.apiKey,
				logger: options.logger,
				promptTemplate: options.promptTemplate,
				signal,
			})
			return { memories, includesProfile: mode !== "query" && !!memories }
		} catch (error) {
			options.logger.warn("Memory recall failed; continuing without memories", {
				error: error instanceof Error ? error.message : String(error),
			})
			throw error
		}
	}

export class TurnMemory {
	private turns = new LRUCache<string, Promise<string>>({
		max: MAX_TURNS_PER_CONVERSATION,
	})
	private profileShown = false

	get(key: string): Promise<string> | undefined {
		return this.turns.get(key)
	}

	reset(): void {
		this.turns.clear()
		this.profileShown = false
	}

	// Frozen per turn so later requests resend identical bytes; never rejects or outlasts the budget.
	recall(
		key: string,
		fetch: TurnRecallFetcher,
		timeoutMs = RECALL_TIMEOUT_MS,
	): Promise<string> {
		const existing = this.turns.get(key)
		if (existing) return existing

		const controller = new AbortController()
		let timer: ReturnType<typeof setTimeout> | undefined
		const deadline = new Promise<TurnRecall>((resolve) => {
			timer = setTimeout(() => {
				controller.abort()
				resolve({ memories: "", includesProfile: false })
			}, timeoutMs)
		})
		const entry = Promise.race([
			fetch(!this.profileShown, controller.signal),
			deadline,
		])
			.then(
				(result) => {
					if (result.includesProfile) this.profileShown = true
					return result.memories
				},
				() => "",
			)
			.finally(() => clearTimeout(timer))
		this.turns.set(key, entry)
		return entry
	}
}

export class TurnMemoryByConversation {
	private conversations = new LRUCache<string, TurnMemory>({
		max: MAX_CONVERSATIONS,
	})

	for(conversationId: string): TurnMemory {
		let memory = this.conversations.get(conversationId)
		if (!memory) {
			memory = new TurnMemory()
			this.conversations.set(conversationId, memory)
		}
		return memory
	}
}
