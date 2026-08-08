import { NextResponse } from "next/server"
import {
	CHAT_SDK_REGISTRY,
	PYTHON_SERVER_URL,
} from "@/lib/sdk-registry"
import { resolveApiKeys } from "@/lib/api-keys"
import { runTypeScriptChat, type ChatMessage } from "@/lib/chat-handlers"

export async function GET() {
	let pythonOk = false
	try {
		const res = await fetch(`${PYTHON_SERVER_URL}/health`, { cache: "no-store" })
		if (res.ok) {
			const data = await res.json()
			pythonOk = data.playground === "sdk-playground"
		}
	} catch {
		pythonOk = false
	}

	const envKeys = resolveApiKeys()

	return NextResponse.json({
		sdks: CHAT_SDK_REGISTRY,
		hasSupermemoryKey: Boolean(envKeys?.supermemoryApiKey),
		hasOpenAiKey: Boolean(envKeys?.openaiApiKey),
		pythonUrl: PYTHON_SERVER_URL,
		model: process.env.MODEL_NAME ?? "gpt-4o-mini",
		pythonOk,
	})
}

export async function POST(req: Request) {
	const started = Date.now()
	try {
		const body = await req.json()
		const sdkId = String(body.sdkId ?? "")
		const messages = (body.messages ?? []) as ChatMessage[]
		const containerTag = String(body.containerTag ?? "sdk-playground")
		const conversationId = String(body.conversationId ?? "default-session")
		const memoryMode = body.memoryMode as
			| "profile"
			| "query"
			| "full"
			| undefined
		const middlewareConfig = body.middlewareConfig as
			| Record<string, unknown>
			| undefined
		const apiKeys = resolveApiKeys(body.apiKeys)

		if (!apiKeys) {
			return NextResponse.json(
				{
					ok: false,
					error:
						"Supermemory and OpenAI API keys are required — enter them in the dashboard or set env vars.",
				},
				{ status: 400 },
			)
		}

		const sdk = CHAT_SDK_REGISTRY.find((s) => s.id === sdkId)
		if (!sdk?.available) {
			return NextResponse.json(
				{ ok: false, error: `SDK not available: ${sdkId}` },
				{ status: 400 },
			)
		}

		if (sdk.language === "python") {
			const res = await fetch(`${PYTHON_SERVER_URL}/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sdkId,
					messages,
					containerTag,
					conversationId,
					memoryMode,
					middlewareConfig,
					apiKeys,
				}),
			})
			const data = await res.json()
			if (!res.ok && !data.error) {
				return NextResponse.json(
					{
						ok: false,
						error: `Python server error (${res.status})`,
						durationMs: Date.now() - started,
					},
					{ status: res.status },
				)
			}
			return NextResponse.json({
				...data,
				durationMs: Date.now() - started,
			})
		}

		const result = await runTypeScriptChat(
			{
				sdkId,
				messages,
				containerTag,
				conversationId,
				memoryMode,
				middlewareConfig,
				apiKeys,
				containerTags: [containerTag],
			},
			apiKeys,
		)

		return NextResponse.json({
			ok: true,
			sdkId,
			message: { role: "assistant", content: result.text },
			toolTrace: result.toolTrace,
			memoryDebug: result.memoryDebug,
			durationMs: Date.now() - started,
		})
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				durationMs: Date.now() - started,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		)
	}
}
