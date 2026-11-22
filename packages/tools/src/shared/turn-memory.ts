import { LRUCache } from "lru-cache"
import type { SupermemorySource } from "./context"
import { buildMemoriesText, supermemoryProfileSearch } from "./memory-client"
import {
	MEMORY_CONTEXT_START,
	replaceMemoryContext,
	stripMemoryContext,
	wrapMemoryContext,
} from "./memory-context"
import { defaultPromptTemplate } from "./prompt-builder"
import type {
	Logger,
	MemoryMode,
	ProfileStructure,
	PromptTemplate,
} from "./types"

export const RECALL_TIMEOUT_MS = 3000

const MAX_TURNS_PER_CONVERSATION = 500
const MAX_CONVERSATIONS = 100

export interface FrozenProfile {
	data: ProfileStructure["profile"]
	text: string
}

export interface TurnRecall {
	memories: string
	profile?: FrozenProfile
}

export type TurnRecallFetcher = (
	profile: FrozenProfile | undefined,
	signal: AbortSignal,
) => Promise<TurnRecall>

// Keys a turn by its own text so trimmed or re-sent history still finds its block.
export const turnKey = (text: string): string =>
	stripMemoryContext(text).trim().replace(/\s+/g, " ")

const fingerprint = (text: string): string => {
	let a = 0x811c9dc5
	let b = 0x01000193
	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index)
		a = Math.imul(a ^ code, 0x01000193)
		b = Math.imul(b ^ code, 0x5bd1e995)
	}
	return (a >>> 0).toString(36) + (b >>> 0).toString(36)
}

// Keys a user turn by its text and the assistant reply before it, so a repeated question is a new turn and trimming never shifts a kept message's key.
export function turnKeys<M>(
	messages: readonly M[],
	read: (message: M) => { role: unknown; text: string },
): Map<M, string> {
	const keys = new Map<M, string>()
	let reply = ""
	for (const message of messages) {
		const { role, text } = read(message)
		if (role === "assistant") {
			const replyText = turnKey(text)
			if (replyText) reply = fingerprint(replyText)
		} else if (role === "user") {
			keys.set(
				message,
				reply ? `${turnKey(text)}\u0000${reply}` : turnKey(text),
			)
		}
	}
	return keys
}

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

export type TurnSearch = (
	profile: Promise<ProfileStructure["profile"]> | undefined,
	signal: AbortSignal,
) => Promise<string>

export interface BuildTurnRecallOptions {
	namespace: string
	query: string
	mode: MemoryMode
	baseUrl: string
	apiKey: string
	source: SupermemorySource
	logger: Logger
	promptTemplate?: PromptTemplate
	search?: TurnSearch
}

const EMPTY_PROFILE: ProfileStructure["profile"] = { static: [], dynamic: [] }

// The profile is fetched once per conversation and never refreshed; search carries anything newer and skips what the profile already says.
export const buildTurnRecall =
	(options: BuildTurnRecallOptions): TurnRecallFetcher =>
	async (frozen, signal) => {
		const template = options.promptTemplate ?? defaultPromptTemplate
		const profile =
			options.mode === "query"
				? undefined
				: frozen
					? Promise.resolve(frozen)
					: supermemoryProfileSearch(
							options.namespace,
							"",
							options.baseUrl,
							options.apiKey,
							options.source,
							signal,
						).then(async ({ profile: data }) => ({
							data,
							text: await buildMemoriesText({
								namespace: options.namespace,
								queryText: "",
								mode: "profile",
								baseUrl: options.baseUrl,
								apiKey: options.apiKey,
								source: options.source,
								logger: options.logger,
								promptTemplate: template,
								profile: data,
							}),
						}))
		const profileData = profile?.then((p) => p.data).catch(() => EMPTY_PROFILE)
		const search =
			options.search ??
			((profileFor, searchSignal) =>
				buildMemoriesText({
					namespace: options.namespace,
					queryText: options.query,
					mode: options.mode,
					baseUrl: options.baseUrl,
					apiKey: options.apiKey,
					source: options.source,
					logger: options.logger,
					promptTemplate: (prompt) => template({ ...prompt, userMemories: "" }),
					signal: searchSignal,
					...(profileFor && { profile: profileFor }),
				}))
		const [profileResult, searchResult] = await Promise.allSettled([
			profile,
			options.mode !== "profile" && options.query
				? search(profileData, signal)
				: "",
		])
		for (const result of [profileResult, searchResult]) {
			if (result.status === "rejected") {
				options.logger.warn("Memory recall failed; continuing without it", {
					error:
						result.reason instanceof Error
							? result.reason.message
							: String(result.reason),
				})
			}
		}
		return {
			memories: searchResult.status === "fulfilled" ? searchResult.value : "",
			...(!frozen &&
				profileResult.status === "fulfilled" &&
				profileResult.value && { profile: profileResult.value }),
		}
	}

export class TurnMemory {
	private turns = new LRUCache<string, Promise<string>>({
		max: MAX_TURNS_PER_CONVERSATION,
	})
	private frozen?: FrozenProfile

	get(key: string): Promise<string> | undefined {
		return this.turns.get(key)
	}

	get profile(): string {
		return this.frozen?.text ?? ""
	}

	reset(): void {
		this.turns.clear()
		this.frozen = undefined
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
				resolve({ memories: "" })
			}, timeoutMs)
		})
		const entry = Promise.race([
			fetch(this.frozen, controller.signal),
			deadline,
		])
			.then(
				(result) => {
					this.frozen ??= result.profile
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
