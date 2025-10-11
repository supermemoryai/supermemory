# @supermemory/tools

Memory tools for AI SDK and OpenAI function calling with supermemory.

This package provides supermemory tools for both AI SDK and OpenAI function calling through dedicated submodule exports, each with function-based architectures optimized for their respective use cases.

## Installation

```bash
npm install @supermemory/tools
# or
bun add @supermemory/tools
# or
pnpm add @supermemory/tools
# or
yarn add @supermemory/tools
```

## Usage

The package provides two submodule imports:
- `@supermemory/tools/ai-sdk` - For use with the AI SDK framework
- `@supermemory/tools/openai` - For use with OpenAI's function calling

### AI SDK Usage

```typescript
import { supermemoryTools, searchMemoriesTool, addMemoryTool } from "@supermemory/tools/ai-sdk"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Create all tools
const tools = supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
  containerTags: ["your-user-id"],
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
})

// Or create individual tools
const searchTool = searchMemoriesTool(process.env.SUPERMEMORY_API_KEY!, {
  projectId: "your-project-id",
})

const addTool = addMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
  projectId: "your-project-id",
})
```

#### AI SDK Middleware with Supermemory

> [!CAUTION]
> `withSupermemory` is in beta

- `withSupermemory` will take advantage supermemory profile v4 endpoint personalized based on container tag
- Make sure you have `SUPERMEMORY_API_KEY` in env

```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const modelWithMemory = withSupermemory(openai("gpt-5"), "user_id_life")

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

const modelWithMemory = withSupermemory(openai("gpt-5"), "user_id_life", {
	verbose: true
})

const result = await generateText({
	model: modelWithMemory,
	messages: [{ role: "user", content: "where do i live?" }],
})

console.log(result.text)
```

When verbose mode is enabled, you'll see console output like:
```
[supermemory] Searching memories for container: user_id_life
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
const modelWithMemory = withSupermemory(openai("gpt-4"), "user-123")

// Explicitly specify profile mode
const modelWithProfile = withSupermemory(openai("gpt-4"), "user-123", { 
  mode: "profile" 
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

const modelWithQuery = withSupermemory(openai("gpt-4"), "user-123", { 
  mode: "query" 
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

const modelWithFull = withSupermemory(openai("gpt-4"), "user-123", { 
  mode: "full" 
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

const modelWithAutoSave = withSupermemory(openai("gpt-4"), "user-123", {
  addMemory: "always"
})

const result = await generateText({
  model: modelWithAutoSave,
  messages: [{ role: "user", content: "I prefer React with TypeScript for my projects" }],
})
// This message will be automatically saved as a memory
```

**Never Save Memories (Default)** - Only retrieves memories without storing new ones:
```typescript
const modelWithNoSave = withSupermemory(openai("gpt-4"), "user-123")
```

**Combined Options** - Use verbose logging with specific modes and memory storage:
```typescript
const modelWithOptions = withSupermemory(openai("gpt-4"), "user-123", {
  mode: "profile",
  addMemory: "always",
  verbose: true
})
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
  projectId: "your-project-id",
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
  containerTags: ["your-user-id"],
})

const searchResult = await tools.searchMemories({
  informationToGet: "user preferences",
  limit: 10,
})

const addResult = await tools.addMemory({
  memory: "User prefers dark roast coffee",
})
```

## Configuration

Both modules accept the same configuration interface:

```typescript
interface SupermemoryToolsConfig {
  baseUrl?: string
  containerTags?: string[]
  projectId?: string
}
```

- **baseUrl**: Custom base URL for the supermemory API
- **containerTags**: Array of custom container tags (mutually exclusive with projectId)
- **projectId**: Project ID which gets converted to container tag format (mutually exclusive with containerTags)

### withSupermemory Middleware Options

The `withSupermemory` middleware accepts additional configuration options:

```typescript
interface WithSupermemoryOptions {
  verbose?: boolean
  mode?: "profile" | "query" | "full"
  addMemory?: "always" | "never"
}
```

- **verbose**: Enable detailed logging of memory search and injection process (default: false)
- **mode**: Memory search mode - "profile" (default), "query", or "full"
- **addMemory**: Automatic memory storage mode - "always" or "never" (default: "never")

## Available Tools

### Search Memories
Searches through stored memories based on a query string.

**Parameters:**
- `informationToGet` (string): Terms to search for
- `includeFullDocs` (boolean, optional): Whether to include full document content (default: true)
- `limit` (number, optional): Maximum number of results (default: 10)

### Add Memory
Adds a new memory to the system.

**Parameters:**
- `memory` (string): The content to remember



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
  projectId: 'my-app',
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

All memory files are stored in supermemory with normalized paths and can be searched and retrieved across conversations.

## Environment Variables

```env
SUPERMEMORY_API_KEY=your_supermemory_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key  # for Claude Memory Tool
SUPERMEMORY_BASE_URL=https://your-custom-url  # optional
```
