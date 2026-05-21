import { Notice, requestUrl } from "obsidian"
import type { SupermemorySettings } from "./types"

export interface PushResponse {
	accepted: boolean
	deletedCount: number
	queuedCount: number
}

export interface ConnectionResponse {
	id: string
}

export interface NotePayload {
	path: string
	content: string
	title?: string
	mtime?: number
	frontmatter?: Record<string, unknown>
}

class SupermemoryAPIError extends Error {
	constructor(
		message: string,
		public status?: number,
	) {
		super(message)
		this.name = "SupermemoryAPIError"
	}
}

class AuthenticationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "AuthenticationError"
	}
}

let _settings: SupermemorySettings | null = null

export function configure(settings: SupermemorySettings) {
	_settings = settings
}

function getBaseUrl(): string {
	if (!_settings) throw new Error("API not configured")
	return _settings.apiBaseUrl.replace(/\/+$/, "")
}

function getApiKey(): string {
	if (!_settings?.apiKey) throw new Error("API key not set")
	return _settings.apiKey
}

async function makeAuthenticatedRequest<T>(
	endpoint: string,
	options: { method?: string; body?: unknown } = {},
): Promise<T> {
	const apiKey = getApiKey()
	const url = `${getBaseUrl()}${endpoint}`

	try {
		const response = await requestUrl({
			url,
			method: options.method ?? "GET",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: options.body ? JSON.stringify(options.body) : undefined,
		})

		if (response.status === 401) {
			throw new AuthenticationError(
				"Invalid API key. Check your key in plugin settings.",
			)
		}

		if (response.status === 429) {
			throw new SupermemoryAPIError("Rate limited. Try again in a moment.", 429)
		}

		if (response.status >= 400) {
			let errorMessage = `API request failed: ${response.status}`
			try {
				const errorBody = response.json as { error?: string }
				if (errorBody.error) errorMessage = errorBody.error
			} catch {}
			throw new SupermemoryAPIError(errorMessage, response.status)
		}

		return response.json as T
	} catch (err) {
		if (err instanceof AuthenticationError) {
			new Notice("Supermemory: invalid API key. Check plugin settings.")
			throw err
		}
		if (err instanceof SupermemoryAPIError) {
			if (err.status === 429) {
				new Notice("Supermemory: rate limited. Try again in a moment.")
			}
			throw err
		}
		throw new SupermemoryAPIError(
			`Network error: ${err instanceof Error ? err.message : "Unknown error"}`,
		)
	}
}

export async function createConnection(
	vaultId: string,
	vaultName: string,
	containerTag: string,
): Promise<ConnectionResponse> {
	return makeAuthenticatedRequest<ConnectionResponse>(
		"/v3/connections/obsidian",
		{
			method: "POST",
			body: { metadata: { vaultId, vaultName }, containerTag },
		},
	)
}

export async function pushNotes(
	connectionId: string,
	notes: NotePayload[],
): Promise<PushResponse> {
	return makeAuthenticatedRequest<PushResponse>(
		"/v3/connections/obsidian/push",
		{
			method: "POST",
			body: { connectionId, notes },
		},
	)
}

export async function pushDeletions(
	connectionId: string,
	deletions: Array<{ path: string }>,
): Promise<PushResponse> {
	return makeAuthenticatedRequest<PushResponse>(
		"/v3/connections/obsidian/push",
		{
			method: "POST",
			body: { connectionId, deletions },
		},
	)
}
