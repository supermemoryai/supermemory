// Packs the built package and installs it next to each supported AI SDK major, then typechecks and runs a consumer app.
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { $ } from "bun"

const ROOT = path.resolve(import.meta.dir, "../..")
const FINISHED = { unified: "stop", raw: "stop" }
const TOOL_CALLS = { unified: "tool-calls", raw: "tool_calls" }
const USAGE = {
	inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 1, text: 1, reasoning: 0 },
}

const VERSIONS = [
	{
		ai: "5",
		mock: "MockLanguageModelV2",
		stop: "stop",
		toolCalls: "tool-calls",
		usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
	},
	{
		ai: "6",
		mock: "MockLanguageModelV3",
		stop: FINISHED,
		toolCalls: TOOL_CALLS,
		usage: USAGE,
	},
	{
		ai: "7",
		mock: "MockLanguageModelV4",
		stop: FINISHED,
		toolCalls: TOOL_CALLS,
		usage: USAGE,
	},
]

const fixture = (v: (typeof VERSIONS)[number]) => `
import { generateText, stepCountIs, streamText } from "ai"
import { ${v.mock} } from "ai/test"
import { supermemoryTools, withSupermemory } from "@supermemory/tools/ai-sdk"

let searchCalls = 0
const server = Bun.serve({
	port: 0,
	fetch(req) {
		const route = new URL(req.url).pathname
		if (route.endsWith("/profile"))
			return Response.json({ profile: { static: [{ id: "s0", memory: "User prefers dark mode" }], dynamic: [], buckets: {} } })
		if (route.endsWith("/search")) {
			searchCalls++
			return Response.json({ results: [], searchTime: 1 })
		}
		return Response.json({ id: "doc_1", status: "queued" })
	},
})
const baseUrl = \`http://127.0.0.1:\${server.port}\`

const prompts: string[] = []
let calls = 0
const model = new ${v.mock}({
	doGenerate: async (options) => {
		prompts.push(JSON.stringify(options.prompt))
		const callTool = calls++ === 0 && (options.tools?.length ?? 0) > 0
		return {
			content: callTool
				? [{ type: "tool-call", toolCallId: "c1", toolName: "searchMemories", input: JSON.stringify({ informationToGet: "theme" }) }]
				: [{ type: "text", text: "ok" }],
			finishReason: callTool ? ${JSON.stringify(v.toolCalls)} : ${JSON.stringify(v.stop)},
			usage: ${JSON.stringify(v.usage)},
			warnings: [],
		} as never
	},
})

const tools = supermemoryTools("sm_test", { baseUrl })
const withTools = await generateText({ model, tools, prompt: "what theme?", stopWhen: stepCountIs(3) })
if (withTools.text !== "ok" || searchCalls !== 1) throw new Error(\`tools: text=\${withTools.text} searchCalls=\${searchCalls}\`)

const wrapped = withSupermemory(model, { apiKey: "sm_test", namespace: "user_1", id: "conv_1", baseUrl })
const withMemory = await generateText({ model: wrapped, prompt: "hi" })
if (withMemory.text !== "ok" || !prompts.at(-1)?.includes("User prefers dark mode"))
	throw new Error("withSupermemory: memory was not injected into the prompt")

// Type-only: the wrapped model and tools must also be accepted by streamText.
const _typecheckStream = () => streamText({ model: wrapped, tools, prompt: "hi" })

server.stop(true)
console.log("ai@${v.ai}: tools and withSupermemory OK")
`

const work = await mkdtemp(path.join(tmpdir(), "sm-tools-compat-"))
try {
	await $`bun run build`.cwd(ROOT).quiet()
	const packed = await $`npm pack --silent --pack-destination ${work}`
		.cwd(ROOT)
		.text()
	const tarball = path.join(work, packed.trim().split("\n").at(-1) ?? "")

	for (const v of VERSIONS) {
		const app = path.join(work, `ai-v${v.ai}`)
		await Bun.write(
			path.join(app, "package.json"),
			JSON.stringify({
				type: "module",
				dependencies: {
					"@supermemory/tools": `file:${tarball}`,
					ai: `^${v.ai}`,
					typescript: "^5.9.2",
					zod: "^4.1.5",
					"@types/bun": "^1.2.21",
				},
			}),
		)
		await Bun.write(
			path.join(app, "tsconfig.json"),
			JSON.stringify({
				compilerOptions: {
					target: "ES2022",
					module: "ESNext",
					moduleResolution: "bundler",
					strict: true,
					noEmit: true,
					skipLibCheck: true,
					types: ["bun"],
				},
				files: ["app.ts"],
			}),
		)
		await Bun.write(path.join(app, "app.ts"), fixture(v))
		await $`npm install --silent --no-audit --no-fund`.cwd(app).quiet()
		const installed = (
			await Bun.file(path.join(app, "node_modules/ai/package.json")).json()
		).version
		const nested = await Bun.file(
			path.join(
				app,
				"node_modules/@supermemory/tools/node_modules/ai/package.json",
			),
		).exists()
		if (nested)
			throw new Error(
				`ai@${v.ai}: a second copy of ai was installed under @supermemory/tools`,
			)
		const tsc = await $`npx tsc -p .`.cwd(app).nothrow().quiet()
		if (tsc.exitCode !== 0)
			throw new Error(`ai@${installed}: typecheck failed\n${tsc.stdout}`)
		await $`bun app.ts`.cwd(app)
	}
} finally {
	await rm(work, { recursive: true, force: true })
}
