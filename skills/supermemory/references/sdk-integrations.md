# SDK Integrations

How to put Supermemory behind the frameworks people actually build agents with. Everything here targets the v5 API: one namespace per config, passed as `namespace`. Conversations are stored as one document per `id`.

## Packages

| Package | Version | What it is for |
| --- | --- | --- |
| `supermemory` (npm) | 5.x | Core TypeScript SDK. Also ships the `supermemory` CLI. |
| `supermemory` (PyPI) | 5.x | Core Python SDK, sync and async. |
| `@supermemory/tools` | 3.x | Tools and middleware for Vercel AI SDK, OpenAI, Mastra, VoltAgent, and Claude's memory tool. Depends on `supermemory@5`. |
| `supermemory-openai-sdk`, `supermemory-agent-framework`, `supermemory-pipecat`, livekit and cartesia wrappers (PyPI) | legacy | Still call the deprecated v3/v4 API as of October 2026. See [Python frameworks](#python-frameworks). |

`@supermemory/ai-sdk` is retired. Import from `@supermemory/tools/ai-sdk` instead.

```bash
npm install @supermemory/tools          # brings supermemory@5 with it
pip install -U supermemory
```

Every entry point reads `SUPERMEMORY_API_KEY` from the environment unless you pass `apiKey`. Against a self-hosted server, pass `baseUrl` (server v0.0.9 or later serves v5).

## The standard pattern

Whatever the framework, memory wraps the model call the same way:

1. Before the call: read the profile for standing facts, search for context relevant to the current message.
2. Put both in the system prompt.
3. After the call: add the turn as a document with the conversation id as `id`, so the whole conversation stays one evolving document.

`@supermemory/tools` middleware does all three for you. The tool sets instead let the model decide when to search or save.

## Vercel AI SDK

Entry point `@supermemory/tools/ai-sdk`. Works with `ai` 5, 6, and 7; install `ai` yourself.

### Tools the model can call

```typescript
import { supermemoryTools } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"
import { generateText, stepCountIs } from "ai"

const tools = supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
  namespace: "user_123",
})

const result = await generateText({
  model: openai("gpt-5"),
  messages: [{ role: "user", content: "What do you remember about my preferences?" }],
  tools,
  stopWhen: stepCountIs(5),
})
```

`supermemoryTools` returns seven tools: `searchMemories`, `addMemory`, `getProfile`, `documentList`, `documentDelete`, `documentAdd`, `memoryForget`. Each is also exported alone (`searchMemoriesTool`, `addMemoryTool`, `getProfileTool`, `documentListTool`, `documentDeleteTool`, `documentAddTool`, `memoryForgetTool`) with the same `(apiKey, config)` signature.

| Tool | Inputs | Does |
| --- | --- | --- |
| `searchMemories` | `informationToGet`, `limit?` (1 to 50) | hybrid search in the namespace, threshold 0.6 |
| `addMemory` | `memory` | adds a short fact with `dreaming: "instant"` |
| `getProfile` | `query?` | profile `static`, `dynamic`, `buckets` as `{ id, memory }`; with `query` also `searchResults` |
| `documentList` | `limit?`, `page?` | pages documents, status under `system.status` |
| `documentAdd` | `content`, `title?`, `description?` | stores raw content for processing |
| `documentDelete` | document id, Supermemory or your own | refuses while the document is still processing |
| `memoryForget` | `memoryId?` or `memoryContent?` | by content, previews with a dry run and forgets exact text matches only |

Config (`SupermemoryToolsConfig`):

```typescript
{
  namespace?: string  // default "sm_project_default"
  baseUrl?: string
  strict?: boolean    // true makes every schema field required, for OpenAI strict mode providers
}
```

### Model middleware

`withSupermemory` wraps any AI SDK language model. Before each call it injects the profile and, in `query` or `full` mode, a memories search on the latest user message. After the call it saves the conversation as one document with `id`.

```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const model = withSupermemory(openai("gpt-5"), {
  namespace: "user_123",
  id: "conversation_456",
  mode: "full",
})

const result = await generateText({
  model,
  messages: [{ role: "user", content: "Where do I live?" }],
})
```

Options:

```typescript
{
  namespace: string                      // required
  id: string                             // required, groups the conversation into one document
  mode?: "profile" | "query" | "full"    // default "profile"
  addMemory?: "always" | "never"         // default "always"
  verbose?: boolean                      // default false
  apiKey?: string                        // pass in browsers; server code can rely on the env var
  baseUrl?: string
  includeToolCalls?: boolean             // default false, include tool calls in the saved conversation
  promptTemplate?: (data: MemoryPromptData) => string
  skipMemoryOnError?: boolean            // default true, fall back to the plain prompt if memory fails
}
```

`mode` picks what goes into the prompt: `profile` reads only the maintained profile, `query` searches on the user's message, `full` does both. Memory injection is cached across tool-call continuations within one user turn.

`promptTemplate` receives `{ userMemories, generalSearchMemories, searchResults }`. The first two are pre-formatted markdown, the last is the raw v5 `results` array.

```typescript
import type { MemoryPromptData } from "@supermemory/tools/ai-sdk"

const promptTemplate = (data: MemoryPromptData) => `
<user_memories>
${data.userMemories}
${data.generalSearchMemories}
</user_memories>`.trim()
```

## OpenAI SDK

Entry point `@supermemory/tools/openai`.

### Client middleware

Returns a wrapped client; the original client is not mutated, so one base client can be wrapped per user or conversation.

```typescript
import OpenAI from "openai"
import { withSupermemory } from "@supermemory/tools/openai"

const openai = new OpenAI()
const openaiWithMemory = withSupermemory(openai, {
  namespace: "user_123",
  id: "conversation_456",
  mode: "full",
})

const completion = await openaiWithMemory.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "What do you remember about my preferences?" }],
})
```

Options (`OpenAIMiddlewareOptions`): `namespace`, `id`, `mode`, `addMemory`, `verbose`, `apiKey`, `baseUrl`. Same meanings as the AI SDK middleware.

Next.js route:

```typescript
// app/api/chat/route.ts
import OpenAI from "openai"
import { withSupermemory } from "@supermemory/tools/openai"

const openai = new OpenAI()

export async function POST(req: Request) {
  const { messages, conversationId, userId } = await req.json()
  const client = withSupermemory(openai, { namespace: userId, id: conversationId, mode: "full" })
  const completion = await client.chat.completions.create({ model: "gpt-4o-mini", messages })
  return Response.json({ message: completion.choices[0]?.message })
}
```

### Function calling

```typescript
import OpenAI from "openai"
import { getToolDefinitions, createToolCallExecutor } from "@supermemory/tools/openai"

const openai = new OpenAI()
const tools = getToolDefinitions()
const executeToolCall = createToolCallExecutor(process.env.SUPERMEMORY_API_KEY!, {
  namespace: "user_123",
})

const completion = await openai.chat.completions.create({
  model: "gpt-5",
  messages: [{ role: "user", content: "What do you remember about my preferences?" }],
  tools,
})

for (const toolCall of completion.choices[0]?.message.tool_calls ?? []) {
  const result = await executeToolCall(toolCall)
}
```

The seven tools match the AI SDK set by name (`searchMemories`, `addMemory`, `getProfile`, `documentList`, `documentDelete`, `documentAdd`, `memoryForget`). `createToolCallsExecutor` runs a whole array of tool calls. `supermemoryTools(apiKey, config)` returns plain async functions you can call directly, for example `tools.searchMemories({ informationToGet: "coffee", limit: 10 })`. Per-tool factories exist too: `createSearchMemoriesTool`, `createAddMemoryTool`, and so on.

## Mastra

Entry point `@supermemory/tools/mastra`. An input processor injects memories before the model call, an output processor saves the conversation after it.

```typescript
import { Agent } from "@mastra/core/agent"
import { withSupermemory } from "@supermemory/tools/mastra"
import { openai } from "@ai-sdk/openai"

const agent = new Agent(
  withSupermemory(
    {
      id: "assistant",
      name: "Assistant",
      model: openai("gpt-4o"),
      instructions: "You are a helpful assistant.",
    },
    { namespace: "user_123", id: "conversation_456", mode: "full" },
  ),
)

const response = await agent.generate("What do you know about me?")
```

For direct control use the processors:

```typescript
import { createSupermemoryProcessors } from "@supermemory/tools/mastra"

const { input, output } = createSupermemoryProcessors({
  namespace: "user_123",
  id: "conversation_456",
  mode: "profile",
})

const agent = new Agent({ id: "assistant", name: "Assistant", model: openai("gpt-4o"), inputProcessors: [input], outputProcessors: [output] })
```

Options (`SupermemoryMastraOptions`): `namespace`, `id`, `apiKey`, `baseUrl`, `mode`, `addMemory`, `verbose`, `promptTemplate`.

One agent instance serving many conversations should pass the thread id per request through Mastra's `RequestContext` with `MASTRA_THREAD_ID_KEY`. That value takes precedence over the `id` given at construction. A fixed `id` for all requests merges every user's conversation into one document.

Also exported: `SupermemoryInputProcessor`, `SupermemoryOutputProcessor`, `createSupermemoryProcessor`, `createSupermemoryOutputProcessor`.

## VoltAgent

Entry point `@supermemory/tools/voltagent`. `@voltagent/core` is a peer dependency.

```typescript
import { Agent } from "@voltagent/core"
import { withSupermemory } from "@supermemory/tools/voltagent"
import { openai } from "@ai-sdk/openai"

const agent = new Agent(
  withSupermemory({
    agentConfig: {
      name: "agent",
      instructions: "You are a helpful assistant.",
      model: openai("gpt-4o"),
    },
    namespace: "user_123",
    id: "conversation_456",
    mode: "full",
  }),
)
```

On top of the shared middleware options, VoltAgent exposes the v5 search controls, used in `query` and `full` mode: `searchMode` (`hybrid`, `memories`, `chunks`), `limit`, `threshold`, `rerank` (`none`, `order`, `aggregate`), `rewriteQuery`, `filter` (typed v5 expression), `include` (`{ documents, related, forgotten }`), `metadata` stamped on saved conversations, and `supportingContext` to guide extraction. `createSupermemoryHooks(namespace, options)` is exported for custom hook wiring.

## Claude memory tool

Entry point `@supermemory/tools/claude-memory`. Backs Claude's native `memory_20250818` tool with Supermemory documents. Each memory file is one document in the namespace, keyed by its path and tagged `metadata.source = "claude-memory"`.

```typescript
import Anthropic from "@anthropic-ai/sdk"
import { createClaudeMemoryTool } from "@supermemory/tools/claude-memory"

const anthropic = new Anthropic()
const memoryTool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
  namespace: "user_123",
})

const response = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 2048,
  messages: [{ role: "user", content: "Remember that I prefer React with TypeScript." }],
  tools: [{ type: "memory_20250818", name: "memory" }],
  betas: ["context-management-2025-06-27"],
})

for (const block of response.content) {
  if (block.type === "tool_use" && block.name === "memory") {
    const toolResult = await memoryTool.handleCommandForToolResult(block.input, block.id)
  }
}
```

Supported commands: `view`, `create`, `str_replace`, `insert`, `delete`, `rename`. Paths must start with `/memories/`. Config is `SupermemoryToolsConfig` (`namespace`, `baseUrl`, `strict`).

## Python frameworks

The Python wrapper packages (`supermemory-openai-sdk`, `supermemory-agent-framework`, `supermemory-pipecat`, the livekit and cartesia wrappers) still use the legacy v3/v4 API and `container_tag` as of October 2026. That API shuts down on December 31, 2026. Do not mix their calls with v5 code. Until they ship a v5 release, wire the core `supermemory` 5.x Python SDK into LangChain, LangGraph, CrewAI, the OpenAI Agents SDK, Pipecat, or anything else with the standard pattern:

```python
from supermemory import Supermemory

sm = Supermemory()  # reads SUPERMEMORY_API_KEY

def memory_context(namespace: str, message: str) -> str:
    profile = sm.profile(namespace).profile
    hits = sm.search(namespace, query=message, search_mode="memories", limit=5)
    facts = [m.memory for m in profile.static] + [m.memory for m in profile.dynamic]
    recalled = [r.memory for r in hits.results if r.memory]
    return "Known about the user:\n" + "\n".join(facts) + "\n\nRelevant memories:\n" + "\n".join(recalled)

def remember_turn(namespace: str, conversation_id: str, user: str, assistant: str) -> None:
    sm.add(namespace, content=f"User: {user}\nAssistant: {assistant}", id=conversation_id)
```

Put `memory_context(...)` into the system prompt before the model runs, call `remember_turn(...)` after. Reusing `conversation_id` as `id` keeps one conversation as one document. The async client is `AsyncSupermemory` with the same methods.

## Memory search modes

Middleware `mode`:

| Mode | Reads | Good for |
| --- | --- | --- |
| `profile` (default) | maintained profile only | general personalization, cheapest |
| `query` | memories search on the latest user message | specific lookups |
| `full` | both | assistants that need standing facts and recall |

API `searchMode`, used by the tools and by VoltAgent's `searchMode`: `hybrid` (default, memories and chunks ranked together), `memories` (learned facts only), `chunks` (source text only, for RAG).

## Authentication

Every entry point takes `apiKey` in its config or middleware options and falls back to `SUPERMEMORY_API_KEY`. Pass `apiKey` explicitly in browser code. A self-hosted or enterprise URL is never read from the environment; pass it as `baseUrl`. The Claude example also needs `ANTHROPIC_API_KEY`.
