import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {
	ElicitRequestSchema,
	type ElicitResult,
} from "@modelcontextprotocol/sdk/types.js"

export const MCP_URL =
	process.env.SUPERMEMORY_MCP_URL ?? "https://mcp.supermemory.ai/mcp"
export const API_KEY = process.env.SUPERMEMORY_API_KEY
export const ORIGIN = new URL(MCP_URL).origin
export const API_URL =
	process.env.SUPERMEMORY_API_URL ?? "https://api.supermemory.ai"

// Tier D (real OAuth token) creds — captured once via e2e/capture-oauth-token.ts.
export const OAUTH_REFRESH_TOKEN = process.env.SUPERMEMORY_MCP_REFRESH_TOKEN
export const OAUTH_CLIENT_ID = process.env.SUPERMEMORY_MCP_CLIENT_ID

export type AuthServerMetadata = {
	authorization_endpoint: string
	token_endpoint: string
	registration_endpoint: string
	grant_types_supported?: string[]
	code_challenge_methods_supported?: string[]
	response_types_supported?: string[]
}

// Walk the discovery chain a real MCP client follows: protected-resource → authorization server.
export async function authServerMetadata(): Promise<{
	authServer: string
	metadata: AuthServerMetadata
}> {
	const prRes = await fetch(
		`${ORIGIN}/.well-known/oauth-protected-resource/mcp`,
	)
	const pr = (await prRes.json()) as { authorization_servers?: string[] }
	const authServer = pr.authorization_servers?.[0]
	if (!authServer) throw new Error("no authorization_servers in metadata")
	const metaRes = await fetch(
		`${authServer}/.well-known/oauth-authorization-server`,
	)
	return { authServer, metadata: (await metaRes.json()) as AuthServerMetadata }
}

export async function registerClient(registrationEndpoint: string): Promise<{
	status: number
	body: { client_id?: string; grant_types?: string[] }
}> {
	const res = await fetch(registrationEndpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			client_name: "sm-mcp-e2e",
			redirect_uris: ["http://localhost:8765/callback"],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
		}),
	})
	return { status: res.status, body: await res.json() }
}

export async function exchangeRefreshToken(
	tokenEndpoint: string,
	refreshToken: string,
	clientId: string,
): Promise<{
	status: number
	body: { access_token?: string; error?: string }
}> {
	const res = await fetch(tokenEndpoint, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: clientId,
		}),
	})
	return { status: res.status, body: await res.json() }
}

export type CallResult = {
	content?: Array<{ type: string; text?: string }>
	structuredContent?: unknown
	isError?: boolean
}

export function textOf(res: CallResult): string {
	return (res.content ?? [])
		.filter((c) => c.type === "text" && c.text)
		.map((c) => c.text)
		.join("\n")
}

export function documentIdOf(res: CallResult): string | undefined {
	return textOf(res).match(/id: ([^)]+)/)?.[1]
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function deleteDocument(
	documentId: string,
	{ tries = 60, delayMs = 5000 } = {},
): Promise<void> {
	if (!API_KEY) throw new Error("SUPERMEMORY_API_KEY is required")
	for (let i = 0; i < tries; i++) {
		const response = await fetch(
			`${API_URL}/v3/documents/${encodeURIComponent(documentId)}`,
			{
				method: "DELETE",
				headers: { Authorization: `Bearer ${API_KEY}` },
			},
		)
		if (response.ok || response.status === 404) return
		if (response.status !== 409) {
			throw new Error(
				`Document cleanup failed for ${documentId}: ${response.status}`,
			)
		}
		if (i < tries - 1) await sleep(delayMs)
	}
	throw new Error(`Document cleanup remained busy for ${documentId}`)
}

export type Session = { client: Client; close: () => Promise<void> }

export async function connect(
	opts: {
		apiKey?: string
		token?: string
		containerTag?: string
		onElicitation?: () => ElicitResult | Promise<ElicitResult>
	} = {},
): Promise<Session> {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${opts.token ?? opts.apiKey ?? API_KEY}`,
	}
	if (opts.containerTag) headers["x-sm-project"] = opts.containerTag

	const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
		requestInit: { headers },
	})
	const client = new Client(
		{ name: "sm-mcp-e2e", version: "0.0.1" },
		opts.onElicitation
			? { capabilities: { elicitation: { form: {} } } }
			: undefined,
	)
	if (opts.onElicitation) {
		client.setRequestHandler(ElicitRequestSchema, opts.onElicitation)
	}
	await client.connect(transport)
	return {
		client,
		close: () => transport.close().catch(() => {}),
	}
}

export async function callTool(
	client: Client,
	name: string,
	args: Record<string, unknown> = {},
): Promise<CallResult> {
	return (await client.callTool({ name, arguments: args })) as CallResult
}

// recall is eventually-consistent (save → ingestion pipeline → memories), so poll.
export async function recallUntil(
	client: Client,
	query: string,
	needle: string,
	{
		tries = 18,
		delayMs = 5000,
		containerTag = undefined as string | undefined,
	} = {},
): Promise<string | null> {
	for (let i = 0; i < tries; i++) {
		const res = await callTool(client, "recall", {
			query,
			includeProfile: false,
			...(containerTag ? { containerTag } : {}),
		})
		const txt = textOf(res)
		if (txt.includes(needle)) return txt
		await sleep(delayMs)
	}
	return null
}

// forget only matches extracted memory entries, not raw chunks, so a just-saved doc
// returns "No matching memory found..." until extraction completes — poll for real removal.
export async function forgetUntilForgotten(
	client: Client,
	content: string,
	{
		tries = 18,
		delayMs = 5000,
		containerTag = undefined as string | undefined,
	} = {},
): Promise<string | null> {
	for (let i = 0; i < tries; i++) {
		const res = await callTool(client, "memory", {
			content,
			action: "forget",
			...(containerTag ? { containerTag } : {}),
		})
		if (!res.isError && /forgot/i.test(textOf(res))) return textOf(res)
		await sleep(delayMs)
	}
	return null
}

// poll until a memory is NO LONGER returned (for verifying forget).
export async function recallUntilAbsent(
	client: Client,
	query: string,
	needle: string,
	{ tries = 12, delayMs = 5000 } = {},
): Promise<boolean> {
	for (let i = 0; i < tries; i++) {
		const res = await callTool(client, "recall", {
			query,
			includeProfile: false,
		})
		if (!textOf(res).includes(needle)) return true
		await sleep(delayMs)
	}
	return false
}
