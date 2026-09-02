export type SdkLanguage = "typescript" | "python"
export type IntegrationMode = "middleware" | "tools" | "direct"

export interface ToolTraceEntry {
	step: number
	toolName: string
	args: unknown
	result?: unknown
}

export interface ChatSdkDefinition {
	id: string
	label: string
	language: SdkLanguage
	mode: IntegrationMode
	package: string
	description: string
	available: boolean
}

export const CHAT_SDK_REGISTRY: ChatSdkDefinition[] = [
	{
		id: "ts-ai-sdk-middleware",
		label: "AI SDK + middleware",
		language: "typescript",
		mode: "middleware",
		package: "@supermemory/tools/ai-sdk",
		description:
			"withSupermemory wraps the model — auto-injects profile/search and saves conversations",
		available: true,
	},
	{
		id: "ts-openai-middleware",
		label: "OpenAI SDK + middleware",
		language: "typescript",
		mode: "middleware",
		package: "@supermemory/tools/openai",
		description:
			"withSupermemory on OpenAI client — same automatic memory path",
		available: true,
	},
	{
		id: "ts-ai-sdk-tools",
		label: "AI SDK + tools",
		language: "typescript",
		mode: "tools",
		package: "@supermemory/tools/ai-sdk",
		description:
			"Agent explicitly calls the 7 Supermemory tools via generateText",
		available: true,
	},
	{
		id: "ts-openai-tools",
		label: "OpenAI SDK + tools",
		language: "typescript",
		mode: "tools",
		package: "@supermemory/tools/openai",
		description: "OpenAI function calling with the 7 Supermemory tools",
		available: true,
	},
	{
		id: "ts-ai-sdk-package",
		label: "@supermemory/ai-sdk",
		language: "typescript",
		mode: "tools",
		package: "@supermemory/ai-sdk",
		description: "Re-export of tools/ai-sdk — same 7-tool agent",
		available: true,
	},
	{
		id: "py-openai-middleware",
		label: "OpenAI + middleware",
		language: "python",
		mode: "middleware",
		package: "supermemory-openai-sdk",
		description:
			"with_supermemory — automatic profile injection + conversation save",
		available: true,
	},
	{
		id: "py-openai-tools",
		label: "OpenAI + tools",
		language: "python",
		mode: "tools",
		package: "supermemory-openai-sdk",
		description: "SupermemoryTools function-calling loop (7 tools)",
		available: true,
	},
	{
		id: "py-supermemory-direct",
		label: "supermemory + manual context",
		language: "python",
		mode: "direct",
		package: "supermemory",
		description: "profile() then OpenAI — manual integration pattern from docs",
		available: true,
	},
]

export const PYTHON_SERVER_URL =
	process.env.SDK_PLAYGROUND_PYTHON_URL ?? "http://127.0.0.1:8792"

export const TOOLS_SYSTEM_PROMPT = `You are a helpful assistant with Supermemory long-term memory.

You have tools to manage memory. Use them proactively:
- searchMemories: hybrid recall — search before answering whenever user-specific context could help (do not wait to be asked)
- getProfile: broad static/dynamic user context at conversation start or when you need a wide overview
- addMemory: store a new generalizable fact
- documentList / documentAdd / documentDelete: manage source documents (documentDelete is permanent)
- memoryForget: soft-delete one profile fact by memoryId or exact content (not whole documents)

Before answering questions about the user, their preferences, or past context, search memories or get profile first. When the user asks you to remember something, use addMemory.`

export function getChatSdk(id: string): ChatSdkDefinition | undefined {
	return CHAT_SDK_REGISTRY.find((s) => s.id === id)
}
