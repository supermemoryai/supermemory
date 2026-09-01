import type { PlaygroundApiKeys } from "./api-keys"
import type { ChatMessage } from "./chat-handlers"
import type { MiddlewareRuntimeConfig } from "./middleware-config"

const MAX_BODY_BYTES = 256_000
const MAX_MESSAGES = 64
const MAX_MESSAGE_LENGTH = 20_000
const MAX_TOTAL_MESSAGE_LENGTH = 100_000
const MAX_IDENTIFIER_LENGTH = 256
const MAX_API_KEY_LENGTH = 1_024
const MAX_CONTAINER_TAG_LENGTH = 100
const MAX_CONVERSATION_ID_LENGTH = 242
const CONTAINER_TAG_PATTERN = /^[a-zA-Z0-9_:-]+$/

export class PlaygroundRequestError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message)
		this.name = "PlaygroundRequestError"
	}
}

function firstHeaderValue(value: string | null): string | null {
	const first = value?.split(",", 1)[0]?.trim()
	return first || null
}

function requestOrigin(request: Request): string | null {
	const internalUrl = new URL(request.url)
	const forwardedHostHeader = request.headers.get("x-forwarded-host")
	const forwardedProtoHeader = request.headers.get("x-forwarded-proto")
	const hostHeader = request.headers.get("host")
	const directHost = firstHeaderValue(hostHeader)
	if (hostHeader !== null && !directHost) return null
	const forwardedHost = firstHeaderValue(forwardedHostHeader)
	if (forwardedHostHeader !== null && !forwardedHost) return null
	// Portless preserves the routed Host header but may preserve a client-supplied
	// X-Forwarded-Host. Trust Host first so XFH cannot widen env-key access.
	const host = directHost ?? forwardedHost
	if (!host) return internalUrl.origin

	const forwardedProto = firstHeaderValue(forwardedProtoHeader)
	if (
		forwardedProtoHeader !== null &&
		forwardedProto !== "http" &&
		forwardedProto !== "https"
	) {
		return null
	}
	const protocol =
		forwardedProto === "http" || forwardedProto === "https"
			? forwardedProto
			: internalUrl.protocol.slice(0, -1)

	try {
		const externalUrl = new URL(`${protocol}://${host}`)
		if (
			externalUrl.host.toLowerCase() !== host.toLowerCase() ||
			externalUrl.username ||
			externalUrl.password ||
			externalUrl.pathname !== "/" ||
			externalUrl.search ||
			externalUrl.hash
		) {
			return null
		}
		return externalUrl.origin
	} catch {
		return null
	}
}

export function assertTrustedBrowserRequest(request: Request): void {
	if (request.headers.get("sec-fetch-site") === "cross-site") {
		throw new PlaygroundRequestError("Cross-site requests are not allowed", 403)
	}

	const expectedOrigin = requestOrigin(request)
	if (!expectedOrigin) {
		throw new PlaygroundRequestError("Request host is not allowed", 403)
	}

	const origin = request.headers.get("origin")
	let normalizedOrigin: string | null = null
	if (origin) {
		try {
			normalizedOrigin = new URL(origin).origin
		} catch {
			throw new PlaygroundRequestError("Request origin is not allowed", 403)
		}
	}
	if (normalizedOrigin && normalizedOrigin !== expectedOrigin) {
		throw new PlaygroundRequestError("Request origin is not allowed", 403)
	}
}

export function mayUseEnvironmentKeys(request: Request): boolean {
	if (process.env.SDK_PLAYGROUND_ALLOW_ENV_KEYS === "true") return true

	const origin = requestOrigin(request)
	if (!origin) return false
	const hostname = new URL(origin).hostname.toLowerCase()
	return (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "[::1]" ||
		hostname.endsWith(".localhost") ||
		hostname === "sdk.dev.supermemory.ai"
	)
}

export async function readJsonObject(
	request: Request,
): Promise<Record<string, unknown>> {
	const contentType = request.headers.get("content-type") ?? ""
	if (!contentType.toLowerCase().startsWith("application/json")) {
		throw new PlaygroundRequestError(
			"Content-Type must be application/json",
			415,
		)
	}

	const contentLength = Number(request.headers.get("content-length"))
	if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
		throw new PlaygroundRequestError("Request body is too large", 413)
	}

	const raw = await request.text()
	if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
		throw new PlaygroundRequestError("Request body is too large", 413)
	}

	let value: unknown
	try {
		value = JSON.parse(raw)
	} catch {
		throw new PlaygroundRequestError("Request body must be valid JSON", 400)
	}

	if (!isRecord(value)) {
		throw new PlaygroundRequestError("Request body must be a JSON object", 400)
	}
	return value
}

export function parseMessages(value: unknown): ChatMessage[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new PlaygroundRequestError(
			"At least one chat message is required",
			400,
		)
	}
	if (value.length > MAX_MESSAGES) {
		throw new PlaygroundRequestError(
			`A maximum of ${MAX_MESSAGES} messages is allowed`,
			400,
		)
	}

	let totalLength = 0
	const messages = value.map((item, index): ChatMessage => {
		if (!isRecord(item)) {
			throw new PlaygroundRequestError(`Message ${index + 1} is invalid`, 400)
		}
		if (
			item.role !== "user" &&
			item.role !== "assistant" &&
			item.role !== "system"
		) {
			throw new PlaygroundRequestError(
				`Message ${index + 1} has an invalid role`,
				400,
			)
		}
		if (typeof item.content !== "string") {
			throw new PlaygroundRequestError(
				`Message ${index + 1} content must be text`,
				400,
			)
		}
		if (item.content.length > MAX_MESSAGE_LENGTH) {
			throw new PlaygroundRequestError(
				`Message ${index + 1} exceeds ${MAX_MESSAGE_LENGTH} characters`,
				400,
			)
		}
		totalLength += item.content.length
		return { role: item.role, content: item.content }
	})

	if (totalLength > MAX_TOTAL_MESSAGE_LENGTH) {
		throw new PlaygroundRequestError("Chat history is too large", 400)
	}
	if (
		!messages.some(
			(message) => message.role === "user" && message.content.trim().length > 0,
		)
	) {
		throw new PlaygroundRequestError(
			"Chat history must include a non-empty user message",
			400,
		)
	}
	return messages
}

export function parseIdentifier(
	value: unknown,
	name: string,
	fallback?: string,
): string {
	const resolved = typeof value === "string" ? value.trim() : fallback
	if (!resolved) {
		throw new PlaygroundRequestError(`${name} is required`, 400)
	}
	if (resolved.length > MAX_IDENTIFIER_LENGTH) {
		throw new PlaygroundRequestError(
			`${name} must be ${MAX_IDENTIFIER_LENGTH} characters or fewer`,
			400,
		)
	}
	return resolved
}

export function parseContainerTag(
	value: unknown,
	fallback = "sdk-playground",
): string {
	const containerTag = parseIdentifier(value, "containerTag", fallback)
	if (containerTag.length > MAX_CONTAINER_TAG_LENGTH) {
		throw new PlaygroundRequestError(
			`containerTag must be ${MAX_CONTAINER_TAG_LENGTH} characters or fewer`,
			400,
		)
	}
	if (!CONTAINER_TAG_PATTERN.test(containerTag)) {
		throw new PlaygroundRequestError(
			"containerTag may only contain letters, numbers, hyphens, underscores, and colons",
			400,
		)
	}
	return containerTag
}

export function parseConversationId(value: unknown): string {
	const conversationId = parseIdentifier(value, "conversationId")
	if (conversationId.length > MAX_CONVERSATION_ID_LENGTH) {
		throw new PlaygroundRequestError(
			`conversationId must be ${MAX_CONVERSATION_ID_LENGTH} characters or fewer`,
			400,
		)
	}
	return conversationId
}

export function parseOptionalText(
	value: unknown,
	name: string,
	maxLength = MAX_MESSAGE_LENGTH,
): string | undefined {
	if (value === undefined || value === null || value === "") return undefined
	if (typeof value !== "string") {
		throw new PlaygroundRequestError(`${name} must be text`, 400)
	}
	const resolved = value.trim()
	if (!resolved) return undefined
	if (resolved.length > maxLength) {
		throw new PlaygroundRequestError(
			`${name} must be ${maxLength} characters or fewer`,
			400,
		)
	}
	return resolved
}

export function parseMemoryMode(
	value: unknown,
): "profile" | "query" | "full" | undefined {
	if (value === undefined || value === null) return undefined
	if (value === "profile" || value === "query" || value === "full") {
		return value
	}
	throw new PlaygroundRequestError("Invalid memory mode", 400)
}

export function parseMiddlewareConfig(
	value: unknown,
): Partial<MiddlewareRuntimeConfig> | undefined {
	if (value === undefined || value === null) return undefined
	if (!isRecord(value)) {
		throw new PlaygroundRequestError("Invalid middleware configuration", 400)
	}

	if (
		value.addMemory !== undefined &&
		value.addMemory !== "always" &&
		value.addMemory !== "never"
	) {
		throw new PlaygroundRequestError("Invalid addMemory value", 400)
	}
	for (const key of [
		"verbose",
		"includeToolCalls",
		"skipMemoryOnError",
	] as const) {
		if (value[key] !== undefined && typeof value[key] !== "boolean") {
			throw new PlaygroundRequestError(`Invalid ${key} value`, 400)
		}
	}

	return {
		...(value.addMemory !== undefined
			? { addMemory: value.addMemory as "always" | "never" }
			: {}),
		...(value.verbose !== undefined
			? { verbose: value.verbose as boolean }
			: {}),
		...(value.includeToolCalls !== undefined
			? { includeToolCalls: value.includeToolCalls as boolean }
			: {}),
		...(value.skipMemoryOnError !== undefined
			? { skipMemoryOnError: value.skipMemoryOnError as boolean }
			: {}),
	}
}

export function parseApiKeys(value: unknown): Partial<PlaygroundApiKeys> {
	if (value === undefined || value === null) return {}
	if (!isRecord(value)) {
		throw new PlaygroundRequestError("Invalid API key configuration", 400)
	}

	return {
		supermemoryApiKey: parseOptionalApiKey(
			value.supermemoryApiKey,
			"Supermemory API key",
		),
		openaiApiKey: parseOptionalApiKey(value.openaiApiKey, "OpenAI API key"),
	}
}

function parseOptionalApiKey(value: unknown, name: string): string {
	if (value === undefined || value === null || value === "") return ""
	if (typeof value !== "string" || value.length > MAX_API_KEY_LENGTH) {
		throw new PlaygroundRequestError(`${name} is invalid`, 400)
	}
	return value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}
