# @supermemory/tools

Memory tools and middleware for Vercel AI SDK, OpenAI, Mastra, VoltAgent and Claude, backed by the [Supermemory](https://supermemory.ai) v5 API.

Pick the entry point for your stack:

| Import | Use it for |
| --- | --- |
| `@supermemory/tools/ai-sdk` | Vercel AI SDK: 7 memory tools for `generateText`/`streamText`, plus `withSupermemory` model middleware |
| `@supermemory/tools/openai` | OpenAI SDK: function-calling tool definitions and executor, plus `withSupermemory` client middleware |
| `@supermemory/tools/mastra` | Mastra agents: input/output processors or the `withSupermemory` config wrapper |
| `@supermemory/tools/voltagent` | VoltAgent agents: `withSupermemory` config wrapper built on hooks |
| `@supermemory/tools/claude-memory` | Claude's native memory tool (`memory_20250818`), stored as Supermemory documents |

Every entry point reads and writes one **namespace**: the Supermemory v5 name for an isolated memory space, usually one per end user. Middleware also takes an **`id`** that groups a conversation's messages into one document.

## Installation

```bash
npm install @supermemory/tools
```

Requires Node 18 or later and a `SUPERMEMORY_API_KEY` from [console.supermemory.ai](https://console.supermemory.ai). The `supermemory@5` SDK comes along as a dependency. Against a self-hosted server, pass `baseUrl` and run `supermemory-server` v0.0.9 or later, which is the first version that serves the v5 routes.

## Migrating from 2.x

3.0 moves every call to the Supermemory v5 API (`supermemory@5`). The full guide is at [supermemory.ai/docs/migration/tools-v3-upgrade](https://supermemory.ai/docs/migration/tools-v3-upgrade).

- **One namespace per config.** `containerTags` and `projectId` are gone. Pass `namespace: string`; every tool reads and writes only that namespace. To keep using data from `projectId: "x"`, pass `namespace: "sm_project_x"`. With no config, tools use `sm_project_default` as before.
- **v5 option names everywhere.** `withSupermemory` (AI SDK, OpenAI, Mastra, VoltAgent) takes `namespace` instead of `containerTag` and `id` instead of `customId`.
- **No per-call scope overrides.** `getProfile`, `documentList`, `documentDelete`, and `memoryForget` no longer accept a `containerTag` argument.
- **`memoryForget`** no longer takes `reason`. Forgetting by `memoryContent` previews matching memories and forgets only the ones whose text matches exactly.
- **`getProfile`** returns v5 profile entries (`{ id, memory }`), so profile IDs can be passed to `memoryForget`. With a `query`, `searchResults` is the v5 search `results` array.
- **`documentList`** returns v5 documents; status is under `system.status`.
- **Conversations** saved by the middlewares are stored as one document per conversation (document `id` = the `id` you pass), instead of through `/v4/conversations`.
- **Claude memory tool** drops `memoryContainerTag`. Its files live in the configured namespace and are marked with `metadata.source = "claude-memory"`. Files written by 2.x are not migrated.
- **VoltAgent** search options use v5 shapes: `filters` → typed `filter`, `rerank` is `"none" | "order" | "aggregate"`, `searchMode: "documents"` → `"chunks"`, `include` keys are `documents`, `related`, `forgotten`, and `entityContext` → `supportingContext`.

## Usage

Each section below covers one entry point: AI SDK, OpenAI, Mastra, VoltAgent, then the Claude memory tool. The `withSupermemory` middleware takes the same options everywhere; see [withSupermemory Middleware Options](#withsupermemory-middleware-options).

### AI SDK Usage

```typescript
import { supermemoryTools, searchMemoriesTool, addMemoryTool } from "@supermemory/tools/ai-sdk"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText, stepCountIs } from "ai"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Create all tools
const tools = supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
  namespace: "your-user-id",
})

// Use with AI SDK
const result = await generateText({
  model: openai("gpt-5"),
  messages: [
    {
      role: "user",
      content: "What do you remember about my preferences?",
    },
  ],
  tools,
  stopWhen: stepCountIs(5),
})

// Or create individual tools
const searchTool = searchMemoriesTool(process.env.SUPERMEMORY_API_KEY!, {
  namespace: "your-user-id",
})

const addTool = addMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
  namespace: "your-user-id",
})
```

#### AI SDK Middleware with Supermemory

- `withSupermemory` injects the Supermemory v5 profile for the given `namespace`, plus a memories search on the latest user message in `query` and `full` modes
- You can provide the Supermemory API key via the `apiKey` option to `withSupermemory` (recommended for browser usage), or fall back to `SUPERMEMORY_API_KEY` in the environment for server usage.
- **Per-turn caching**: Memory injection is cached for tool-call continuations within the same user turn. The middleware detects when the AI SDK is continuing a multi-step flow (e.g., after a tool call) and reuses the cached memories instead of making redundant API calls. A fresh fetch occurs on each new user message turn.

```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const modelWithMemory = withSupermemory(openai("gpt-5"), {
	namespace: "user_id_life",
	id: "conversation-456",
})

const result = await generateText({
	model: modelWithMemory,
	messages: [{ role: "user", content: "where do i live?" }],
})

console.log(result.text)
```

#### Verbose Mode

Enable verbose logging to see detailed information about memory search and transformation:

```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const modelWithMemory = withSupermemory(openai("gpt-5"), {
	namespace: "user_id_life",
	id: "conversation-456",
	verbose: true,
})

const result = await generateText({
	model: modelWithMemory,
	messages: [{ role: "user", content: "where do i live?" }],
})

console.log(result.text)
```

When verbose mode is enabled, you'll see console output like:
```
[supermemory] Searching memories for namespace: user_id_life
[supermemory] User message: where do i live?
[supermemory] System prompt exists: false
[supermemory] Found 3 memories
[supermemory] Memory content: You live in San Francisco, California. Your address is 123 Main Street...
[supermemory] Creating new system prompt with memories
```

#### Memory Search Modes

The middleware supports different modes for memory retrieval:

**Profile Mode (Default)** - Retrieves user profile memories without query filtering:
```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

// Uses profile mode by default - gets all user profile memories
const modelWithMemory = withSupermemory(openai("gpt-4"), {
  namespace: "user-123",
  id: "conversation-456",
})

// Explicitly specify profile mode
const modelWithProfile = withSupermemory(openai("gpt-4"), {
  namespace: "user-123",
  id: "conversation-456",
  mode: "profile",
})

const result = await generateText({
  model: modelWithMemory,
  messages: [{ role: "user", content: "What do you know about me?" }],
})
```

**Query Mode** - Searches memories based on the user's message:
```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const modelWithQuery = withSupermemory(openai("gpt-4"), {
  namespace: "user-123",
  id: "conversation-456",
  mode: "query",
})

const result = await generateText({
  model: modelWithQuery,
  messages: [{ role: "user", content: "What's my favorite programming language?" }],
})
```

**Full Mode** - Combines both profile and query results:
```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const modelWithFull = withSupermemory(openai("gpt-4"), {
  namespace: "user-123",
  id: "conversation-456",
  mode: "full",
})

const result = await generateText({
  model: modelWithFull,
  messages: [{ role: "user", content: "Tell me about my preferences" }],
})
```

#### Automatic Memory Capture

The middleware can automatically save user messages as memories:

**Always Save Memories** - Automatically stores every user message as a memory:
```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const modelWithAutoSave = withSupermemory(openai("gpt-4"), {
  namespace: "user-123",
  id: "conversation-456",
  addMemory: "always",
})

const result = await generateText({
  model: modelWithAutoSave,
  messages: [{ role: "user", content: "I prefer React with TypeScript for my projects" }],
})
// This message will be automatically saved as a memory
```

**Never Save Memories** - Only retrieves memories without storing new ones:
```typescript
const modelWithNoSave = withSupermemory(openai("gpt-4"), {
  namespace: "user-123",
  id: "conversation-456",
  addMemory: "never",  // explicit since default is now "always"
})
```

**Combined Options** - Use verbose logging with specific modes and memory storage:
```typescript
const modelWithOptions = withSupermemory(openai("gpt-4"), {
  namespace: "user-123",
  id: "conversation-456",
  mode: "profile",
  addMemory: "always",
  verbose: true,
})
```

#### Custom Prompt Templates

Customize how memories are formatted and injected into the system prompt using the `promptTemplate` option. This is useful for:
- Using XML-based prompting (e.g., for Claude models)
- Custom branding (removing "supermemories" references)
- Controlling how your agent describes where information comes from

```typescript
import { generateText } from "ai"
import { withSupermemory, type MemoryPromptData } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const customPrompt = (data: MemoryPromptData) => `
<user_memories>
Here is some information about your past conversations with the user:
${data.userMemories}
${data.generalSearchMemories}
</user_memories>
`.trim()

const modelWithCustomPrompt = withSupermemory(openai("gpt-4"), {
  namespace: "user-123",
  id: "conversation-456",
  mode: "full",
  promptTemplate: customPrompt,
})

const result = await generateText({
  model: modelWithCustomPrompt,
  messages: [{ role: "user", content: "What do you know about me?" }],
})
```

The `MemoryPromptData` object provides:
- `userMemories`: Pre-formatted markdown combining static profile facts (name, preferences, goals) and dynamic context (current projects, recent interests)
- `generalSearchMemories`: Pre-formatted search results based on semantic similarity to the current query
- `searchResults`: Raw search results array for traversing, filtering, or selectively including results based on metadata

### OpenAI SDK Usage

#### OpenAI Middleware with Supermemory

The `withSupermemory` function creates an OpenAI client with SuperMemory middleware automatically injected:

```typescript
import { withSupermemory } from "@supermemory/tools/openai"

// Create OpenAI client with supermemory middleware
const openaiWithSupermemory = withSupermemory(openai, {
  namespace: "user-123",      // Required: identifies the user or project
  id: "conversation-456",  // Required: groups messages into the same document
  apiKey: process.env.SUPERMEMORY_API_KEY, // Optional env fallback
  baseUrl: process.env.SUPERMEMORY_BASE_URL,
  mode: "full",
  addMemory: "always",           // Default: "always"
  verbose: true,
})

// Use directly with chat completions - memories are automatically injected
const completion = await openaiWithSupermemory.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "user", content: "What do you remember about my preferences?" }
  ],
})

console.log(completion.choices[0]?.message?.content)
```

#### OpenAI Middleware Options

The middleware supports the same configuration options as the AI SDK version:

```typescript
const openaiWithSupermemory = withSupermemory(openai, {
  namespace: "user-123",      // Required: identifies the user or project
  id: "conversation-456",  // Required: groups messages for contextual memory
  apiKey: process.env.SUPERMEMORY_API_KEY, // Optional; captured per client
  baseUrl: process.env.SUPERMEMORY_BASE_URL,
  mode: "full",                  // "profile" | "query" | "full"
  addMemory: "always",           // "always" (default) | "never"
  verbose: true,                 // Enable detailed logging
})
```

#### Next.js API Route Example

Here's a complete example for a Next.js API route:

```typescript
// app/api/chat/route.ts
import { withSupermemory } from "@supermemory/tools/openai"
import type { OpenAI as OpenAIType } from "openai"

export async function POST(req: Request) {
  const { messages, conversationId } = (await req.json()) as {
    messages: OpenAIType.Chat.Completions.ChatCompletionMessageParam[]
    conversationId: string
  }

  const openaiWithSupermemory = withSupermemory(openai, {
    namespace: "user-123",
    id: conversationId,
    apiKey: process.env.SUPERMEMORY_API_KEY,
    baseUrl: process.env.SUPERMEMORY_BASE_URL,
    mode: "full",
    addMemory: "always",
    verbose: true,
  })

  const completion = await openaiWithSupermemory.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  })

  const message = completion.choices?.[0]?.message
  return Response.json({ message, usage: completion.usage })
}
```

### OpenAI Function Calling Usage

```typescript
import { supermemoryTools, getToolDefinitions, createToolCallExecutor } from "@supermemory/tools/openai"
import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Get tool definitions for OpenAI
const toolDefinitions = getToolDefinitions()

// Create tool executor
const executeToolCall = createToolCallExecutor(process.env.SUPERMEMORY_API_KEY!, {
  namespace: "your-user-id",
})

// Use with OpenAI Chat Completions
const completion = await client.chat.completions.create({
  model: "gpt-5",
  messages: [
    {
      role: "user",
      content: "What do you remember about my preferences?",
    },
  ],
  tools: toolDefinitions,
})

// Execute tool calls if any
if (completion.choices[0]?.message.tool_calls) {
  for (const toolCall of completion.choices[0].message.tool_calls) {
    const result = await executeToolCall(toolCall)
    console.log(result)
  }
}

// Or create individual function-based tools
const tools = supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
  namespace: "your-user-id",
})

const searchResult = await tools.searchMemories({
  informationToGet: "user preferences",
  limit: 10,
})

const addResult = await tools.addMemory({
  memory: "User prefers dark roast coffee",
})
```

### Mastra Usage

Add persistent memory to [Mastra](https://mastra.ai) AI agents. The integration provides processors that:
- **Input Processor**: Fetches relevant memories and injects them into the system prompt before LLM calls
- **Output Processor**: Saves conversations to Supermemory after responses (enabled by default)

#### Quick Start with `withSupermemory` Wrapper

The simplest way to add memory to a Mastra agent - wrap your config before creating the Agent:

```typescript
import { Agent } from "@mastra/core/agent"
import { withSupermemory } from "@supermemory/tools/mastra"
import { openai } from "@ai-sdk/openai"

// Create agent with memory-enhanced config
const agent = new Agent(withSupermemory(
  {
    id: "my-assistant",
    name: "My Assistant",
    model: openai("gpt-4o"),
    instructions: "You are a helpful assistant.",
  },
  {
    namespace: "user-123",  // Required: scopes memories to this user
    id: "conv-456",      // Required: groups messages for contextual memory
    mode: "full",
  }
))

const response = await agent.generate("What do you know about me?")
console.log(response.text)
```

#### Direct Processor Usage

For fine-grained control, use processors directly:

```typescript
import { Agent } from "@mastra/core/agent"
import { createSupermemoryProcessors } from "@supermemory/tools/mastra"
import { openai } from "@ai-sdk/openai"

const { input, output } = createSupermemoryProcessors({
  namespace: "user-123",
  id: "conv-456",
  mode: "full",
  verbose: true, // Enable logging
})

const agent = new Agent({
  id: "my-assistant",
  name: "My Assistant",
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant with memory.",
  inputProcessors: [input],
  outputProcessors: [output],
})

const response = await agent.generate("What's my favorite programming language?")
```

#### Complete Example

Here's a full example showing a multi-turn conversation with memory:

```typescript
import { Agent } from "@mastra/core/agent"
import { createSupermemoryProcessors } from "@supermemory/tools/mastra"
import { openai } from "@ai-sdk/openai"

async function main() {
  const userId = "user-alex-123"
  const id = `thread-${Date.now()}`

  const { input, output } = createSupermemoryProcessors({
    namespace: userId,
    id,
    mode: "profile",      // Fetch user profile memories
    verbose: true,
  })

  const agent = new Agent({
    id: "memory-assistant",
    name: "Memory Assistant",
    instructions: `You are a helpful assistant with memory.
Use the memories provided to personalize your responses.`,
    model: openai("gpt-4o-mini"),
    inputProcessors: [input],
    outputProcessors: [output],
  })

  // First conversation - introduce yourself
  console.log("User: Hi! I'm Alex, a TypeScript developer.")
  const r1 = await agent.generate("Hi! I'm Alex, a TypeScript developer.")
  console.log("Assistant:", r1.text)

  // Second conversation - the agent should remember
  console.log("\nUser: What do you know about me?")
  const r2 = await agent.generate("What do you know about me?")
  console.log("Assistant:", r2.text)
}

main()
```

#### Memory Search Modes

- **`profile`** (default): Fetches user profile memories (static facts + dynamic context)
- **`query`**: Searches memories based on the user's message
- **`full`**: Combines both profile and query results

```typescript
// Profile mode - good for general personalization
const { input } = createSupermemoryProcessors({
  namespace: "user-123",
  id: "conv-456",
  mode: "profile",
})

// Query mode - good for specific lookups
const { input } = createSupermemoryProcessors({
  namespace: "user-123",
  id: "conv-456",
  mode: "query",
})

// Full mode - comprehensive context
const { input } = createSupermemoryProcessors({
  namespace: "user-123",
  id: "conv-456",
  mode: "full",
})
```

#### Custom Prompt Templates

Customize how memories are formatted in the system prompt:

```typescript
import { createSupermemoryProcessors, type MemoryPromptData } from "@supermemory/tools/mastra"

const customTemplate = (data: MemoryPromptData) => `
<user_context>
${data.userMemories}
${data.generalSearchMemories}
</user_context>
`.trim()

const { input, output } = createSupermemoryProcessors({
  namespace: "user-123",
  id: "conv-456",
  mode: "full",
  promptTemplate: customTemplate,
})
```

#### Using RequestContext for Dynamic Thread IDs

For server setups where one agent instance handles multiple concurrent conversations, use Mastra's `RequestContext` to provide per-request thread IDs. **RequestContext takes precedence** over the construction-time `id`:

```typescript
import { Agent } from "@mastra/core/agent"
import { RequestContext, MASTRA_THREAD_ID_KEY } from "@mastra/core/request-context"
import { createSupermemoryProcessors } from "@supermemory/tools/mastra"

const { input, output } = createSupermemoryProcessors({
  namespace: "user-123",
  id: "fallback-conv",  // Used only when RequestContext doesn't provide a threadId
  mode: "profile",
})

const agent = new Agent({
  id: "my-assistant",
  name: "My Assistant",
  model: openai("gpt-4o"),
  inputProcessors: [input],
  outputProcessors: [output],
})

// Per-request threadId takes precedence over id
const ctx = new RequestContext()
ctx.set(MASTRA_THREAD_ID_KEY, "user-456-session-789")

const response = await agent.generate("Hello!", { requestContext: ctx })
// This conversation is stored under "user-456-session-789", not "fallback-conv"
```

> **Server-side usage**: Always use `RequestContext` to pass unique conversation IDs per request. Using a fixed `id` for all requests will merge conversations from different users.

#### Mastra Configuration Options

```typescript
interface SupermemoryMastraOptions {
  namespace: string         // Required: Namespace (e.g. user ID) for scoping memories
  id: string             // Required: Groups messages into a single document for contextual memory
  apiKey?: string              // Supermemory API key (or use SUPERMEMORY_API_KEY env var)
  baseUrl?: string             // Custom API endpoint
  mode?: "profile" | "query" | "full"  // Memory search mode (default: "profile")
  addMemory?: "always" | "never"       // Auto-save conversations (default: "always")
  verbose?: boolean            // Enable debug logging (default: false)
  promptTemplate?: (data: MemoryPromptData) => string  // Custom memory formatting
}
```

### VoltAgent Usage

Add memory to a [VoltAgent](https://voltagent.dev) agent by wrapping its config. `withSupermemory` installs hooks that inject memories before each run and save the conversation after it.

```typescript
import { Agent } from "@voltagent/core"
import { withSupermemory } from "@supermemory/tools/voltagent"
import { openai } from "@ai-sdk/openai"

const agent = new Agent(
  withSupermemory({
    agentConfig: {
      name: "my-agent",
      instructions: "You are a helpful assistant.",
      model: openai("gpt-4o"),
    },
    namespace: "user-123",   // Required: the namespace to read and write
    id: "conversation-456",  // Required: groups this conversation into one document
    mode: "full",
  }),
)

const result = await agent.generateText("What's my favorite programming language?")
```

`@voltagent/core` is a peer dependency; install it yourself.

#### VoltAgent Options

On top of the shared middleware options (`mode`, `addMemory`, `verbose`, `apiKey`, `baseUrl`, `promptTemplate`), VoltAgent exposes the v5 search controls. They apply in `query` and `full` mode and are ignored in `profile` mode:

```typescript
withSupermemory({
  agentConfig,
  namespace: "user-123",
  id: "conversation-456",
  mode: "query",
  searchMode: "hybrid",          // "hybrid" (recommended) | "memories" | "chunks"
  limit: 10,                     // 1-100
  threshold: 0.3,                // 0-1, higher is stricter
  rerank: "order",               // "none" (default) | "order" | "aggregate"
  rewriteQuery: true,            // adds ~400ms
  filter: { field: "type", operator: "eq", value: "note" },   // typed v5 filter expression
  include: { documents: true, related: false, forgotten: false },
  metadata: { app: "support-bot" },          // stamped on saved conversations
  supportingContext: "Support chats for Acme customers",  // guides memory extraction, max 1500 chars
})
```

## Configuration

The tool entry points (`ai-sdk` and `openai`) accept the same configuration:

```typescript
interface SupermemoryToolsConfig {
  baseUrl?: string
  namespace?: string
  strict?: boolean
}
```

- **baseUrl**: Custom base URL for the supermemory API
- **namespace**: The one namespace every tool reads and writes (default: `sm_project_default`). `documentDelete` refuses a document that is still processing.
- **strict**: Enable strict schema mode for OpenAI strict validation. When `true`, all schema properties are required (satisfies OpenAI strict mode). When `false` (default), optional fields remain optional for maximum compatibility with all models.

### OpenAI Strict Mode Compatibility

When using OpenAI-compatible providers with strict schema validation (e.g., OpenRouter with Azure OpenAI backend), enable strict mode to ensure all schema properties are included in the `required` array:

```typescript
import { searchMemoriesTool, addMemoryTool } from "@supermemory/tools/ai-sdk"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { streamText } from "ai"

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

const tools = {
  searchMemories: searchMemoriesTool(apiKey, { 
    namespace: userId,
    strict: true  // ✅ Required for OpenAI strict mode
  }),
  addMemory: addMemoryTool(apiKey, { 
    namespace: userId,
    strict: true
  }),
}

const result = streamText({
  model: openrouter.chat("openai/gpt-5-nano"),
  messages: [...],
  tools,
})
```

Without `strict: true`, optional fields like `includeFullDocs` and `limit` won't be in the `required` array, which will cause validation errors with OpenAI strict mode.

### withSupermemory Middleware Options

The `withSupermemory` middleware accepts a configuration object as the second argument:

```typescript
interface WithSupermemoryOptions {
  namespace: string  // Required: identifies the user or project
  id: string      // Required: groups messages into the same document
  verbose?: boolean
  mode?: "profile" | "query" | "full"
  addMemory?: "always" | "never"  // Default: "always"
  /** Optional Supermemory API key. Use this in browser environments. */
  apiKey?: string
  baseUrl?: string
  promptTemplate?: (data: MemoryPromptData) => string
  skipMemoryOnError?: boolean
}
```

- **namespace**: Required. The namespace to read and write (e.g., user ID, project ID)
- **id**: Required. ID that groups messages into a single document for contextual memory generation
- **verbose**: Enable detailed logging of memory search and injection process (default: false)
- **mode**: Memory search mode - "profile" (default), "query", or "full"
- **addMemory**: Automatic memory storage mode - "always" (default) or "never"
- **skipMemoryOnError**: If memory retrieval fails or hits the internal timeout, continue with the original prompt (default: true)

## Available Tools

### Search Memories
Runs v5 hybrid search in the configured namespace (threshold 0.6). Results can contain learned memories (`memory`) and source chunks (`chunk`). Only IDs on results containing `memory` can be passed to `memoryForget`; chunk-result IDs cannot.

**Parameters:**
- `informationToGet` (string): Terms to search for
- `includeFullDocs` (boolean, optional): Deprecated compatibility input; ignored by hybrid search
- `limit` (number, optional): Maximum number of results (default: 10)

### Add Memory
Adds a short fact as a document processed with `dreaming: "instant"`, so the memory is available quickly.

**Parameters:**
- `memory` (string): The content to remember

### Get Profile
Returns the v5 profile (`static`, `dynamic`, `buckets`; each entry is `{ id, memory }`). With `query`, also runs a memories search and returns its results as `searchResults`.

### Document List / Add / Delete
`documentList` pages through documents in the namespace. `documentAdd` stores raw content for processing. `documentDelete` takes a Supermemory ID or your own document ID and refuses while the document is still processing.

### Memory Forget
Forgets one memory by `memoryId`, or by `memoryContent`: a dry-run preview finds candidates, and only memories whose text matches exactly are forgotten.



## Claude Memory Tool

Enable Claude to store and retrieve persistent memory across conversations using supermemory as the backend.

### Installation

```bash
npm install @supermemory/tools @anthropic-ai/sdk
```

### Basic Usage

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { createClaudeMemoryTool } from '@supermemory/tools/claude-memory'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const memoryTool = createClaudeMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
  namespace: 'my-app',
})

async function chatWithMemory(userMessage: string) {
  // Send message to Claude with memory tool
  const response = await anthropic.beta.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userMessage }],
    tools: [{ type: 'memory_20250818', name: 'memory' }],
    betas: ['context-management-2025-06-27'],
  })

  // Handle any memory tool calls
  const toolResults = []
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'memory') {
      const toolResult = await memoryTool.handleCommandForToolResult(
        block.input,
        block.id
      )
      toolResults.push(toolResult)
    }
  }

  return response
}

// Example usage
const response = await chatWithMemory(
  "Remember that I prefer React with TypeScript for my projects"
)
```

### Memory Operations

Claude can perform these memory operations automatically:

- **`view`** - List memory directory contents or read specific files
- **`create`** - Create new memory files with content
- **`str_replace`** - Find and replace text within memory files
- **`insert`** - Insert text at specific line numbers
- **`delete`** - Delete memory files
- **`rename`** - Rename or move memory files

All memory files are stored as documents in the configured namespace, keyed by their normalized path and marked with `metadata.source = "claude-memory"`.

## Environment Variables

```env
SUPERMEMORY_API_KEY=your_supermemory_api_key   # read by every entry point when apiKey is not passed
ANTHROPIC_API_KEY=your_anthropic_api_key       # for the Claude memory tool
```

A custom API URL (self-hosted or enterprise) is not read from the environment. Pass it as `baseUrl` in the config, for example `baseUrl: process.env.SUPERMEMORY_BASE_URL`.
