import type { SupermemorySource } from "./context"
import { buildMemoriesText } from "./memory-client"
import { wrapMemoryContext } from "./memory-context"
import type { Logger, MemoryMode, PromptTemplate } from "./types"

export const RECALL_TIMEOUT_MS = 3000

export const MEMORY_BLOCK_KEY = "supermemory"

export interface MemoryBlockTag {
	block: string
	signature: string
}

export interface MemoryBlockOptions {
	namespace: string
	apiKey: string
	baseUrl: string
	source: SupermemorySource
	mode: MemoryMode
	logger: Logger
	promptTemplate?: PromptTemplate
	timeoutMs?: number
	recallText?: (query: string, signal: AbortSignal) => Promise<string>
}

export interface MemoryBlocks {
	recall(query: string): Promise<MemoryBlockTag | undefined>
	verify(tag: unknown): Promise<string | undefined>
}

export interface MemoryMessages<M> {
	tagOf(message: M): unknown
	isUser(message: M): boolean
	textOf(message: M): string
	blockMessage(block: string): M
}

export interface PlacedMemory<M> {
	messages: M[]
	tag?: MemoryBlockTag
	error?: unknown
}

const encoder = new TextEncoder()

const toBase64Url = (bytes: ArrayBuffer): string =>
	btoa(String.fromCharCode(...new Uint8Array(bytes)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "")

const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> | undefined => {
	try {
		const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"))
		return Uint8Array.from(binary, (char) => char.charCodeAt(0))
	} catch {
		return undefined
	}
}

// Keyed by the server-only API key and bound to the namespace, so a client can neither forge a block nor move one across namespaces.
export function createMemoryBlocks(options: MemoryBlockOptions): MemoryBlocks {
	const key = crypto.subtle.importKey(
		"raw",
		encoder.encode(options.apiKey),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	)
	const signed = (block: string) =>
		encoder.encode(
			`supermemory-block-v1\u0000${options.namespace}\u0000${block}`,
		)

	const recallText =
		options.recallText ??
		((query: string, signal: AbortSignal) =>
			buildMemoriesText({
				namespace: options.namespace,
				queryText: options.mode === "profile" ? "" : query,
				mode: options.mode,
				baseUrl: options.baseUrl,
				apiKey: options.apiKey,
				source: options.source,
				logger: options.logger,
				promptTemplate: options.promptTemplate,
				signal,
			}))

	return {
		async recall(query) {
			const text = await recallText(
				query,
				AbortSignal.timeout(options.timeoutMs ?? RECALL_TIMEOUT_MS),
			)
			const block = wrapMemoryContext(text)
			if (!block) return undefined
			const signature = await crypto.subtle.sign(
				"HMAC",
				await key,
				signed(block),
			)
			return { block, signature: toBase64Url(signature) }
		},
		async verify(tag) {
			if (!tag || typeof tag !== "object") return undefined
			const { block, signature } = tag as Partial<MemoryBlockTag>
			if (typeof block !== "string" || typeof signature !== "string") {
				return undefined
			}
			const bytes = fromBase64Url(signature)
			const valid =
				bytes !== undefined &&
				(await crypto.subtle
					.verify("HMAC", await key, bytes, signed(block))
					.catch(() => false))
			if (!valid) {
				options.logger.warn("Ignoring a memory block with a bad signature")
			}
			return valid ? block : undefined
		},
	}
}

// Restores each verified block right in front of its reply, then recalls only when nothing since the last user message carries one.
export async function placeMemoryBlocks<M>(
	blocks: MemoryBlocks,
	messages: readonly M[],
	adapter: MemoryMessages<M>,
): Promise<PlacedMemory<M>> {
	const restored = await Promise.all(
		messages.map((message) => {
			const tag = adapter.tagOf(message)
			return tag === undefined ? undefined : blocks.verify(tag)
		}),
	)
	let lastUser = -1
	messages.forEach((message, index) => {
		if (adapter.isUser(message)) lastUser = index
	})
	const placed = messages.flatMap((message, index) => {
		const block = restored[index]
		return block ? [adapter.blockMessage(block), message] : [message]
	})
	const user = messages[lastUser]
	if (user === undefined) return { messages: placed }
	if (restored.slice(lastUser + 1).some(Boolean)) return { messages: placed }
	try {
		const tag = await blocks.recall(adapter.textOf(user))
		if (!tag) return { messages: placed }
		return { messages: [...placed, adapter.blockMessage(tag.block)], tag }
	} catch (error) {
		return { messages: placed, error }
	}
}
