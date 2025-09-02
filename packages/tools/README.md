# @supermemory/tools

Memory tools for AI SDK and OpenAI function calling with supermemory.

This package provides supermemory tools for both AI SDK and OpenAI function calling through dedicated submodule exports, each with function-based architectures optimized for their respective use cases.

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
  projectId: "your-project-id",
})

// Use with AI SDK
const result = await generateText({
  model: openai("gpt-4"),
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
  model: "gpt-4",
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
  projectId: "your-project-id",
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



## Environment Variables

```env
SUPERMEMORY_API_KEY=your_supermemory_api_key
SUPERMEMORY_BASE_URL=https://your-custom-url  # optional
```