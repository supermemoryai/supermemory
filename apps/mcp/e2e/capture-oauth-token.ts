// One-time helper to capture a Tier D refresh token — run: bun e2e/capture-oauth-token.ts

import { createHash, randomBytes } from "node:crypto"
import { createServer } from "node:http"
import { exec } from "node:child_process"

const API_URL = process.env.SUPERMEMORY_API_URL ?? "https://api.supermemory.ai"
const PORT = 8765
const REDIRECT_URI = `http://localhost:${PORT}/callback`

const b64url = (b: Buffer) =>
	b
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "")

async function main() {
	const meta = (await (
		await fetch(`${API_URL}/.well-known/oauth-authorization-server`)
	).json()) as {
		authorization_endpoint: string
		token_endpoint: string
		registration_endpoint: string
	}

	const reg = (await (
		await fetch(meta.registration_endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				client_name: "sm-mcp-e2e-capture",
				redirect_uris: [REDIRECT_URI],
				grant_types: ["authorization_code", "refresh_token"],
				response_types: ["code"],
				token_endpoint_auth_method: "none",
			}),
		})
	).json()) as { client_id: string }

	const verifier = b64url(randomBytes(32))
	const challenge = b64url(createHash("sha256").update(verifier).digest())
	const state = b64url(randomBytes(16))

	const authUrl = new URL(meta.authorization_endpoint)
	authUrl.search = new URLSearchParams({
		response_type: "code",
		client_id: reg.client_id,
		redirect_uri: REDIRECT_URI,
		code_challenge: challenge,
		code_challenge_method: "S256",
		scope: "openid profile email offline_access",
		state,
	}).toString()

	const code: string = await new Promise((resolve, reject) => {
		const server = createServer((req, res) => {
			const u = new URL(req.url ?? "", `http://localhost:${PORT}`)
			if (u.pathname !== "/callback") return res.end()
			if (u.searchParams.get("state") !== state) {
				res.end("state mismatch")
				return reject(new Error("state mismatch"))
			}
			const c = u.searchParams.get("code")
			res.end("Done — you can close this tab.")
			server.close()
			c ? resolve(c) : reject(new Error("no code in callback"))
		}).listen(PORT, () => {
			console.log(`\nOpening browser to log in:\n${authUrl}\n`)
			exec(`open "${authUrl}" || xdg-open "${authUrl}"`)
		})
	})

	const tokenRes = (await (
		await fetch(meta.token_endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				client_id: reg.client_id,
				code_verifier: verifier,
				redirect_uri: REDIRECT_URI,
			}),
		})
	).json()) as { refresh_token?: string; error?: string }

	if (!tokenRes.refresh_token) {
		console.error("No refresh_token returned:", tokenRes)
		process.exit(1)
	}

	console.log("\nExport these to enable Tier D OAuth tests:\n")
	console.log(`export SUPERMEMORY_MCP_CLIENT_ID="${reg.client_id}"`)
	console.log(
		`export SUPERMEMORY_MCP_REFRESH_TOKEN="${tokenRes.refresh_token}"`,
	)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
