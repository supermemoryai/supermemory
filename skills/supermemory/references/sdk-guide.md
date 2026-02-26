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
```

📦 View on npm: [https://www.npmjs.com/package/supermemory](https://www.npmjs.com/package/supermemory)

### Python
```bash
pip install supermemory
# Or for async support with aiohttp
pip install supermemory[aiohttp]
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
  content: string | URL,          // Required: text, URL, or file path
  containerTag?: string,           // Optional: isolation identifier
  entityContext?: string,          // Optional: context for memory extraction
  customId?: string,               // Optional: your custom identifier
  metadata?: Record<string, any>   // Optional: custom key-value pairs
});
```

#### Python
```python
client.add(
    content=str | url,              # Required: text, URL, or file path
    container_tag=str,              # Optional: isolation identifier
    entity_context=str,             # Optional: context for memory extraction
    custom_id=str,                  # Optional: your custom identifier
    metadata=dict                   # Optional: custom key-value pairs
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
//     static: string[],      // Array of static memories (permanent facts)
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

# Returns dict:
# {
#   "profile": {
#     "static": List[str],     # Array of static memories (permanent facts)
#     "dynamic": List[str]     # Array of dynamic memories (recent context)
#   },
#   "searchResults": {         # Only included if q parameter was provided
#     "results": List[dict],   # Search results
#     "total": int,
#     "timing": int
#   }
# }
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

### `search.memories()` - Semantic Search

Search across memories using semantic understanding, not just keywords.

#### TypeScript
```typescript
const response = await client.search.memories({
  q: string,                  // Required: search query
  containerTag?: string,      // Optional: filter by container tag
  limit?: number,             // Optional: max results (default 10)
  threshold?: number,         // Optional: similarity threshold (0-1, default 0.3)
  searchMode?: "semantic" | "hybrid",  // Optional: "semantic" (default) or "hybrid" (semantic + keyword for RAG)
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
    threshold=float,            # Optional: similarity threshold (0-1, default 0.3)
    limit=int,                  # Optional: max results (default 50)
    search_mode=str,            # Optional: "semantic" (default) or "hybrid"
    filters=dict                # Optional: advanced filtering
)

# Returns dict:
# {
#   "results": List[dict],      # Array of search results
#   "total": int,
#   "timing": int               # Search time in milliseconds
# }
```

#### Examples

**Basic semantic search:**
```typescript
const response = await client.search.memories({
  q: "How do I authenticate users?",
  containerTag: "documentation",
  limit: 10
});

response.results.forEach(result => {
  console.log(`Score: ${result.score}`);
  console.log(`Content: ${result.content}`);
});
```

**Hybrid search for RAG (semantic + keyword):**
```typescript
const response = await client.search.memories({
  q: "authentication methods",
  containerTag: "docs",
  searchMode: "hybrid",  // Combines semantic and keyword search for better RAG accuracy
  threshold: 0.3,
  limit: 10
});
```

**Search with metadata filters:**
```typescript
const response = await client.search.memories({
  q: "authentication methods",
  containerTag: "docs",
  threshold: 0.3,
  filters: {
    metadata: {
      type: "tutorial",
      category: "security"
    }
  }
});
```

**Search within specific document:**
```typescript
const response = await client.search.memories({
  q: "rate limiting configuration",
  containerTag: "specific_project"
});
```

### `documents.list()` - List Documents

Retrieve stored documents with optional filtering and pagination.

#### TypeScript
```typescript
const docs = await client.documents.list({
  containerTag?: string,     // Optional: filter by container
  limit?: number,            // Optional: number of results (default 20)
  offset?: number,           // Optional: pagination offset
  status?: string            // Optional: filter by processing status
});

// Returns:
// {
//   documents: Array<{
//     id: string,
//     content: string,
//     status: string,
//     metadata: object,
//     createdAt: string
//   }>,
//   total: number
// }
```

#### Python
```python
docs = client.documents.list(
    container_tag=str,         # Optional: filter by container
    limit=int,                 # Optional: number of results (default 20)
    offset=int,                # Optional: pagination offset
    status=str                 # Optional: filter by processing status
)
```

#### Examples

**List all documents for a user:**
```typescript
const docs = await client.documents.list({
  containerTag: "user_123",
  limit: 50
});

docs.documents.forEach(doc => {
  console.log(`${doc.id}: ${doc.status}`);
});
```

**Paginated listing:**
```typescript
const page1 = await client.documents.list({ limit: 20, offset: 0 });
const page2 = await client.documents.list({ limit: 20, offset: 20 });
```

**Filter by status:**
```typescript
const processing = await client.documents.list({
  containerTag: "project_abc",
  status: "processing"
});
```

### `documents.delete()` - Delete Document

Remove a document and its associated memories.

#### TypeScript
```typescript
await client.documents.delete({
  docId: string    // Required: document ID
});
```

#### Python
```python
client.documents.delete(
    doc_id=str       # Required: document ID
)
```

#### Example

```typescript
await client.documents.delete({
  docId: "doc_abc123"
});
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
const results = await client.search.memories({
  q: "phone reviews",
  containerTag: "reviews",
  filters: {
    metadata: {
      rating: { $gte: 4.0 },     // Rating >= 4.0
      verified: true,
      tags: { $contains: "apple" }
    }
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

  // 2. Generate response with context
  const { text } = await generateText({
    model: openai('gpt-4'),
    system: `User Profile: ${context.profile}\n\nRelevant Context:\n${context.memories.map(m => m.content).join('\n')}`,
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
        query="user preferences and history"
    )

    agent = Agent(
        role="Personal Assistant",
        goal="Help the user with personalized assistance",
        backstory=f"User Context: {context['profile']}\n\nRecent interactions:\n{context['memories']}",
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
Start with default (0.5) and adjust based on results:
- **0.3-0.5**: Broader recall, good for discovery
- **0.5-0.7**: Balanced precision and recall
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
- `docId`
- `q`

### Python (snake_case)
- `container_tag`
- `entity_context`
- `custom_id`
- `threshold`
- `doc_id`

## Performance Tips

1. **Batch Operations**: Add multiple documents in quick succession if needed
2. **Async/Await**: Always use async operations to avoid blocking
3. **Pagination**: Use `limit` and `offset` for large result sets
4. **Caching**: Cache profile() results for short periods if making multiple calls
5. **Processing Time**: Allow 1-2 minutes for PDFs, 5-10 minutes for videos

## Support

- **Documentation**: [supermemory.ai/docs](https://supermemory.ai/docs)
- **SDK Issues**: [github.com/supermemoryai/supermemory](https://github.com/supermemoryai/supermemory)
- **Console**: [console.supermemory.ai](https://console.supermemory.ai)
