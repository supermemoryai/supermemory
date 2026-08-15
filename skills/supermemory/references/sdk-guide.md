# Supermemory SDK Guide

Complete reference for the Supermemory SDK in TypeScript and Python.

Method availability below was verified against `supermemory@4.25.4` (npm) and `supermemory==3.56.0` (PyPI). The SDKs are generated from the OpenAPI spec and trail the API slightly — anything marked "no SDK method" is still callable over HTTP, and may have gained a method in a newer release.

## Installation

### TypeScript/JavaScript
```bash
npm install supermemory
# or
yarn add supermemory
# or
pnpm add supermemory
```

📦 View on npm: [https://www.npmjs.com/package/supermemory](https://www.npmjs.com/package/supermemory)

### Python
```bash
pip install supermemory
# Or for async support with aiohttp
pip install 'supermemory[aiohttp]'
```

📦 View on PyPI: [https://pypi.org/project/supermemory/](https://pypi.org/project/supermemory/)

### Other SDKs and Integrations

Discover all available SDKs, community integrations, and framework-specific guides at [supermemory.ai/docs](https://supermemory.ai/docs)

## Initialization

### TypeScript
```typescript
import Supermemory from 'supermemory';        // default export
// import { Supermemory } from 'supermemory'; // named export also works

const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY, // Optional if env var is set
  baseURL: 'https://api.supermemory.ai'    // Optional, defaults to this
});
```

### Python
```python
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

## Method map

| Task | TypeScript | Python |
|---|---|---|
| Ingest content | `client.add()` / `client.documents.add()` | `client.add()` / `client.documents.add()` |
| Batch ingest | `client.documents.batchAdd()` | `client.documents.batch_add()` |
| Upload a file | `client.documents.uploadFile()` | `client.documents.upload_file()` |
| Search memories | `client.search()` | `client.search.memories()` |
| Get a profile | `client.profile()` | `client.profile()` |
| Forget a memory | `client.memories.forget()` | `client.memories.forget()` |
| Update a memory | `client.memories.updateMemory()` | `client.memories.update_memory()` |
| List documents | `client.documents.list()` | `client.documents.list()` |
| Get / update / delete a document | `client.documents.get()` / `.update()` / `.delete()` | `client.documents.get()` / `.update()` / `.delete()` |
| Bulk delete documents | `client.documents.deleteBulk()` | `client.documents.delete_bulk()` |
| Ingestion status | `client.documents.listProcessing()` | `client.documents.list_processing()` |
| Org settings | `client.settings.get()` / `.update()` | `client.settings.get()` / `.update()` |
| Connections | `client.connections.*` | `client.connections.*` |

No SDK method yet — [call these over HTTP](#endpoints-without-sdk-methods): direct memory writes, mass forget, memory listing, profile buckets, conversation ingestion, container tags, settings reset, bucket suggestions.

## Core Methods

### `add()` - Store Content

Queue content for processing and memory extraction. `client.add()` and `client.documents.add()` are the same endpoint (`POST /v3/documents`).

#### TypeScript
```typescript
await client.add({
  content: string,                  // Required: text, URL, or file reference
  containerTag?: string,            // Optional: isolation identifier
  customId?: string,                // Optional: your idempotency key
  metadata?: Record<string, string | number | boolean | string[]>,
  entityContext?: string,           // Optional: context that steers extraction (max 1500 chars)
  filepath?: string,                // Optional: virtual path
  taskType?: "memory" | "superrag"  // Optional: defaults to "memory"
});
// Returns: { id: string, status: string }
```

#### Python
```python
client.add(
    content=str,               # Required: text, URL, or file reference
    container_tag=str,         # Optional: isolation identifier
    custom_id=str,             # Optional: your idempotency key
    metadata=dict,             # Optional: custom key-value pairs
    entity_context=str,        # Optional: context that steers extraction
    task_type=str,             # Optional: "memory" (default) or "superrag"
)
```

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

**Add with custom ID (idempotent):**
```typescript
await client.add({
  content: "Project requirements document...",
  containerTag: "project_abc",
  customId: "requirements_v1",   // re-posting this ID updates the same document
  metadata: { version: "1.0", author: "john@example.com" }
});
```

Ingestion is asynchronous. `status` comes back as `"queued"`; poll `client.documents.listProcessing()` or `client.documents.get(id)` to see when memories are available.

### `profile()` - Retrieve User Context

Pre-computed facts for a container tag. The cheapest way to personalize a prompt — no query required.

#### TypeScript
```typescript
const response = await client.profile({
  containerTag: string,      // Required: user/project identifier
  q?: string,                // Optional: also run a search, returned as searchResults
  threshold?: number,        // Optional: similarity floor for searchResults (0-1)
  filters?: FilterObject     // Optional: metadata filters, see "Metadata Filtering"
});

// Returns:
// {
//   profile: {
//     static?: string[],     // Long-term facts (name, profession, stable preferences)
//     dynamic?: string[]     // Recent context, prefixed [Recent] [YYYY-MM-DD]
//   },
//   searchResults?: {        // Only when q was provided
//     results: Array<{ id, memory?, similarity, updatedAt, metadata }>,
//     total: number,
//     timing: number
//   }
// }
```

#### Python
```python
response = client.profile(
    container_tag=str,         # Required: user/project identifier
    q=str,                     # Optional: also run a search
    threshold=float,           # Optional: similarity floor for search results (0-1)
    filters=dict,              # Optional: metadata filters
)

# Returns a model, accessed by attribute:
#   response.profile.static     -> list[str]
#   response.profile.dynamic    -> list[str]
#   response.search_results     -> present only when q was provided
```

#### Examples

**Profile with a query:**
```typescript
const response = await client.profile({
  containerTag: "user_123",
  q: "What are the user's preferences and settings?"
});

console.log(response.profile.static);    // ["John Doe, staff engineer in Seattle", ...]
console.log(response.profile.dynamic);   // ["[Recent] [2026-08-09] Switched their editor to Zed"]
console.log(response.searchResults);     // Query-relevant memories
```

**Profile without a query:**
```typescript
const response = await client.profile({ containerTag: "user_456" });

console.log(response.profile.static);    // All long-term facts
console.log(response.profile.dynamic);   // Recent context
// response.searchResults is undefined
```

**Bucketed profile (HTTP — `include`/`buckets` are not in the SDK types yet):**
```typescript
const res = await fetch("https://api.supermemory.ai/v4/profile", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    containerTag: "user_123",
    include: ["buckets"],               // omits static + dynamic entirely
    buckets: ["preferences", "goals"],  // omit for all configured buckets
  }),
});
const { profile } = await res.json();
console.log(profile.buckets.preferences);
```

Entries prefixed `[Summary]` are aggregated older context; `[Recent]` entries arrived since the last aggregation. Strip the prefixes for raw text, or keep them to signal recency.

### `search()` - Semantic Search

Semantic search over memories, not keyword matching. In TypeScript the client's `search` is callable — `client.search({...})` hits `/v4/search`, the current endpoint. `client.search.memories()` is an alias for it; `client.search.documents()` and `client.search.execute()` are deprecated and hit the legacy `/v3/search`. In Python, `client.search` is not callable — use `client.search.memories()`.

#### TypeScript
```typescript
const response = await client.search({
  q: string,                  // Required: search query
  containerTag?: string,      // Optional: filter by container tag
  limit?: number,             // Optional: max results
  threshold?: number,         // Optional: similarity floor (0-1)
  searchMode?: "memories" | "hybrid" | "documents",  // "memories" (default), "hybrid" (memories + chunks), "documents" (chunks only)
  filters?: FilterObject,     // Optional: metadata filters
  include?: {                 // Optional: extra payload per result
    chunks?: boolean,
    documents?: boolean,
    summaries?: boolean,
    relatedMemories?: boolean,
    forgottenMemories?: boolean
  },
  rerank?: boolean,           // Optional: cross-encoder re-ranking (higher precision, slower)
  rewriteQuery?: boolean,     // Optional: let the service rewrite q before searching
  aggregate?: boolean         // Optional: collapse near-duplicate memories
});

// Returns:
// {
//   results: Array<{
//     id: string,
//     memory?: string,       // set on memory results
//     chunk?: string,        // set on chunk results (hybrid / documents mode)
//     similarity: number,    // the score — not `score`
//     updatedAt: string,
//     metadata: object | null,
//     version?: number | null,
//     chunks?, documents?, context?   // only when requested via `include`
//   }>,
//   total: number,
//   timing: number           // milliseconds
// }
```

#### Python
```python
response = client.search.memories(
    q=str,                      # Required: search query
    container_tag=str,          # Optional: filter by container tag
    threshold=float,            # Optional: similarity floor (0-1)
    limit=int,                  # Optional: max results
    search_mode=str,            # Optional: "memories" (default), "hybrid", or "documents"
    filters=dict,               # Optional: metadata filters
    rerank=bool,                # Optional: cross-encoder re-ranking
    rewrite_query=bool,         # Optional: server-side query rewriting
)

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

for (const result of response.results) {
  console.log(result.similarity, result.memory ?? result.chunk);
}
```

**Hybrid search for RAG:**
```typescript
const response = await client.search({
  q: "authentication methods",
  containerTag: "docs",
  searchMode: "hybrid",   // memories + document chunks
  threshold: 0.3,
  limit: 10
});
```

**High-precision search:**
```typescript
const response = await client.search({
  q: "what did we decide about rate limiting?",
  containerTag: "eng_notes",
  rerank: true,           // re-rank for precision
  rewriteQuery: true      // helps with terse or pronoun-heavy queries
});
```

### `memories.forget()` - Forget a Memory

Soft-deletes one memory. Identify it by `id`, or by exact `content` when you don't have the ID.

```typescript
const res = await client.memories.forget({
  containerTag: "user_123",   // Required
  id: "mem_abc123",           // Either id...
  // content: "John prefers dark mode",  // ...or exact content
  reason: "outdated information"          // Optional, recorded as forgetReason
});
// { id: "mem_abc123", forgotten: true }
```

```python
res = client.memories.forget(
    container_tag="user_123",
    id="mem_abc123",
    reason="outdated information",
)
```

### `memories.updateMemory()` - Correct a Memory

Creates a new version that supersedes the old one, preserving history. Prefer this over forget-then-add when a fact merely changed.

```typescript
const res = await client.memories.updateMemory({
  containerTag: "user_123",              // Required
  newContent: "John now prefers light mode",  // Required
  id: "mem_abc123",                      // Either id or exact content
  metadata: { source: "chat" },          // Optional: inherits previous version if omitted
  forgetAfter: "2026-12-01T00:00:00Z",   // Optional: ISO expiry, null clears it
  forgetReason: "temporary preference"   // Optional
});
// { id: "mem_xyz789", memory: "...", version: 2, parentMemoryId: "mem_abc123", rootMemoryId: "mem_abc123", ... }
```

```python
res = client.memories.update_memory(
    container_tag="user_123",
    new_content="John now prefers light mode",
    id="mem_abc123",
)
```

### `documents.list()` - List Documents

```typescript
const docs = await client.documents.list({
  containerTags?: string[],           // Note: array, not a single tag
  limit?: number | string,            // Page size
  page?: number | string,             // 1-based
  sort?: "createdAt" | "updatedAt",
  order?: "asc" | "desc",
  filters?: FilterObject,
  includeContent?: boolean,
  filepath?: string
});

// Returns:
// {
//   memories: Array<{ id, title?, status, metadata, createdAt, updatedAt, ... }>,
//   pagination: { currentPage, limit, totalItems, totalPages }
// }
```

```python
docs = client.documents.list(
    container_tags=["user_123"],
    limit=50,
    page=1,
)
# docs.memories, docs.pagination
```

The response field is `memories` (documents with their extracted memories), not `documents`, and pagination is page-based — there is no `offset`.

**Paginated listing:**
```typescript
const page1 = await client.documents.list({ containerTags: ["user_123"], limit: 20, page: 1 });
const page2 = await client.documents.list({ containerTags: ["user_123"], limit: 20, page: 2 });
```

**Check what is still processing:**
```typescript
const processing = await client.documents.listProcessing();
```

### `documents.get()` / `update()` / `delete()`

IDs are positional arguments, not body fields.

```typescript
const doc = await client.documents.get("doc_abc123");
await client.documents.update("doc_abc123", { metadata: { reviewed: true } });
await client.documents.delete("doc_abc123");          // also deletes its memories
await client.documents.deleteBulk({ ids: ["doc_1", "doc_2"] });
```

```python
doc = client.documents.get("doc_abc123")
client.documents.delete("doc_abc123")
```

## Endpoints without SDK methods

These are documented, supported endpoints that the generated SDKs don't cover yet. Call them with `fetch` (or `requests`) against the same base URL with the same bearer token. Full request/response shapes are in `api-reference.md`.

| Endpoint | What it does |
|---|---|
| `POST /v4/memories` | Write memories directly, skipping document ingestion and extraction |
| `POST /v4/memories/forget-matching` | Agentic mass forget by query or ID list, with `dryRun` |
| `POST /v4/memories/list` | List memory entries with version history |
| `POST /v4/profile` with `include` / `buckets` | Bucketed profile reads (the SDK's `profile()` params omit these) |
| `POST /v4/profile/buckets` | List effective bucket definitions for a container tag |
| `POST /v4/conversations` | Ingest structured chat transcripts with append detection |
| `/v3/container-tags/*` | List, configure, delete, and merge container tags |
| `POST /v3/settings/suggest-buckets` | AI-suggested bucket definitions |
| `POST /v3/settings/reset` | Reset org settings to defaults |
| `GET /v3/documents/{id}/chunks`, `/file-url` | Raw chunks, signed file URL |

A small helper keeps call sites clean:

```typescript
const sm = async (path: string, body: unknown) => {
  const res = await fetch(`https://api.supermemory.ai${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`supermemory ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
};

// Write memories directly
await sm("/v4/memories", {
  containerTag: "user_123",
  memories: [
    { content: "John prefers dark mode" },
    { content: "John is from Seattle", isStatic: true },
  ],
});

// Mass forget — preview, then apply exactly what you reviewed
const preview = await sm("/v4/memories/forget-matching", {
  containerTag: "user_123",
  query: "forget everything about Project Titan",
  dryRun: true,
});
const applied = await sm("/v4/memories/forget-matching", {
  containerTag: "user_123",
  ids: preview.candidates.map((c: { id: string }) => c.id),
  reason: "project cancelled",
});

// Ingest a conversation
await sm("/v4/conversations", {
  conversationId: "conv_123",
  containerTags: ["user_123"],
  messages: [
    { role: "user", content: "I switched my editor to Zed" },
    { role: "assistant", content: "Noted — how are you finding it?" },
  ],
});
```

Always `dryRun` a `forget-matching` call before applying it, and prefer applying with the `ids` from the preview: applying with a `query` re-runs the semantic match, which can drift if the container changed in between.

## Advanced Features

### Metadata Filtering

Add rich metadata at write time, then filter at read time. Filter conditions must be wrapped in `AND` or `OR` — a bare `{ metadata: {...} }` object is rejected.

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

const results = await client.search({
  q: "phone reviews",
  containerTag: "reviews",
  filters: {
    AND: [
      { filterType: "numeric", key: "rating", value: "4", numericOperator: ">=" },
      { key: "verified", value: "true" },
      { filterType: "array_contains", key: "tags", value: "apple" }
    ]
  }
});
```

Condition types: string equality (default), `string_contains`, `numeric` (with `numericOperator`), and `array_contains`. `AND`/`OR` nest freely, and any condition accepts `negate` and `ignoreCase`. Numeric values are passed as strings.

### Entity Context for Better Extraction

```typescript
await client.add({
  content: "User mentioned preferring React over Vue",
  containerTag: "user_123",
  entityContext: "This is a conversation about frontend framework preferences"
});
```

`entityContext` (max 1,500 chars) guides what gets extracted and how it's classified. Set it per-call as above, or once per container tag via `PATCH /v3/container-tags/{tag}`. For guidance that should apply org-wide, use `filterPrompt` in `PATCH /v3/settings` instead.

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

If one entity ends up split across two tags (an anonymous session that later signs in), merge them with `POST /v3/container-tags/merge` rather than re-ingesting.

## Integration with AI Frameworks

For Vercel AI SDK, OpenAI, Mastra, and VoltAgent there is a purpose-built package — `@supermemory/tools` — with ready-made tools and middleware that inject memory automatically. Reach for it before hand-rolling the calls below.

### Vercel AI SDK

```typescript
import Supermemory from 'supermemory';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const memory = new Supermemory();

async function chat(userId: string, message: string) {
  // 1. Get context
  const { profile } = await memory.profile({ containerTag: userId, q: message });

  // 2. Generate response with context
  const { text } = await generateText({
    model: openai('gpt-5'),
    system: [
      `Long-term facts:\n${(profile.static ?? []).map(f => `- ${f}`).join('\n')}`,
      `Recent context:\n${(profile.dynamic ?? []).map(f => `- ${f}`).join('\n')}`
    ].join('\n\n'),
    prompt: message
  });

  // 3. Store the exchange
  await memory.add({
    content: `User: ${message}\nAssistant: ${text}`,
    containerTag: userId
  });

  return text;
}
```

### LangChain

```typescript
import Supermemory from 'supermemory';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const memory = new Supermemory();
const llm = new ChatOpenAI({ model: 'gpt-5' });

async function chatWithMemory(userId: string, userMessage: string) {
  const { profile } = await memory.profile({ containerTag: userId, q: userMessage });

  const messages = [
    new SystemMessage(
      `What you know about this user:\n${[...(profile.static ?? []), ...(profile.dynamic ?? [])]
        .map(f => `- ${f}`)
        .join('\n')}`
    ),
    new HumanMessage(userMessage)
  ];

  const response = await llm.invoke(messages);

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
from crewai import Agent

memory = Supermemory()

def create_memory_enhanced_agent(user_id: str):
    response = memory.profile(container_tag=user_id)
    facts = "\n".join(f"- {fact}" for fact in response.profile.static or [])
    recent = "\n".join(f"- {fact}" for fact in response.profile.dynamic or [])

    return Agent(
        role="Personal Assistant",
        goal="Help the user with personalized assistance",
        backstory=f"What you know about this user:\n{facts}\n\nRecent context:\n{recent}",
        verbose=True,
    )
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
Start with the default and adjust based on real queries:
- **0.3-0.5**: Broader recall, good for discovery
- **0.5-0.7**: Balanced precision and recall
- **0.7-1.0**: High precision, fewer but more relevant results

### 5. Correct Memories Instead of Rewriting Them
```typescript
// Fact changed → new version, history preserved
await client.memories.updateMemory({
  containerTag: userId,
  id: memoryId,
  newContent: "Now prefers light mode"
});

// Should never have been stored → forget it
await client.memories.forget({ containerTag: userId, id: memoryId, reason: "user asked" });
```

### 6. Error Handling
The SDKs raise typed errors:
```typescript
import { APIError, RateLimitError, AuthenticationError } from 'supermemory';

try {
  await client.add({ content: "...", containerTag: "user_123" });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid API key");
  } else if (error instanceof RateLimitError) {
    console.error("Rate limit exceeded");
  } else if (error instanceof APIError) {
    console.error(error.status, error.message);
  } else {
    throw error;
  }
}
```

## Naming Conventions

### TypeScript (camelCase)
- `containerTag` / `containerTags`
- `entityContext`
- `customId`
- `newContent`
- `searchMode`
- `threshold`
- `q`

### Python (snake_case)
- `container_tag` / `container_tags`
- `entity_context`
- `custom_id`
- `new_content`
- `search_mode`
- `threshold`
- `q`

Python responses are models, so read them by attribute (`response.profile.static`), not by key.

## Performance Tips

1. **Batch Operations**: Use `documents.batchAdd()` rather than a loop of `add()` calls
2. **Async/Await**: Always use async operations to avoid blocking; Python has `AsyncSupermemory`
3. **Pagination**: `documents.list()` and `/v4/memories/list` are page-based (`limit` + `page`)
4. **Caching**: Cache `profile()` results for short periods if making multiple calls per turn
5. **Cost of quality knobs**: `rerank` and `rewriteQuery` improve results but add latency — enable them per-query, not globally
6. **Processing Time**: Allow 1-2 minutes for PDFs, 5-10 minutes for videos

## Support

- **Documentation**: [supermemory.ai/docs](https://supermemory.ai/docs)
- **SDK Issues**: [github.com/supermemoryai/supermemory](https://github.com/supermemoryai/supermemory)
- **Console**: [console.supermemory.ai](https://console.supermemory.ai)
