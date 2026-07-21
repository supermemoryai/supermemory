import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

export const MCP_URL =
	process.env.SUPERMEMORY_MCP_URL ?? "https://mcp.supermemory.ai/mcp"
export const API_KEY = process.env.SUPERMEMORY_API_KEY
export const ORIGIN = new URL(MCP_URL).origin
export const API_URL =
	process.env.SUPERMEMORY_API_URL ?? "https://api.supermemory.ai"
export const MCP_RESOURCE =
	process.env.SUPERMEMORY_MCP_RESOURCE ?? "https://mcp.supermemory.ai/mcp"

const credentialFile =
	process.env.SUPERMEMORY_MCP_CREDENTIAL_FILE ??
	fileURLToPath(new URL("../../../.context/mcp-oauth.env", import.meta.url))

function storedOAuthCredentials(): Record<string, string> {
	if (!existsSync(credentialFile)) return {}
	return Object.fromEntries(
		readFileSync(credentialFile, "utf8")
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				const separator = line.indexOf("=")
				const key = line.slice(0, separator)
				const rawValue = line.slice(separator + 1)
				return [key, JSON.parse(rawValue) as string]
			}),
	)
}

function persistOAuthCredentials(clientId: string, refreshToken: string): void {
	mkdirSync(dirname(credentialFile), { recursive: true })
	writeFileSync(
		credentialFile,
		[
			`SUPERMEMORY_MCP_CLIENT_ID=${JSON.stringify(clientId)}`,
			`SUPERMEMORY_MCP_REFRESH_TOKEN=${JSON.stringify(refreshToken)}`,
			"",
		].join("\n"),
		{ mode: 0o600 },
	)
	chmodSync(credentialFile, 0o600)
}

// Tier D (real OAuth token) creds — captured once via e2e/capture-oauth-token.ts.
const storedCredentials = storedOAuthCredentials()
export const OAUTH_REFRESH_TOKEN =
	process.env.SUPERMEMORY_MCP_REFRESH_TOKEN ??
	storedCredentials.SUPERMEMORY_MCP_REFRESH_TOKEN
export const OAUTH_CLIENT_ID =
	process.env.SUPERMEMORY_MCP_CLIENT_ID ??
	storedCredentials.SUPERMEMORY_MCP_CLIENT_ID
export const AUTH_CREDENTIALS_AVAILABLE = Boolean(
	API_KEY || (OAUTH_REFRESH_TOKEN && OAUTH_CLIENT_ID),
)

let defaultOAuthAccessToken: Promise<string> | undefined

async function defaultBearerToken(): Promise<string> {
	if (API_KEY) return API_KEY
	if (!OAUTH_REFRESH_TOKEN || !OAUTH_CLIENT_ID) {
		throw new Error("No API key or OAuth test credentials configured")
	}

	defaultOAuthAccessToken ??= (async () => {
		const { metadata } = await authServerMetadata()
		const { status, body } = await exchangeRefreshToken(
			metadata.token_endpoint,
			OAUTH_REFRESH_TOKEN,
			OAUTH_CLIENT_ID,
		)
		if (status !== 200 || !body.access_token) {
			throw new Error(`OAuth refresh failed: ${JSON.stringify(body)}`)
		}
		return body.access_token
	})()

	return defaultOAuthAccessToken
}

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
	resource = MCP_RESOURCE,
): Promise<{
	status: number
	body: { access_token?: string; refresh_token?: string; error?: string }
}> {
	const res = await fetch(tokenEndpoint, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: clientId,
			resource,
		}),
	})
	const body = (await res.json()) as {
		access_token?: string
		refresh_token?: string
		error?: string
	}
	if (
		res.ok &&
		body.refresh_token &&
		OAUTH_CLIENT_ID &&
		clientId === OAUTH_CLIENT_ID
	) {
		persistOAuthCredentials(clientId, body.refresh_token)
	}
	return { status: res.status, body }
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

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type Session = { client: Client; close: () => Promise<void> }

export async function connect(
	opts: { apiKey?: string; token?: string; containerTag?: string } = {},
): Promise<Session> {
	const bearerToken = opts.token ?? opts.apiKey ?? (await defaultBearerToken())
	const headers: Record<string, string> = {
		Authorization: `Bearer ${bearerToken}`,
	}
	if (opts.containerTag) headers["x-sm-project"] = opts.containerTag

	const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
		requestInit: { headers },
	})
	const client = new Client({ name: "sm-mcp-e2e", version: "0.0.1" })
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
		const res = await callTool(client, "search_memory", {
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
