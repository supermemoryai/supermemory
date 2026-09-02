#!/usr/bin/env node
/**
 * Reverse proxy that injects the local supermemory-server API key so the
 * dashboard Memory tab works when you open it via a LAN / public IP.
 *
 * supermemory-server (v0.0.8) only auto-applies that key when the request
 * Host is localhost / 127.0.0.1 / ::1. The dash JS never sends Authorization,
 * so POST /v3/documents/documents returns 401 off-loopback.
 *
 * Usage:
 *   SUPERMEMORY_DATA_DIR=./.supermemory node scripts/lan-dashboard-proxy.mjs
 *   bun scripts/lan-dashboard-proxy.mjs --target http://127.0.0.1:6767 --listen 0.0.0.0:6768
 *
 * Then open http://<this-machine-ip>:6768 instead of :6767.
 */

import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const HOP_BY_HOP = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailers",
	"transfer-encoding",
	"upgrade",
])

/** Hostnames the self-hosted binary treats as local (loopback auto-auth). */
export function isLoopbackHostname(hostname) {
	const host = hostname.replace(/^\[|\]$/g, "").toLowerCase()
	return host === "localhost" || host === "127.0.0.1" || host === "::1"
}

export function pickAuthorization(existingHeader, apiKey) {
	const existing = existingHeader?.trim()
	if (existing) return existing
	if (!apiKey) return null
	return `Bearer ${apiKey.trim()}`
}

export function resolveApiKeyFile(dataDir = process.env.SUPERMEMORY_DATA_DIR) {
	const dir = dataDir?.trim() || path.resolve(".supermemory")
	return path.join(dir, "api-key")
}

export function readApiKeyFile(filePath) {
	const raw = fs.readFileSync(filePath, "utf8").trim()
	if (!raw) throw new Error(`API key file is empty: ${filePath}`)
	return raw
}

export function parseListen(value) {
	const raw = value?.trim() || "0.0.0.0:6768"
	const idx = raw.lastIndexOf(":")
	if (idx <= 0 || idx === raw.length - 1) {
		throw new Error(`Invalid --listen value: ${value}`)
	}
	const host = raw.slice(0, idx)
	const port = Number(raw.slice(idx + 1))
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error(`Invalid --listen port: ${value}`)
	}
	return { host, port }
}

export function parseArgs(argv) {
	const out = {
		target: process.env.SUPERMEMORY_PROXY_TARGET || "http://127.0.0.1:6767",
		listen: process.env.SUPERMEMORY_PROXY_LISTEN || "0.0.0.0:6768",
		dataDir: process.env.SUPERMEMORY_DATA_DIR,
		apiKey: process.env.SUPERMEMORY_API_KEY,
	}
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		const next = argv[i + 1]
		if (arg === "--target" && next) {
			out.target = next
			i++
		} else if (arg === "--listen" && next) {
			out.listen = next
			i++
		} else if (arg === "--data-dir" && next) {
			out.dataDir = next
			i++
		} else if (arg === "--api-key" && next) {
			out.apiKey = next
			i++
		} else if (arg === "--help" || arg === "-h") {
			out.help = true
		}
	}
	return out
}

function copyRequestHeaders(incoming, apiKey) {
	const headers = {}
	for (const [key, value] of Object.entries(incoming.headers)) {
		if (value == null) continue
		if (HOP_BY_HOP.has(key.toLowerCase())) continue
		headers[key] = value
	}
	const auth = pickAuthorization(
		Array.isArray(incoming.headers.authorization)
			? incoming.headers.authorization[0]
			: incoming.headers.authorization,
		apiKey,
	)
	if (auth) headers.authorization = auth
	return headers
}

export function createLanDashboardProxy({ target, apiKey }) {
	const targetUrl = new URL(target)
	return http.createServer((req, res) => {
		const incomingUrl = new URL(req.url || "/", `http://${req.headers.host}`)
		const options = {
			protocol: targetUrl.protocol,
			hostname: targetUrl.hostname,
			port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
			method: req.method,
			path: `${incomingUrl.pathname}${incomingUrl.search}`,
			headers: copyRequestHeaders(req, apiKey),
		}
		const upstream = http.request(options, (up) => {
			res.writeHead(up.statusCode ?? 502, up.headers)
			up.pipe(res)
		})
		upstream.on("error", (err) => {
			if (!res.headersSent) {
				res.writeHead(502, { "content-type": "application/json" })
			}
			res.end(JSON.stringify({ error: "Bad gateway", details: err.message }))
		})
		req.pipe(upstream)
	})
}

function printHelp() {
	process.stdout.write(`Inject the local API key so the Memory tab works off localhost.

Usage:
  node scripts/lan-dashboard-proxy.mjs [--target URL] [--listen HOST:PORT] [--data-dir DIR]

Options:
  --target     supermemory-server URL (default http://127.0.0.1:6767)
  --listen     bind address (default 0.0.0.0:6768)
  --data-dir   directory containing api-key (default SUPERMEMORY_DATA_DIR or ./.supermemory)
  --api-key    override key instead of reading api-key file
`)
}

function isMain() {
	try {
		return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
	} catch {
		return false
	}
}

if (isMain()) {
	const args = parseArgs(process.argv.slice(2))
	if (args.help) {
		printHelp()
		process.exit(0)
	}
	const apiKey =
		args.apiKey?.trim() || readApiKeyFile(resolveApiKeyFile(args.dataDir))
	const listen = parseListen(args.listen)
	const server = createLanDashboardProxy({ target: args.target, apiKey })
	server.listen(listen.port, listen.host, () => {
		process.stdout.write(
			`lan-dashboard-proxy listening on http://${listen.host}:${listen.port} → ${args.target}\n`,
		)
	})
}
