import { createOpenAI } from "@ai-sdk/openai"
import { generateText, stepCountIs, type ModelMessage } from "ai"
import OpenAI from "openai"
import { supermemoryTools as aiSdkPackageTools } from "@supermemory/ai-sdk"
import { withSupermemory as withSupermemoryAiSdk } from "@supermemory/tools/ai-sdk"
import {
	createToolCallsExecutor,
	getToolDefinitions,
	withSupermemory as withSupermemoryOpenAi,
} from "@supermemory/tools/openai"
import { supermemoryTools as aiSdkTools } from "@supermemory/tools/ai-sdk"
import type { SupermemoryToolsConfig } from "@supermemory/tools"
import type { PlaygroundApiKeys } from "./api-keys"
import {
	buildMiddlewareMemoryDebug,
	type MemoryDebugEntry,
} from "./context-api"
import {
	normalizeMiddlewareConfig,
	type MiddlewareRuntimeConfig,
} from "./middleware-config"
import {
	TOOLS_SYSTEM_PROMPT,
	getChatSdk,
	type ToolTraceEntry,
} from "./sdk-registry"

export type ChatMessage = {
	role: "user" | "assistant" | "system"
	content: string
}

export interface ChatResult {
	text: string
	toolTrace: ToolTraceEntry[]
	memoryDebug: MemoryDebugEntry[]
}

export interface ChatRequest {
	sdkId: string
	messages: ChatMessage[]
	containerTag: string
	conversationId: string
	memoryMode?: "profile" | "query" | "full"
	middlewareConfig?: Partial<MiddlewareRuntimeConfig>
	apiKeys?: Partial<PlaygroundApiKeys>
	containerTags?: string[]
	projectId?: string
}

export class PlaygroundChatTimeoutError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "PlaygroundChatTimeoutError"
	}
}

const MODEL_REQUEST_TIMEOUT_MS = 120_000
const DEBUG_REQUEST_TIMEOUT_MS = 10_000
const MAX_OUTPUT_TOKENS = 2_048

async function withChatDeadline<T>(
	operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const controller = new AbortController()
	let timeout: ReturnType<typeof setTimeout> | undefined
	const deadline = new Promise<never>((_resolve, reject) => {
		timeout = setTimeout(() => {
			const error = new PlaygroundChatTimeoutError(
				`TypeScript chat timed out after ${MODEL_REQUEST_TIMEOUT_MS / 1_000} seconds`,
			)
			controller.abort(error)
			reject(error)
		}, MODEL_REQUEST_TIMEOUT_MS)
	})

	try {
		return await Promise.race([operation(controller.signal), deadline])
	} finally {
		if (timeout) clearTimeout(timeout)
	}
}

async function buildBestEffortDebug(
	operation: (signal: AbortSignal) => Promise<MemoryDebugEntry[]>,
): Promise<MemoryDebugEntry[]> {
	const controller = new AbortController()
	let timeout: ReturnType<typeof setTimeout> | undefined
	const deadline = new Promise<MemoryDebugEntry[]>((resolve) => {
		timeout = setTimeout(() => {
			controller.abort()
			resolve([
				{
					type: "debug_error",
					label: "Post-response context reconstruction timed out",
					detail: { nonFatal: true },
				},
			])
		}, DEBUG_REQUEST_TIMEOUT_MS)
	})

	try {
		return await Promise.race([operation(controller.signal), deadline])
	} catch {
		return [
			{
				type: "debug_error",
				label: "Post-response context reconstruction unavailable",
				detail: { nonFatal: true },
			},
		]
	} finally {
		if (timeout) clearTimeout(timeout)
	}
}

function getModelName(): string {
	return process.env.MODEL_NAME ?? "gpt-4o-mini"
}

function getToolsConfig(
	containerTags?: string[],
	projectId?: string,
): SupermemoryToolsConfig {
	return {
		baseUrl: process.env.SUPERMEMORY_BASE_URL,
		...(containerTags?.length ? { containerTags } : {}),
		...(projectId ? { projectId } : {}),
	}
}

function toModelMessages(messages: ChatMessage[]): ModelMessage[] {
	return messages.map((m) => ({ role: m.role, content: m.content }))
}

function toOpenAiMessages(
	messages: ChatMessage[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
	return messages.map((m) => ({ role: m.role, content: m.content }))
}

function extractAiSdkToolTrace(
	steps: Array<{
		toolCalls: Array<{ toolName: string; input: unknown }>
		toolResults: Array<{ toolName: string; output: unknown }>
	}>,
): ToolTraceEntry[] {
	const trace: ToolTraceEntry[] = []
	for (const [stepIndex, step] of steps.entries()) {
		for (let i = 0; i < step.toolCalls.length; i++) {
			const call = step.toolCalls[i]
			const result = step.toolResults[i]
			trace.push({
				step: stepIndex + 1,
				toolName: call.toolName,
				args: call.input,
				result: result?.output,
			})
		}
	}
	return trace
}

function lastUserMessage(messages: ChatMessage[]): string {
	return [...messages].reverse().find((m) => m.role === "user")?.content ?? ""
}

async function chatAiSdkMiddleware(
	keys: PlaygroundApiKeys,
	messages: ChatMessage[],
	containerTag: string,
	conversationId: string,
	memoryMode: "profile" | "query" | "full",
	middlewareConfig: MiddlewareRuntimeConfig,
	signal: AbortSignal,
): Promise<ChatResult> {
	const openai = createOpenAI({ apiKey: keys.openaiApiKey })
	const model = withSupermemoryAiSdk(openai(getModelName()), {
		containerTag,
		customId: conversationId,
		apiKey: keys.supermemoryApiKey,
		mode: memoryMode,
		addMemory: middlewareConfig.addMemory,
		verbose: middlewareConfig.verbose,
		includeToolCalls: middlewareConfig.includeToolCalls,
		skipMemoryOnError: middlewareConfig.skipMemoryOnError,
		baseUrl: process.env.SUPERMEMORY_BASE_URL,
	})

	const result = await generateText({
		model,
		system: "You are a helpful assistant with long-term memory about the user.",
		messages: toModelMessages(messages.filter((m) => m.role !== "system")),
		maxOutputTokens: MAX_OUTPUT_TOKENS,
		abortSignal: signal,
	})

	return { text: result.text, toolTrace: [], memoryDebug: [] }
}

async function chatOpenAiMiddleware(
	keys: PlaygroundApiKeys,
	messages: ChatMessage[],
	containerTag: string,
	conversationId: string,
	memoryMode: "profile" | "query" | "full",
	middlewareConfig: MiddlewareRuntimeConfig,
	signal: AbortSignal,
): Promise<ChatResult> {
	const openai = new OpenAI({
		apiKey: keys.openaiApiKey,
		timeout: MODEL_REQUEST_TIMEOUT_MS,
		maxRetries: 1,
	})
	const client = withSupermemoryOpenAi(openai, {
		containerTag,
		customId: conversationId,
		apiKey: keys.supermemoryApiKey,
		mode: memoryMode,
		addMemory: middlewareConfig.addMemory,
		verbose: middlewareConfig.verbose,
		baseUrl: process.env.SUPERMEMORY_BASE_URL,
	})

	const response = await client.chat.completions.create(
		{
			model: getModelName(),
			messages: toOpenAiMessages(messages),
			max_tokens: MAX_OUTPUT_TOKENS,
		},
		{ signal },
	)

	return {
		text: response.choices[0]?.message?.content ?? "",
		toolTrace: [],
		memoryDebug: [],
	}
}

async function chatAiSdkTools(
	keys: PlaygroundApiKeys,
	toolsFactory: typeof aiSdkTools,
	messages: ChatMessage[],
	containerTags?: string[],
	projectId?: string,
	signal?: AbortSignal,
): Promise<ChatResult> {
	const openai = createOpenAI({ apiKey: keys.openaiApiKey })
	const tools = toolsFactory(
		keys.supermemoryApiKey,
		getToolsConfig(containerTags, projectId),
	)

	const result = await generateText({
		model: openai(getModelName()),
		system: TOOLS_SYSTEM_PROMPT,
		messages: toModelMessages(messages.filter((m) => m.role !== "system")),
		tools,
		stopWhen: stepCountIs(8),
		maxOutputTokens: MAX_OUTPUT_TOKENS,
		abortSignal: signal,
	})

	return {
		text: result.text,
		toolTrace: extractAiSdkToolTrace(result.steps),
		memoryDebug: [],
	}
}

async function chatOpenAiTools(
	keys: PlaygroundApiKeys,
	messages: ChatMessage[],
	containerTags?: string[],
	projectId?: string,
	signal?: AbortSignal,
): Promise<ChatResult> {
	const openai = new OpenAI({
		apiKey: keys.openaiApiKey,
		timeout: MODEL_REQUEST_TIMEOUT_MS,
		maxRetries: 1,
	})
	const config = getToolsConfig(containerTags, projectId)
	const executeToolCalls = createToolCallsExecutor(
		keys.supermemoryApiKey,
		config,
	)
	const toolDefs = getToolDefinitions()
	const trace: ToolTraceEntry[] = []

	const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
		{ role: "system", content: TOOLS_SYSTEM_PROMPT },
		...toOpenAiMessages(messages.filter((m) => m.role !== "system")),
	]

	for (let step = 0; step < 8; step++) {
		const response = await openai.chat.completions.create(
			{
				model: getModelName(),
				messages: convo,
				tools: toolDefs,
				max_tokens: MAX_OUTPUT_TOKENS,
			},
			{ signal },
		)

		const choice = response.choices[0]?.message
		if (!choice) break

		convo.push(choice)

		if (choice.tool_calls?.length) {
			const toolMessages = await executeToolCalls(choice.tool_calls)
			for (let i = 0; i < choice.tool_calls.length; i++) {
				const call = choice.tool_calls[i]
				const rawContent = toolMessages[i]?.content
				const raw =
					typeof rawContent === "string"
						? rawContent
						: JSON.stringify(rawContent)
				let parsedResult: unknown = raw
				try {
					parsedResult = JSON.parse(raw)
				} catch {
					/* keep string */
				}
				trace.push({
					step: step + 1,
					toolName: call.function.name,
					args: JSON.parse(call.function.arguments),
					result: parsedResult,
				})
			}
			convo.push(...toolMessages)
			continue
		}

		return { text: choice.content ?? "", toolTrace: trace, memoryDebug: [] }
	}

	throw new Error("Tool loop exceeded max steps")
}

export async function runTypeScriptChat(
	request: ChatRequest,
	keys: PlaygroundApiKeys,
): Promise<ChatResult> {
	const sdk = getChatSdk(request.sdkId)
	if (!sdk || sdk.language !== "typescript" || !sdk.available) {
		throw new Error(`Invalid TypeScript chat SDK: ${request.sdkId}`)
	}

	const containerTags = request.containerTags ?? [request.containerTag]
	const memoryMode = request.memoryMode ?? "full"
	const middlewareConfig = normalizeMiddlewareConfig(request.middlewareConfig)

	const result = await withChatDeadline(async (signal) => {
		switch (request.sdkId) {
			case "ts-ai-sdk-middleware":
				return await chatAiSdkMiddleware(
					keys,
					request.messages,
					request.containerTag,
					request.conversationId,
					memoryMode,
					middlewareConfig,
					signal,
				)
			case "ts-openai-middleware":
				return await chatOpenAiMiddleware(
					keys,
					request.messages,
					request.containerTag,
					request.conversationId,
					memoryMode,
					middlewareConfig,
					signal,
				)
			case "ts-ai-sdk-tools":
				return await chatAiSdkTools(
					keys,
					aiSdkTools,
					request.messages,
					containerTags,
					request.projectId,
					signal,
				)
			case "ts-openai-tools":
				return await chatOpenAiTools(
					keys,
					request.messages,
					containerTags,
					request.projectId,
					signal,
				)
			case "ts-ai-sdk-package":
				return await chatAiSdkTools(
					keys,
					aiSdkPackageTools,
					request.messages,
					containerTags,
					request.projectId,
					signal,
				)
			default:
				throw new Error(`Unhandled SDK: ${request.sdkId}`)
		}
	})

	if (
		request.sdkId !== "ts-ai-sdk-middleware" &&
		request.sdkId !== "ts-openai-middleware"
	) {
		return result
	}

	const memoryDebug = await buildBestEffortDebug((signal) =>
		buildMiddlewareMemoryDebug(
			request.containerTag,
			request.conversationId,
			memoryMode,
			lastUserMessage(request.messages),
			middlewareConfig,
			request.sdkId === "ts-ai-sdk-middleware"
				? {
						flavor: "ai-sdk",
						includeToolCalls: middlewareConfig.includeToolCalls,
						skipMemoryOnError: middlewareConfig.skipMemoryOnError,
					}
				: { flavor: "openai" },
			keys.supermemoryApiKey,
			signal,
		),
	)

	return { ...result, memoryDebug }
}
