import { NextResponse } from "next/server"
import { CHAT_SDK_REGISTRY, PYTHON_SERVER_URL } from "@/lib/sdk-registry"
import {
	resolveApiKeys,
	resolveOpenAiApiKey,
	resolveSupermemoryApiKey,
} from "@/lib/api-keys"
import {
	PlaygroundChatTimeoutError,
	runTypeScriptChat,
} from "@/lib/chat-handlers"
import {
	PlaygroundRequestError,
	assertTrustedBrowserRequest,
	mayUseEnvironmentKeys,
	parseApiKeys,
	parseContainerTag,
	parseConversationId,
	parseIdentifier,
	parseMemoryMode,
	parseMessages,
	parseMiddlewareConfig,
	readJsonObject,
} from "@/lib/request-validation"

const PYTHON_HEALTH_TIMEOUT_MS = 2_000
// Python reserves 115s for the model/tool path and up to 10s for nonfatal debug.
const PYTHON_CHAT_TIMEOUT_MS = 130_000

export async function GET(request: Request) {
	let pythonOk = false
	try {
		const res = await fetch(`${PYTHON_SERVER_URL}/health`, {
			cache: "no-store",
			signal: AbortSignal.timeout(PYTHON_HEALTH_TIMEOUT_MS),
		})
		if (res.ok) {
			const data = await res.json()
			pythonOk = data.playground === "sdk-playground"
		}
	} catch {
		pythonOk = false
	}

	const allowEnvironment = mayUseEnvironmentKeys(request)

	return NextResponse.json({
		sdks: CHAT_SDK_REGISTRY,
		hasSupermemoryKey: Boolean(
			resolveSupermemoryApiKey(null, { allowEnvironment }),
		),
		hasOpenAiKey: Boolean(resolveOpenAiApiKey(null, { allowEnvironment })),
		pythonUrl: PYTHON_SERVER_URL,
		model: process.env.MODEL_NAME ?? "gpt-4o-mini",
		pythonOk,
	})
}

export async function POST(req: Request) {
	const started = Date.now()
	try {
		assertTrustedBrowserRequest(req)
		const body = await readJsonObject(req)
		const sdkId = parseIdentifier(body.sdkId, "sdkId")
		const messages = parseMessages(body.messages)
		const containerTag = parseContainerTag(body.containerTag)
		const conversationId = parseConversationId(body.conversationId)
		const memoryMode = parseMemoryMode(body.memoryMode)
		const middlewareConfig = parseMiddlewareConfig(body.middlewareConfig)
		const apiKeys = resolveApiKeys(parseApiKeys(body.apiKeys), {
			allowEnvironment: mayUseEnvironmentKeys(req),
		})

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
				signal: AbortSignal.timeout(PYTHON_CHAT_TIMEOUT_MS),
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
			return NextResponse.json(
				{
					...data,
					durationMs: Date.now() - started,
				},
				{ status: res.ok ? 200 : res.status },
			)
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
		const status =
			error instanceof PlaygroundRequestError
				? error.status
				: error instanceof PlaygroundChatTimeoutError ||
						(error instanceof Error && error.name === "TimeoutError")
					? 504
					: 500
		return NextResponse.json(
			{
				ok: false,
				durationMs: Date.now() - started,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status },
		)
	}
}
