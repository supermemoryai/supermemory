# Supermemory SDK Guide

Complete reference for the Supermemory SDK in TypeScript and Python.

## Installation

Supermemory works with the following SDKs natively:

### TypeScript/JavaScript
```bash
npm install supermemory
# or
yarn add supermemory
# or
pnpm add supermemory

# Agent tools and Vercel AI SDK middleware
npm install @supermemory/tools
```

📦 View on npm: [https://www.npmjs.com/package/supermemory](https://www.npmjs.com/package/supermemory)

### Python
```bash
pip install supermemory
# Or for async support with aiohttp
pip install 'supermemory[aiohttp]'

# OpenAI function tools and middleware
pip install supermemory-openai-sdk
```

📦 View on PyPI: [https://pypi.org/project/supermemory/](https://pypi.org/project/supermemory/)

### Other SDKs and Integrations

Discover all available SDKs, community integrations, and framework-specific guides at [supermemory.ai/docs](https://supermemory.ai/docs)

## Initialization

### TypeScript
```typescript
import { Supermemory } from 'supermemory';

const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY, // Optional if env var is set
  baseURL: 'https://api.supermemory.ai' // Optional, defaults to this
});
```

### Python
```python
import os

from supermemory import Supermemory

# Synchronous client
client = Supermemory(
    api_key=os.environ["SUPERMEMORY_API_KEY"],  # Optional if env var is set
    base_url="https://api.supermemory.ai"  # Optional, defaults to this
)

# Asynchronous client
from supermemory import AsyncSupermemory

async_client = AsyncSupermemory(
    api_key=os.environ["SUPERMEMORY_API_KEY"]
)
```

## Core Methods

### `add()` - Store Memories

Add content to Supermemory for processing and memory extraction.

#### TypeScript
```typescript
await client.add({
  content: string,                // Required: plaintext or a URL string
  containerTag?: string,           // Optional: isolation identifier
  entityContext?: string,          // Optional: context for memory extraction
  customId?: string,               // Optional: your custom identifier
  metadata?: Record<string, any>   // Optional: custom key-value pairs
});
```

#### Python
```python
client.add(
    content=str,                    # Required: plaintext or a URL string
    container_tag=str,              # Optional: isolation identifier
    entity_context=str,             # Optional: context for memory extraction
    custom_id=str,                  # Optional: your custom identifier
    metadata=dict                   # Optional: custom key-value pairs
)
```

`add()` does not read a local file path. Upload local files with `client.documents.uploadFile({ file })` in TypeScript or `client.documents.upload_file(file=...)` in Python; `filepath` is metadata, not a file upload.

#### Examples

**Add text content:**
```typescript
await client.add({
  content: "User prefers dark mode and TypeScript over JavaScript",
  containerTag: "user_123",
  metadata: {
    source: "preferences",
    timestamp: new Date().toISOString()
  }
});
```

**Add URL for processing:**
```typescript
await client.add({
  content: "https://example.com/blog/article",
  containerTag: "knowledge_base",
  entityContext: "technical documentation",
  metadata: { type: "documentation", category: "api" }
});
```

**Add with custom ID:**
```typescript
await client.add({
  content: "Project requirements document...",
  containerTag: "project_abc",
  customId: "requirements_v1",
  metadata: { version: "1.0", author: "john@example.com" }
});
```

### `profile()` - Retrieve User Context

Get personalized context including static profile data and relevant dynamic memories.

#### TypeScript
```typescript
const response = await client.profile({
  containerTag: string,      // Required: user/project identifier
  q?: string,                // Optional: search query to include search results
  threshold?: number         // Optional: relevance threshold (0-1, default 0.5)
});

// Returns:
// {
//   profile: {
//     static: string[],      // Array of long-lived profile facts
//     dynamic: string[]      // Array of dynamic memories (recent context)
//   },
//   searchResults?: {        // Only included if q parameter was provided
//     results: Array<{       // Search results
//       id: string,
//       memory?: string,
//       similarity: number,
//       metadata: object | null
//     }>,
//     total: number,
//     timing: number
//   }
// }
```

#### Python
```python
response = client.profile(
    container_tag=str,         # Required: user/project identifier
    q=str,                     # Optional: search query to include search results
    threshold=float            # Optional: relevance threshold (0-1, default 0.5)
)

# Returns a ProfileResponse model:
# response.profile.static / response.profile.dynamic
# response.search_results.results  # only when q was provided
```

#### Examples

**Get user profile:**
```typescript
const response = await client.profile({
  containerTag: "user_123",
  q: "What are the user's preferences and settings?"
});

console.log(response.profile.static);    // ["User John Doe", "Prefers dark mode", ...]
console.log(response.profile.dynamic);   // ["Recently mentioned...", "Last conversation..."]
console.log(response.searchResults);     // Search results for the query (if provided)
```

**Profile without search (just get stored memories):**
```typescript
const response = await client.profile({
  containerTag: "user_456"
  // No q parameter = only returns profile.static and profile.dynamic
});

console.log(response.profile.static);   // All static facts
console.log(response.profile.dynamic);  // Recent dynamic memories
// response.searchResults will be undefined
```

### `search()` - Semantic Search

Search across memories using semantic retrieval. `client.search()` is the current TypeScript v4 call. Python uses `client.search.memories()` for the same v4 endpoint; the TypeScript `client.search.documents()` method is the legacy v3 document response.

#### TypeScript
```typescript
const response = await client.search({
  q: string,                  // Required: search query
  containerTag?: string,      // Optional: filter by container tag
  limit?: number,             // Optional: max results (default 10, max 100)
  threshold?: number,         // Optional: similarity threshold (0-1, default 0.6)
  searchMode?: "memories" | "hybrid" | "documents",  // Optional: "memories" (default), "hybrid" (memories + document chunks), or "documents" (chunks only)
  filters?: FilterObject      // Optional: advanced filtering
});

// Returns:
// {
//   results: Array<{
//     id: string,
//     memory?: string,         // Memory content (for memory results)
//     chunk?: string,          // Chunk content (for chunk results in hybrid mode)
//     metadata: object | null,
//     updatedAt: string,
//     similarity: number,
//     version?: number | null
//   }>,
//   total: number,
//   timing: number             // Search time in milliseconds
// }
```

#### Python
```python
response = client.search.memories(
    q=str,                      # Required: search query
    container_tag=str,          # Optional: filter by container tag
    threshold=float,            # Optional: similarity threshold (0-1, default 0.6)
    limit=int,                  # Optional: max results (default 10, max 100)
    search_mode=str,            # Optional: "memories" (default), "hybrid", or "documents"
    filters=dict                # Optional: advanced filtering
)

# Returns a SearchMemoriesResponse model:
# response.results, response.total, response.timing
```

#### Examples

**Basic semantic search:**
```typescript
const response = await client.search({
  q: "How do I authenticate users?",
  containerTag: "documentation",
  limit: 10
});

response.results.forEach(result => {
  console.log(`Similarity: ${result.similarity}`);
  console.log(`Content: ${result.memory ?? result.chunk}`);
});
```

**Hybrid search for RAG (memories + source chunks):**
```typescript
const response = await client.search({
  q: "authentication methods",
  containerTag: "docs",
  searchMode: "hybrid",  // Returns both extracted memories and document chunks
  threshold: 0.3,
  limit: 10
});
```

**Search with metadata filters:**
```typescript
const response = await client.search({
  q: "authentication methods",
  containerTag: "docs",
  threshold: 0.3,
  filters: {
    AND: [
      { key: "type", value: "tutorial" },
      { key: "category", value: "security" }
    ]
  }
});
```

**Search within a filepath:**
```typescript
const response = await client.search({
  q: "rate limiting configuration",
  containerTag: "specific_project",
  filepath: "/docs/api.md"
});
```

### `documents.list()` - List Documents

Retrieve stored documents with optional filtering and pagination.

#### TypeScript
```typescript
const docs = await client.documents.list({
  containerTags?: string[],  // Optional: filter by one or more containers
  limit?: number,            // Optional: items per page (default 10)
  page?: number,             // Optional: 1-based page number (default 1)
  includeContent?: boolean,  // Optional: include source content (default false)
  sort?: "createdAt" | "updatedAt",
  order?: "asc" | "desc"
});

// Returns:
// {
//   memories: Array<{
//     id: string,
//     status: string,
//     metadata: object,
//     createdAt: string,
//     content?: string       // only when includeContent=true
//   }>,
//   pagination: { currentPage, totalItems, totalPages, limit? }
// }
```

#### Python
```python
docs = client.documents.list(
    container_tags=[str],       # Optional: filter by one or more containers
    limit=int,                  # Optional: items per page (default 10)
    page=int,                   # Optional: 1-based page number (default 1)
    include_content=bool        # Optional: include source content (default False)
)
```

#### Examples

**List all documents for a user:**
```typescript
const docs = await client.documents.list({
  containerTags: ["user_123"],
  limit: 50
});

docs.memories.forEach(doc => {
  console.log(`${doc.id}: ${doc.status}`);
});
```

**Paginated listing:**
```typescript
const page1 = await client.documents.list({ limit: 20, page: 1 });
const page2 = await client.documents.list({ limit: 20, page: 2 });
```

### `documents.delete()` - Delete Document

Permanently remove a source document. Memories extracted from that source are soft-forgotten so they no longer appear in profile or search.

#### TypeScript
```typescript
await client.documents.delete(documentId);
```

#### Python
```python
client.documents.delete(document_id)
```

#### Example

```typescript
await client.documents.delete("doc_abc123");
```

## Advanced Features

### Metadata Filtering

Add rich metadata to enable advanced filtering:

```typescript
await client.add({
  content: "Product review of iPhone 15",
  containerTag: "reviews",
  metadata: {
    product: "iPhone 15",
    rating: 4.5,
    verified: true,
    tags: ["smartphone", "apple", "2024"]
  }
});

// Search with metadata filters
const results = await client.search({
  q: "phone reviews",
  containerTag: "reviews",
  filters: {
    AND: [
      { key: "rating", value: "4.0", filterType: "numeric", numericOperator: ">=" },
      { key: "verified", value: "true" },
      { key: "tags", value: "apple", filterType: "array_contains" }
    ]
  }
});
```

### Entity Context for Better Extraction

Provide context to guide memory extraction:

```typescript
await client.add({
  content: "User mentioned preferring React over Vue",
  containerTag: "user_123",
  entityContext: "This is a conversation about frontend framework preferences"
});
```

The `entityContext` helps Supermemory understand what type of information to extract and prioritize.

### Container Tag Patterns

**Per-User Isolation:**
```typescript
const userId = "user_123";
await client.add({ content: "...", containerTag: userId });
const context = await client.profile({ containerTag: userId, q: "..." });
```

**Multi-Tenant Applications:**
```typescript
const orgTag = `org_${organizationId}`;
const userTag = `org_${organizationId}_user_${userId}`;

// Org-wide knowledge
await client.add({ content: "...", containerTag: orgTag });

// User-specific within org
await client.add({ content: "...", containerTag: userTag });
```

**Project-Based Organization:**
```typescript
const projectTag = `project_${projectId}`;
await client.add({
  content: "Project requirements...",
  containerTag: projectTag,
  metadata: { type: "requirements", version: "1.0" }
});
```

## Integration with AI Frameworks

### Vercel AI SDK

#### Agent tools (`@supermemory/tools/ai-sdk` / `@supermemory/ai-sdk`)

For models that call memory operations explicitly, use the 7-tool set instead of hand-rolling SDK calls:

```typescript
import { generateText, stepCountIs } from "ai"
import { openai } from "@ai-sdk/openai"
import { supermemoryTools } from "@supermemory/tools/ai-sdk"

const allTools = supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
  containerTags: ["user_123"],
})

// Select the operations this agent is allowed to call.
const tools = {
  searchMemories: allTools.searchMemories,
  addMemory: allTools.addMemory,
  getProfile: allTools.getProfile,
  documentList: allTools.documentList,
  documentAdd: allTools.documentAdd,
}

const { text } = await generateText({
  model: openai("gpt-4o"),
  tools,
  stopWhen: stepCountIs(5),
  prompt: "What do you remember about my coffee preferences?",
})
```

Tools: `searchMemories`, `addMemory`, `getProfile`, `documentList`, `documentAdd`, `documentDelete`, `memoryForget`.

Use `searchMemories` for targeted hybrid recall; `getProfile` for broad static/dynamic user context; `documentList`, `documentAdd`, and `documentDelete` for source management. Hybrid search returns both extracted memories and source-document chunks.

If you configure multiple container tags, `searchMemories`, `getProfile`, and `memoryForget` use the first tag because v4 memory operations are single-space. Add, list, and delete operations use the broader configured scope where supported.

`supermemoryTools()` includes destructive operations. Expose `documentDelete` and `memoryForget` only when the agent is authorized to remove data, and require user confirmation when appropriate. `stopWhen` allows the model to consume tool results and produce a final answer instead of stopping immediately after the first tool call.

#### Middleware (`withSupermemory`)

For automatic profile injection and conversation saving without tool calls, import `withSupermemory` from `@supermemory/tools/ai-sdk`:

```typescript
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const modelWithMemory = withSupermemory(openai("gpt-4o"), {
  containerTag: "user_123",
  customId: "conversation_456",
})
```

#### Manual SDK integration

```typescript
import { Supermemory } from 'supermemory';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const memory = new Supermemory();

async function chat(userId: string, message: string) {
  // 1. Get context
  const context = await memory.profile({
    containerTag: userId,
    q: message
  });
  const profileText = [
    ...context.profile.static,
    ...context.profile.dynamic,
  ].join('\n');
  const searchText = JSON.stringify(context.searchResults?.results ?? []);

  // 2. Generate response with context
  const { text } = await generateText({
    model: openai('gpt-4'),
    system: `User Profile:\n${profileText}\n\nRelevant Context:\n${searchText}`,
    prompt: message
  });

  // 3. Store conversation
  await memory.add({
    content: `User: ${message}\nAssistant: ${text}`,
    containerTag: userId
  });

  return text;
}
```

### LangChain

```typescript
import { Supermemory } from 'supermemory';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const memory = new Supermemory();
const llm = new ChatOpenAI({ model: 'gpt-4' });

async function chatWithMemory(userId: string, userMessage: string) {
  // Retrieve context
  const context = await memory.profile({
    containerTag: userId,
    q: userMessage
  });

  // Create messages with context
  const messages = [
    new SystemMessage(`Context: ${JSON.stringify(context)}`),
    new HumanMessage(userMessage)
  ];

  const response = await llm.invoke(messages);

  // Store interaction
  await memory.add({
    content: `${userMessage}\n${response.content}`,
    containerTag: userId
  });

  return response.content;
}
```

### CrewAI

```python
from supermemory import Supermemory
from crewai import Agent, Task, Crew

memory = Supermemory()

def create_memory_enhanced_agent(user_id: str):
    # Get user context
    context = memory.profile(
        container_tag=user_id,
        q="user preferences and history"
    )

    profile_text = "\n".join(
        (context.profile.static or []) + (context.profile.dynamic or [])
    )
    search_text = "\n".join(
        result.memory
        for result in (context.search_results.results if context.search_results else [])
        if result.memory
    )

    agent = Agent(
        role="Personal Assistant",
        goal="Help the user with personalized assistance",
        backstory=f"User Context:\n{profile_text}\n\nRelevant memories:\n{search_text}",
        verbose=True
    )

    return agent
```

## Best Practices

### 1. Consistent Container Tags
Always use the same format for container tags:
```typescript
// Good
const tag = `user_${userId}`;

// Avoid inconsistency
// Sometimes: "user_123"
// Other times: "123"
```

### 2. Rich Metadata
Add metadata for better filtering and organization:
```typescript
await client.add({
  content: "...",
  containerTag: "user_123",
  metadata: {
    source: "chat",
    timestamp: new Date().toISOString(),
    conversationId: "conv_456",
    topics: ["programming", "typescript"]
  }
});
```

### 3. Meaningful Custom IDs
Use custom IDs for idempotency and reference:
```typescript
await client.add({
  content: "...",
  customId: `feedback_${userId}_${Date.now()}`,
  containerTag: "feedback"
});
```

### 4. Appropriate Thresholds
Start with the v4 search default (`0.6`) and adjust based on results:
- **0.3-0.5**: Broader recall, good for discovery
- **0.5-0.7**: Balanced precision and recall; `0.6` is the default
- **0.7-1.0**: High precision, fewer but more relevant results

### 5. Error Handling
Always handle errors gracefully:
```typescript
try {
  await client.add({ content: "...", containerTag: "user_123" });
} catch (error) {
  if (error.status === 401) {
    console.error("Invalid API key");
  } else if (error.status === 429) {
    console.error("Rate limit exceeded");
  } else {
    console.error("Failed to add memory:", error.message);
  }
}
```

## Naming Conventions

### TypeScript (camelCase)
- `containerTag`
- `entityContext`
- `customId`
- `threshold`
- `q`

### Python (snake_case)
- `container_tag`
- `entity_context`
- `custom_id`
- `threshold`

## Performance Tips

1. **Batch Operations**: Add multiple documents in quick succession if needed
2. **Async/Await**: Always use async operations to avoid blocking
3. **Pagination**: Use `limit` and 1-based `page` for large document lists
4. **Caching**: Cache profile() results for short periods if making multiple calls

## Support

- **Documentation**: [supermemory.ai/docs](https://supermemory.ai/docs)
- **SDK Issues**: [github.com/supermemoryai/supermemory](https://github.com/supermemoryai/supermemory)
- **Console**: [console.supermemory.ai](https://console.supermemory.ai)
