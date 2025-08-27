# supermemory OpenAI SDK Utilities

OpenAI JS/TS SDK utilities for supermemory

## Installation

```bash
npm install @supermemory/openai-sdk
# or
bun add @supermemory/openai-sdk
# or
pnpm add @supermemory/openai-sdk
# or
yarn add @supermemory/openai-sdk
```

## Features

Choose **one** of the following approaches (they cannot be used together):

- **Infinite Chat Client**: Enhanced OpenAI client with unlimited context support
- **Memory Tools**: Search, add, and fetch memories from supermemory using OpenAI function calling

## Infinite Chat Client

The infinite chat client provides an enhanced OpenAI client with supermemory's context management.

```typescript
import { SupermemoryOpenAI } from '@supermemory/openai-sdk'

// Using a named provider
const client = new SupermemoryOpenAI('your-supermemory-api-key', {
  providerName: 'openai',
  providerApiKey: 'your-openai-api-key',
  headers: {
    // Optional additional headers
  }
})

// Using a custom provider URL
const client = new SupermemoryOpenAI('your-supermemory-api-key', {
  providerUrl: 'https://your-custom-provider.com/v1',
  providerApiKey: 'your-provider-api-key',
  headers: {
    // Optional additional headers
  }
})

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ]
})
```

### Complete Infinite Chat Example

```typescript
import { SupermemoryOpenAI } from '@supermemory/openai-sdk'

const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!

// Initialize infinite chat client
const client = new SupermemoryOpenAI(supermemoryApiKey, {
  providerName: 'openai',
  providerApiKey: openaiApiKey
})

async function chat(userMessage: string) {
  const response = await client.chatCompletion([
    { 
      role: 'system', 
      content: 'You are a helpful assistant with unlimited context.' 
    },
    { 
      role: 'user', 
      content: userMessage 
    }
  ], {
    model: 'gpt-4o'
  })
  
  return response.choices[0].message.content
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

supermemory tools allow OpenAI function calling to interact with user memories for enhanced context and personalization.

```typescript
import { SupermemoryTools, executeMemoryToolCalls } from '@supermemory/openai-sdk'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: 'your-openai-api-key' })

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'What do you remember about my preferences?' }
  ],
  tools: new SupermemoryTools('your-supermemory-api-key', {
  // Optional: specify a base URL for self-hosted instances
  baseUrl: 'https://api.supermemory.com',
  
  // Use either projectId OR containerTags, not both
  projectId: 'your-project-id',
  // OR
  containerTags: ['tag1', 'tag2']
}).getToolDefinitions()
})
```

### Complete Memory Tools Example

```typescript
import { SupermemoryTools, executeMemoryToolCalls } from '@supermemory/openai-sdk'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY!

async function chatWithTools(userMessage: string) {
  const tools = new SupermemoryTools(supermemoryApiKey, {
    projectId: 'my-project'
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
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
    tools: tools.getToolDefinitions()
  })

  // Handle tool calls if present
  if (response.choices[0].message.tool_calls) {
    const toolResults = await executeMemoryToolCalls(
      supermemoryApiKey,
      response.choices[0].message.tool_calls,
      { projectId: 'my-project' }
    )
    
    // Continue conversation with tool results...
  }
  
  return response.choices[0].message.content
}
```

### Configuration

```typescript
interface SupermemoryToolsConfig {
  // Optional: Base URL for API calls (default: https://api.supermemory.com)
  baseUrl?: string
  
  // Container tags for organizing memories (cannot be used with projectId)
  containerTags?: string[]
  
  // Project ID for scoping memories (cannot be used with containerTags)
  projectId?: string
}
```

### Self-Hosted supermemory

If you're running a self-hosted supermemory instance:

```typescript
const tools = new SupermemoryTools('your-api-key', {
  baseUrl: 'https://your-supermemory-instance.com',
  containerTags: ['production', 'user-memories']
})
```

### Available Tools

##### Search Memories

Search through user memories using semantic matching.

```typescript
const searchResult = await tools.searchMemories({
  informationToGet: 'user preferences about coffee'
})
```

##### Add Memory

Add new memories to the user's memory store.

```typescript
const addResult = await tools.addMemory({
  memory: 'User prefers dark roast coffee in the morning'
})
```

##### Fetch Memory

Retrieve a specific memory by its ID.

```typescript
const fetchResult = await tools.fetchMemory({
  memoryId: 'memory-id-123'
})
```

### Using Individual Tools

For more flexibility, you can import and use individual tools:

```typescript
import { 
  createSearchMemoriesTool, 
  createAddMemoryTool, 
  createFetchMemoryTool 
} from '@supermemory/openai-sdk'

const searchTool = createSearchMemoriesTool('your-api-key', {
  projectId: 'your-project-id'
})

// Use only the search tool
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  tools: [searchTool.definition]
})
```

### Error Handling

All tool executions return a result object with a `success` field:

```typescript
const result = await tools.searchMemories({
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
# Run all tests
bun test

# Run tests in watch mode
bun test --watch
```

#### Environment Variables for Tests

All tests require API keys to run. Copy `.env.example` to `.env` and set the required values:

```bash
cp .env.example .env
```

**Required:**
- `SUPERMEMORY_API_KEY`: Your Supermemory API key
- `PROVIDER_API_KEY`: Your AI provider API key (OpenAI, etc.)

**Optional:**
- `SUPERMEMORY_BASE_URL`: Custom Supermemory base URL (defaults to `https://api.supermemory.ai`)
- `PROVIDER_NAME`: Provider name (defaults to `openai`) - one of: `openai`, `anthropic`, `openrouter`, `deepinfra`, `groq`, `google`, `cloudflare`
- `PROVIDER_URL`: Custom provider URL (use instead of `PROVIDER_NAME`)
- `MODEL_NAME`: Model to use in tests (defaults to `gpt-4o-mini`)

Tests will fail if required API keys are not provided.

## License

MIT

## Support

Email our [24/7 Founder/CEO/Support Executive](mailto:dhravya@supermemory.com)