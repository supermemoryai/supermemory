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

# Agent tools and Vercel AI SDK / OpenAI middleware
npm install @supermemory/tools
```

📦 View on npm: [https://www.npmjs.com/package/supermemory](https://www.npmjs.com/package/supermemory)

### Python
```bash
pip install supermemory
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
  baseUrl: 'https://api.supermemory.ai'    // Optional, defaults to this
});
```

Other client options: `timeoutInSeconds`, `headers`, and `maxRetries` (default 2).

### Python
```python
import os

from supermemory import Supermemory

client = Supermemory(
    api_key=os.environ["SUPERMEMORY_API_KEY"],  # Optional if env var is set
    base_url="https://api.supermemory.ai"  # Optional, defaults to this
)
```

## Namespaces

Every content call is scoped to one **namespace**, passed first. A namespace is the isolation boundary (usually one per end user or project). A document belongs to exactly one namespace; to read across several, call once per namespace and merge the results.

In TypeScript, URL values (`namespace`, then `id` where there is one) are positional and everything else goes in one object. In Python, the namespace comes first and everything else is a keyword argument.

## Core Methods

### `add()` - Store Memories

Add content to Supermemory for processing and memory extraction.

#### TypeScript
```typescript
await client.add(namespace, {
  content: string,                   // Required: plaintext or a URL string
  id?: string,                       // Optional: your stable document ID
  supportingContext?: string,        // Optional: context for memory extraction
  metadata?: Record<string, any>,    // Optional: custom key-value pairs
  date?: string,                     // Optional: document date
  taskType?: "memory" | "superrag",  // Optional: "superrag" indexes without memory generation
  dreaming?: "dynamic" | "instant"   // Optional: "dynamic" (default) or "instant"
});

// Returns: { id: string, status: "queued" | "done" | ... }
```

#### Python
```python
client.add(
    namespace,                      # Required: positional
    content=str,                    # Required: plaintext or a URL string
    metadata=dict                   # Optional: custom key-value pairs
)
```

Repeating `add()` with the same `id` appends or diffs the new content into that document; it does not replace it. Use `documents.update()` to replace content.

`dreaming: "instant"` makes memories appear quickly and bills one extra operation per document. Under the default `"dynamic"`, a fresh namespace can show zero memories and an empty profile for several minutes, so use `"instant"` for quickstarts and tests.

`add()` does not read a local file path. Upload local files with `client.documents.uploadFile(namespace, { file })`; on that multipart call, `metadata` is a JSON string.

#### Examples

**Add text content:**
```typescript
await client.add("user_123", {
  content: "User prefers dark mode and TypeScript over JavaScript",
  metadata: {
    source: "preferences",
    timestamp: new Date().toISOString()
  }
});
```

**Add URL for processing:**
```typescript
await client.add("knowledge_base", {
  content: "https://example.com/blog/article",
  supportingContext: "technical documentation",
  metadata: { type: "documentation", category: "api" }
});
```

**Add with your own ID:**
```typescript
await client.add("project_abc", {
  content: "Project requirements document...",
  id: "requirements_v1",
  metadata: { version: "1.0", author: "john@example.com" }
});
```

**Add several documents at once:**
```typescript
await client.documents.batchAdd("project_abc", {
  documents: [
    { content: "first", id: "doc_1" },
    { content: "second", id: "doc_2" },
  ],
});
```

**Upload a file:**
```typescript
await client.documents.uploadFile("project_abc", {
  file,
  metadata: JSON.stringify({ source: "upload" }),
});
```

### `profile()` - Retrieve User Context

Get the maintained profile for a namespace: static (long-lived) and dynamic (recent) memories. Profile takes no query; call `search()` separately when you need query-ranked results.

#### TypeScript
```typescript
const response = await client.profile(namespace, {
  buckets?: string[],   // Optional: narrow the custom bucket section (max 50 names)
  filter?: Filter       // Optional: typed filter (see Metadata Filtering)
});

// Returns:
// {
//   profile: {
//     static: Array<{ id: string, memory: string }>,   // Long-lived profile facts
//     dynamic: Array<{ id: string, memory: string }>,  // Recent context
//     buckets: Record<string, Array<{ id: string, memory: string }>>
//   }
// }
```

#### Python
```python
response = client.profile(namespace)

# response.profile.static / response.profile.dynamic: lists of entries with .id and .memory
```

#### Examples

**Get user profile:**
```typescript
const { profile } = await client.profile("user_123");

console.log(profile.static.map(m => m.memory));   // ["User John Doe", "Prefers dark mode", ...]
console.log(profile.dynamic.map(m => m.memory));  // ["Recently mentioned...", "Last conversation..."]
```

**Profile plus query-ranked memories:**
```typescript
const [{ profile }, { results }] = await Promise.all([
  client.profile("user_456"),
  client.search("user_456", {
    query: "What are the user's preferences and settings?",
    searchMode: "memories"
  })
]);
```

Every profile entry carries an `id`, so it can be passed to `memories.forget()`.

### `search()` - Semantic Search

Search one namespace. Every option goes in one object; omitting `searchMode` gives `hybrid`.

#### TypeScript
```typescript
const response = await client.search(namespace, {
  query: string,                                    // Required: search query
  searchMode?: "hybrid" | "memories" | "chunks",    // Optional: "hybrid" (default), "memories", or "chunks"
  limit?: number,                                   // Optional: max results
  threshold?: number,                               // Optional: similarity threshold (0-1, default 0.3)
  filter?: Filter,                                  // Optional: typed filter
  include?: { documents?: boolean, related?: boolean, forgotten?: boolean },
  rerank?: "none" | "order" | "aggregate",          // Optional: default "none"
  rewriteQuery?: boolean                            // Optional: default false
});

// Returns:
// {
//   results: Array<{
//     id: string,
//     memory?: string,     // Present on memory results
//     chunk?: string,      // Present on chunk results
//     metadata: object,
//     isLatest?: boolean,
//     isInference?: boolean,
//     system: { ... },     // Lifecycle fields
//     included?: { document?, related?: { parents, children, siblings } }
//   }>,
//   searchTime: number
// }
```

Branch on whether a result has `memory` or `chunk` instead of assuming one shape.

#### Python
```python
response = client.search(
    namespace,
    query=str,                  # Required: search query
)

# response.results
```

#### Examples

**Basic semantic search:**
```typescript
const { results } = await client.search("documentation", {
  query: "How do I authenticate users?",
  limit: 10
});

results.forEach(result => {
  console.log(`Content: ${result.memory ?? result.chunk}`);
});
```

**Memories only, with v4-style strictness:**
```typescript
const { results } = await client.search("user_123", {
  query: "What did the user decide?",
  searchMode: "memories",
  threshold: 0.6,
  limit: 10
});
```

**Source chunks only (document search):**
```typescript
const { results } = await client.search("docs", {
  query: "authentication methods",
  searchMode: "chunks"
});
```

**Search with metadata filters:**
```typescript
const { results } = await client.search("docs", {
  query: "authentication methods",
  filter: {
    operator: "and",
    operands: [
      { field: "type", operator: "eq", value: "tutorial" },
      { field: "category", operator: "eq", value: "security" }
    ]
  }
});
```

### `list()` - List Documents, Chunks, or Memories

Retrieve stored items in one namespace with optional filtering and pagination.

#### TypeScript
```typescript
const response = await client.list(namespace, "documents" | "chunks" | "memories", {
  page?: number,                    // Optional: 1-based page number (default 1)
  limit?: number,                   // Optional: items per page (default 10, max 100)
  sort?: "createdAt" | "updatedAt", // Optional: default "createdAt"
  order?: "asc" | "desc",           // Optional: default "desc"
  filter?: Filter                   // Optional: typed filter
});

// Returns:
// {
//   documents: Array<{ id, metadata, system: { status, createdAt, updatedAt }, ... }>,
//   chunks: [...],
//   memories: [...],
//   pagination: { currentPage, totalPages, ... }
// }
// Only the array for the requested type is populated.
```

#### Examples

**List all documents for a user:**
```typescript
const { documents } = await client.list("user_123", "documents", { limit: 50 });

documents.forEach(doc => {
  console.log(`${doc.id}: ${doc.system.status}`);
});
```

There is no separate processing list: read `system.status` on each document (`queued`, `extracting`, `chunking`, `embedding`, `indexing`, `done`, `failed`).

**Paginated listing:**
```typescript
const page1 = await client.list("user_123", "documents", { limit: 20, page: 1 });
const page2 = await client.list("user_123", "documents", { limit: 20, page: 2 });
```

**List memories:**
```typescript
const { memories } = await client.list("user_123", "memories");
```

### `documents.get()` / `documents.update()`

```typescript
const doc = await client.documents.get("user_123", "doc_1", {
  include: ["chunks", "memories"]
});

// Replaces the canonical content and reprocesses it
await client.documents.update("user_123", "doc_1", {
  content: "corrected source",
  metadata: { revision: 2 }
});
```

The document ID may be the Supermemory ID or your own `id`; it is resolved only inside that namespace.

### `documents.delete()` - Delete Documents

Permanently remove source documents. Memories extracted from them are soft-forgotten so they no longer appear in profile or search.

#### TypeScript
```typescript
const { count, errors } = await client.documents.delete(namespace, {
  ids: string[]   // 1-100 Supermemory or caller-defined IDs
});
```

#### Example

```typescript
const { count, errors } = await client.documents.delete("user_123", {
  ids: ["doc_abc123"]
});
```

HTTP success can include partial failures; check `errors`.

### `memories.forget()` / `memories.forgetMatching()` - Forget Memories

```typescript
// Preview memories that match by meaning (dryRun is required)
const preview = await client.memories.forgetMatching("user_123", {
  query: "outdated home address",
  dryRun: true
});

// Forget the reviewed IDs
await client.memories.forget("user_123", {
  ids: preview.matches.map((m) => m.id)
});
```

Both return `{ count, matches, errors }`.

## Advanced Features

### Metadata Filtering

Add rich metadata to enable advanced filtering:

```typescript
await client.add("reviews", {
  content: "Product review of iPhone 15",
  metadata: {
    product: "iPhone 15",
    rating: 4.5,
    verified: true,
    tags: ["smartphone", "apple", "2024"]
  }
});

// Search with a typed filter
const { results } = await client.search("reviews", {
  query: "phone reviews",
  filter: {
    operator: "and",
    operands: [
      { field: "rating", operator: "gte", value: 4.0 },
      { field: "verified", operator: "eq", value: true },
      { field: "tags", operator: "arrayContains", value: "apple" }
    ]
  }
});
```

Filter operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `notContains`, `arrayContains`, `arrayNotContains`, and `and` / `or` groups with `operands`. String comparisons accept `caseSensitive`. `filter` is a typed object, not a JSON string, and the same shape works in `search`, `list`, and `profile`. Keys are literal: `customer.plan` is one field name, not a nested path.

### Supporting Context for Better Extraction

Provide context to guide memory extraction:

```typescript
await client.add("user_123", {
  content: "User mentioned preferring React over Vue",
  supportingContext: "This is a conversation about frontend framework preferences"
});
```

The `supportingContext` helps Supermemory understand what type of information to extract and prioritize. A namespace can also carry its own context:

```typescript
await client.namespaces.update("user_123", {
  supportingContext: "Personal assistant memory for one user"
});
```

### Namespace Patterns

**Per-User Isolation:**
```typescript
const userId = "user_123";
await client.add(userId, { content: "..." });
const { profile } = await client.profile(userId);
```

**Multi-Tenant Applications:**
```typescript
const orgNamespace = `org_${organizationId}`;
const userNamespace = `org_${organizationId}_user_${userId}`;

// Org-wide knowledge
await client.add(orgNamespace, { content: "..." });

// User-specific within org
await client.add(userNamespace, { content: "..." });
```

**Project-Based Organization:**
```typescript
const projectNamespace = `project_${projectId}`;
await client.add(projectNamespace, {
  content: "Project requirements...",
  metadata: { type: "requirements", version: "1.0" }
});
```

**Manage namespaces:**
```typescript
const { namespaces } = await client.namespaces.list();
await client.namespaces.delete("project_alpha", { moveTo: "project_archive" });
```

## Integration with AI Frameworks

### Vercel AI SDK

#### Agent tools (`@supermemory/tools/ai-sdk`)

For models that call memory operations explicitly, use the 7-tool set instead of hand-rolling SDK calls:

```typescript
import { generateText, stepCountIs } from "ai"
import { openai } from "@ai-sdk/openai"
import { supermemoryTools } from "@supermemory/tools/ai-sdk"

const allTools = supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
  namespace: "user_123",
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

Every tool reads and writes only the configured `namespace`. Create one tool set per namespace if an agent needs more than one.

`supermemoryTools()` includes destructive operations. Expose `documentDelete` and `memoryForget` only when the agent is authorized to remove data, and require user confirmation when appropriate. `stopWhen` allows the model to consume tool results and produce a final answer instead of stopping immediately after the first tool call.

#### Middleware (`withSupermemory`)

For automatic profile injection and conversation saving without tool calls, import `withSupermemory` from `@supermemory/tools/ai-sdk`:

```typescript
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const modelWithMemory = withSupermemory(openai("gpt-4o"), {
  namespace: "user_123",
  id: "conversation_456",
})
```

`id` groups a conversation's messages into one document. For the OpenAI SDK, import `withSupermemory` from `@supermemory/tools/openai` and pass the same options.

#### Manual SDK integration

```typescript
import { Supermemory } from 'supermemory';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const memory = new Supermemory();

async function chat(userId: string, conversationId: string, message: string) {
  // 1. Get context
  const [{ profile }, { results }] = await Promise.all([
    memory.profile(userId),
    memory.search(userId, { query: message, searchMode: "memories" })
  ]);
  const profileText = [...profile.static, ...profile.dynamic]
    .map(m => m.memory)
    .join('\n');
  const searchText = results.map(r => r.memory ?? r.chunk).join('\n');

  // 2. Generate response with context
  const { text } = await generateText({
    model: openai('gpt-4'),
    system: `User Profile:\n${profileText}\n\nRelevant Context:\n${searchText}`,
    prompt: message
  });

  // 3. Store conversation; the same id keeps it in one document
  await memory.add(userId, {
    content: `User: ${message}\nAssistant: ${text}`,
    id: conversationId
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
  const [{ profile }, { results }] = await Promise.all([
    memory.profile(userId),
    memory.search(userId, { query: userMessage, searchMode: "memories" })
  ]);

  // Create messages with context
  const messages = [
    new SystemMessage(`Context: ${JSON.stringify({ profile, results })}`),
    new HumanMessage(userMessage)
  ];

  const response = await llm.invoke(messages);

  // Store interaction
  await memory.add(userId, {
    content: `${userMessage}\n${response.content}`
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
    context = memory.profile(user_id)
    search = memory.search(user_id, query="user preferences and history")

    profile_text = "\n".join(
        m.memory for m in context.profile.static + context.profile.dynamic
    )
    search_text = "\n".join(r.memory for r in search.results if r.memory)

    agent = Agent(
        role="Personal Assistant",
        goal="Help the user with personalized assistance",
        backstory=f"User Context:\n{profile_text}\n\nRelevant memories:\n{search_text}",
        verbose=True
    )

    return agent
```

## Best Practices

### 1. Consistent Namespaces
Always use the same format for namespaces:
```typescript
// Good
const namespace = `user_${userId}`;

// Avoid inconsistency
// Sometimes: "user_123"
// Other times: "123"
```

### 2. Rich Metadata
Add metadata for better filtering and organization:
```typescript
await client.add("user_123", {
  content: "...",
  metadata: {
    source: "chat",
    timestamp: new Date().toISOString(),
    conversationId: "conv_456",
    topics: ["programming", "typescript"]
  }
});
```

### 3. Meaningful IDs
Use your own `id` for idempotency and reference. Repeating an `id` appends to that document instead of creating a new one:
```typescript
await client.add("feedback", {
  content: "...",
  id: `feedback_${userId}_${Date.now()}`
});
```

### 4. Appropriate Thresholds
v5 search defaults to `threshold: 0.3` and `searchMode: "hybrid"`. Set them explicitly and adjust based on results:
- **0.3-0.5**: Broader recall, good for discovery
- **0.5-0.7**: Balanced precision and recall
- **0.7-1.0**: High precision, fewer but more relevant results

### 5. Error Handling
Always handle errors gracefully:
```typescript
import { SupermemoryError } from 'supermemory';

try {
  await client.add("user_123", { content: "..." });
} catch (error) {
  if (error instanceof SupermemoryError && error.statusCode === 401) {
    console.error("Invalid API key");
  } else if (error instanceof SupermemoryError && error.statusCode === 429) {
    console.error("Rate limit exceeded");
  } else {
    console.error("Failed to add memory:", error);
  }
}
```

`NotFoundError`, `UnauthorizedError`, and `ConflictError` cover common statuses; `SupermemoryTimeoutError` covers timeouts.

## Naming Conventions

### TypeScript (camelCase)
- `namespace` (first positional argument)
- `id`
- `supportingContext`
- `group`
- `filter`
- `query`
- `threshold`

### Python (snake_case)
- `namespace` (first positional argument)
- `content`, `metadata`, `query` as keyword arguments

## Performance Tips

1. **Batch Operations**: Use `documents.batchAdd()` for up to 600 documents per call
2. **Async/Await**: Always use async operations to avoid blocking
3. **Pagination**: Use `limit` (max 100) and 1-based `page` for large lists
4. **Caching**: Cache profile() results for short periods if making multiple calls

## Support

- **Documentation**: [supermemory.ai/docs](https://supermemory.ai/docs)
- **SDK Issues**: [github.com/supermemoryai/supermemory](https://github.com/supermemoryai/supermemory)
- **Console**: [console.supermemory.ai](https://console.supermemory.ai)
