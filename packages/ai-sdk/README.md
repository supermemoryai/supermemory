# supermemory AI SDK Utilities

Vercel AI SDK utilities for supermemory

## Installation

```bash
npm install @supermemory/ai-sdk
# or
bun add @supermemory/ai-sdk
# or
pnpm add @supermemory/ai-sdk
# or
yarn add @supermemory/ai-sdk
```

## Features

Choose **one** of the following approaches (they cannot be used together):

- **Infinite Chat Provider**: Connect to various LLM providers with unlimited context support
- **Memory Tools**: Search, add, inspect, and manage Supermemory data using AI agents

## Infinite Chat Provider

The infinite chat provider allows you to connect to various LLM providers with supermemory's context management.

```typescript
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// Using a custom provider URL
const supermemoryOpenai = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id'
  }
})

const result = await generateText({
  model: supermemoryOpenai('gpt-5'),
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ]
})
```

### Complete Infinite Chat Example

```typescript
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!

// Initialize infinite chat provider
const supermemoryOpenai = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id'
  }
})

async function chat(userMessage: string) {
  const result = await generateText({
    model: supermemoryOpenai('gpt-5'),
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant with unlimited context.'
      },
      {
        role: 'user',
        content: userMessage
      }
    ]
    // No tools - infinite chat handles context automatically
  })

  return result.text
}
```

### Configuration

```typescript
// Option 1: Use a named provider
interface ConfigWithProviderName {
  providerName: 'openai' | 'anthropic' | 'openrouter' | 'deepinfra' | 'groq' | 'google' | 'cloudflare'
  providerApiKey: string
  headers?: Record<string, string>
}

// Option 2: Use a custom provider URL
interface ConfigWithProviderUrl {
  providerUrl: string
  providerApiKey: string
  headers?: Record<string, string>
}
```

## Memory Tools

Supermemory tools allow AI agents to search, add, inspect, and manage scoped Supermemory data.

```typescript
import { supermemoryTools } from '@supermemory/ai-sdk'
import { generateText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = await generateText({
  model: openai('gpt-5'),
  messages: [
    { role: 'user', content: 'What do you remember about my preferences?' }
  ],
  tools: {
    ...supermemoryTools('your-supermemory-api-key', {
      // Use either projectId OR containerTags, not both.
      containerTags: ['user-123']
    })
  },
  stopWhen: stepCountIs(5)
})
```

> **Important:** `supermemoryTools()` includes destructive operations: `documentDelete` permanently deletes a source document, while `memoryForget` soft-forgets an extracted profile memory. Do not expose the complete aggregate to an agent unless it should be allowed to perform those operations.

### Complete Memory Tools Example

```typescript
import { supermemoryTools } from '@supermemory/ai-sdk'
import { generateText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'

const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY!

async function chatWithTools(userMessage: string) {
  const result = await generateText({
    model: openai('gpt-5'), // Use standard provider
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant with access to user memories.'
      },
      {
        role: 'user',
        content: userMessage
      }
    ],
    tools: {
      ...supermemoryTools(supermemoryApiKey, {
        containerTags: ['my-user-id']
      })
    },
    stopWhen: stepCountIs(5)
  })

  return result.text
}
```

### Configuration

```typescript
interface SupermemoryToolsConfig {
  // Optional API base URL (default: https://api.supermemory.ai)
  baseUrl?: string

  // One or more non-empty scope tags (cannot be used with projectId)
  containerTags?: string[]

  // Converted to sm_project_<projectId> (cannot be used with containerTags)
  projectId?: string

  // Enable the package's stricter provider-compatible input schemas
  // (default: false)
  strict?: boolean
}
```

`projectId` and `containerTags` are mutually exclusive and empty values are rejected. If neither is provided, v2 uses the explicit scope `sm_project_default`. With multiple `containerTags`, add operations attach every configured tag and document list/delete use their union. V4 search, profile, and forget operations use the first configured tag because those APIs are single-space.

In strict mode, fields covered by a strict schema are required or defaulted. For example, `documentDelete.containerTag` must be a string or `null`; pass `null` to use the configured scope.

### Migrating from v1

Version 1 returned only `searchMemories` and `addMemory` from `supermemoryTools()`. Version 2 returns all seven tools listed below, including deletion and forgetting, so review any code that spreads the aggregate directly into an agent.

Version 1 also left `containerTags` undefined when no scope was configured. Version 2 sends `['sm_project_default']` instead. Before upgrading, choose an explicit `projectId` or `containerTags`, or migrate data that should live in the new default scope.

### Self-Hosted supermemory

If you're running a self-hosted supermemory instance:

```typescript
const tools = supermemoryTools('your-api-key', {
  baseUrl: 'https://your-supermemory-instance.com',
  containerTags: ['production', 'user-memories']
})
```

### Available Tools

| Aggregate key | Individual creator | Purpose |
| --- | --- | --- |
| `searchMemories` | `searchMemoriesTool` | Search learned memories and source chunks in the primary configured tag |
| `addMemory` | `addMemoryTool` | Add a short, atomic memory |
| `getProfile` | `getProfileTool` | Read static/dynamic profile text and optional query results |
| `documentList` | `documentListTool` | List paginated source-document metadata |
| `documentDelete` | `documentDeleteTool` | Permanently delete a source and soft-forget its extracted memories |
| `documentAdd` | `documentAddTool` | Ingest a source document for asynchronous processing |
| `memoryForget` | `memoryForgetTool` | Soft-forget one extracted profile memory |

There is no `fetchMemory` or `fetchMemoryTool`. Use `getProfile` for profile memories, `searchMemories` for relevant source content, and `documentList` for source-document IDs and metadata.

`memoryForget` accepts a memory ID from query-backed `getProfile` search results or from a `searchMemories` result containing a `memory` field; chunk and document IDs are not valid. For safety, `documentDelete` refuses documents that are still processing, lack a verifiable non-empty tag set, or contain any tag outside the effective scope.

### Using Individual Tools

For more flexibility, you can import and use individual tools:

```typescript
import { openai } from '@ai-sdk/openai'
import { generateText, stepCountIs } from 'ai'
import {
  searchMemoriesTool,
  addMemoryTool,
  getProfileTool,
  documentListTool,
  documentDeleteTool,
  documentAddTool,
  memoryForgetTool
} from '@supermemory/ai-sdk'

const searchTool = searchMemoriesTool('your-api-key', {
  projectId: 'your-project-id'
})

// Use only the search tool
const result = await generateText({
  model: openai('gpt-5'),
  messages: [...],
  tools: {
    searchMemories: searchTool
  },
  stopWhen: stepCountIs(5)
})
```

To expose a non-destructive subset, create the aggregate once and select only the tools the agent needs:

```typescript
const allTools = supermemoryTools('your-api-key', {
  containerTags: ['user-123']
})

const safeTools = {
  searchMemories: allTools.searchMemories,
  addMemory: allTools.addMemory,
  getProfile: allTools.getProfile,
  documentList: allTools.documentList,
  documentAdd: allTools.documentAdd
}
```

### Error Handling

All tool executions return a result object with a `success` field:

```typescript
const result = await tools.searchMemories.execute({
  informationToGet: 'user preferences'
})

if (result.success) {
  console.log('Found memories:', result.results)
  console.log('Total count:', result.count)
} else {
  console.error('Error searching memories:', result.error)
}
```

## Development

### Running Tests

```bash
# From the repository root
bun run --cwd packages/ai-sdk test:unit

# Or from packages/ai-sdk
bun run test:unit
```

#### Environment Variables for Tests

Local initialization and unit checks do not require API keys. Network integration checks run only when both of these are set; otherwise they are skipped:

- `SUPERMEMORY_API_KEY`: Supermemory API key
- `OPENAI_API_KEY`: OpenAI API key

**Optional:**

- `SUPERMEMORY_BASE_URL`: Custom Supermemory base URL
- `MODEL_NAME`: OpenAI model used by integration checks (defaults to `gpt-5-nano`)

## License

MIT

## Support

Email our [24/7 Founder/CEO/Support Executive](dhravya@supermemory.com)
