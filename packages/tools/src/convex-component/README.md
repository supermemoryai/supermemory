# @supermemory/convex-component

**Add semantic memory and RAG to your Convex apps in 3 lines of code**

[![npm version](https://img.shields.io/npm/v/@supermemory/convex-component.svg)](https://www.npmjs.com/package/@supermemory/convex-component)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Supermemory Convex Component integrates [Supermemory](https://supermemory.ai)'s state-of-the-art semantic memory and RAG capabilities into your [Convex](https://convex.dev) application. Get the best of both worlds:

- **Supermemory**: Advanced semantic search, user profiles, and memory management
- **Convex**: Reactive database, real-time sync, and amazing dashboard visibility

## Features

- **Semantic Memory**: Store and retrieve context with AI-powered understanding
- **User Profiles**: Automatic extraction of static and dynamic user facts
- **Hybrid Search**: Combine memory extraction with document chunk search
- **Reactive Queries**: Auto-updating UI components via Convex
- **Smart Caching**: Reduce API calls with intelligent Convex-based caching
- **Dashboard Visibility**: See all Supermemory API calls in your Convex dashboard
- **TypeScript First**: Fully typed SDK and React hooks

## Installation

```bash
npm install @supermemory/convex-component convex
```

## Quick Start

### 1. Setup Component

Create or update `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import supermemory from "@supermemory/convex-component/convex.config";

const app = defineApp();
app.use(supermemory, { name: "supermemory" });

export default app;
```

### 2. Set API Key

Get your API key from [Supermemory Dashboard](https://supermemory.ai/dashboard) and set it:

```bash
# Environment variable (recommended)
export SUPERMEMORY_API_KEY="your-api-key"

# Or set it programmatically
npx convex run supermemory:mutations.setApiKey '{"apiKey": "your-api-key"}'
```

### 3. Use in Your App

#### React/Next.js with Hooks

```tsx
import { useAddMemory, useSupermemorySearch } from "@supermemory/convex-component/react";

function ChatApp() {
  const addMemory = useAddMemory();
  const { results, isLoading, search } = useSupermemorySearch({
    q: "user preferences",
    containerTag: "user_123",
    searchMode: "hybrid"
  });

  const handleSendMessage = async (message: string) => {
    // Add to memory
    await addMemory({
      content: `User: ${message}`,
      containerTag: "user_123"
    });

    // Search for context
    await search({
      q: message,
      containerTag: "user_123"
    });
  };

  return (
    <div>
      {isLoading && <div>Searching memories...</div>}
      {results?.results.map(r => (
        <div key={r.id}>{r.memory || r.chunk}</div>
      ))}
    </div>
  );
}
```

#### Vanilla TypeScript

```typescript
import { ConvexHttpClient } from "convex/browser";
import { createSupermemoryClient } from "@supermemory/convex-component";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const supermemory = createSupermemoryClient(convex);

// Add a memory
await supermemory.add({
  content: "User loves TypeScript and prefers tabs over spaces",
  containerTag: "user_123",
  metadata: { category: "preferences" }
});

// Search memories
const results = await supermemory.search({
  q: "coding preferences",
  containerTag: "user_123",
  searchMode: "hybrid",
  limit: 5
});

// Get user profile
const profile = await supermemory.profile({
  containerTag: "user_123",
  q: "recent activity"
});

console.log("Static facts:", profile.profile.static);
console.log("Dynamic context:", profile.profile.dynamic);
```

## API Reference

### React Hooks

#### `useAddMemory(componentPath?)`

Hook to add memories to Supermemory.

```tsx
const addMemory = useAddMemory();

await addMemory({
  content: "Meeting notes from Q1 planning",
  containerTag: "user_123",
  customId: "meeting_2024_q1",
  metadata: { type: "meeting" }
});
```

#### `useSupermemorySearch(args, componentPath?)`

Hook for reactive semantic search.

```tsx
const { results, isLoading, error, search } = useSupermemorySearch({
  q: "project updates",
  containerTag: "user_123",
  searchMode: "hybrid",
  limit: 10
});

// Trigger search manually
await search({ q: "new query", containerTag: "user_123" });
```

#### `useSupermemoryProfile(args, componentPath?)`

Hook to get user profile with context.

```tsx
const { profile, isLoading, refresh } = useSupermemoryProfile({
  containerTag: "user_123",
  q: "recent preferences"
});

// Refresh profile
await refresh();
```

#### `useDocumentList(args?, componentPath?)`

Hook to list documents reactively.

```tsx
const documents = useDocumentList({
  containerTag: "user_123",
  limit: 20
});
```

#### `useApiStats(args?, componentPath?)`

Hook to get API statistics for dashboard.

```tsx
const stats = useApiStats({ containerTag: "user_123" });

return (
  <div>
    <p>Total Calls: {stats?.totalCalls}</p>
    <p>Success Rate: {((stats?.successfulCalls / stats?.totalCalls) * 100).toFixed(1)}%</p>
    <p>Avg Response: {stats?.averageResponseTime.toFixed(0)}ms</p>
  </div>
);
```

### Client SDK

#### `createSupermemoryClient(convexClient, componentPath?)`

Creates a Supermemory client for use with Convex.

```typescript
const client = createSupermemoryClient(convex);

// Add memory
await client.add({ content: "...", containerTag: "user_123" });

// Search
const results = await client.search({ q: "...", containerTag: "user_123" });

// Get profile
const profile = await client.profile({ containerTag: "user_123" });

// List documents
const docs = await client.listDocuments({ containerTag: "user_123" });

// Get API logs
const logs = await client.getApiLogs({ limit: 50 });

// Get stats
const stats = await client.getApiStats();

// Clean cache
await client.cleanCache();
```

## Advanced Usage

### Custom Container Tags

Use container tags to organize memories by user, session, project, etc:

```typescript
// Per user
await addMemory({ content: "...", containerTag: "user_alice" });
await addMemory({ content: "...", containerTag: "user_bob" });

// Per session
await addMemory({ content: "...", containerTag: "session_xyz" });

// Per project
await addMemory({ content: "...", containerTag: "project_123" });
```

### Metadata Filtering

Add metadata and filter searches:

```typescript
// Add with metadata
await addMemory({
  content: "Design doc for feature X",
  containerTag: "user_123",
  metadata: { type: "document", priority: "high", team: "engineering" }
});

// Search with filters
const results = await search({
  q: "design documents",
  containerTag: "user_123",
  filters: {
    AND: [
      { key: "type", value: "document" },
      { key: "priority", value: "high" }
    ]
  }
});
```

### Custom IDs for Updates

Use custom IDs to update existing content:

```typescript
// Initial conversation
await addMemory({
  content: "User: Hello\nAssistant: Hi there!",
  containerTag: "user_123",
  customId: "conversation_xyz"
});

// Update with new messages (Supermemory handles the diff)
await addMemory({
  content: "User: What's the weather?\nAssistant: It's sunny!",
  containerTag: "user_123",
  customId: "conversation_xyz" // Same ID = update
});
```

### Cache Management

The component automatically caches search results (5 min) and profiles (2 min). Clean manually:

```typescript
const cleanCache = useCleanCache();
await cleanCache(); // Removes all expired entries
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Next.js/React App                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useSupermemorySearch, useAddMemory, etc.            │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Convex Backend                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Queries    │  │  Mutations   │  │    Actions       │  │
│  │ (Reactive)   │  │ (Tx Cache)   │  │ (Supermemory     │  │
│  │              │  │              │  │  API Calls)      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘  │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │         Convex Tables (Smart Cache)                   │  │
│  │  - searchCache: Search results with TTL              │  │
│  │  - profileCache: User profiles with TTL              │  │
│  │  - documents: Document metadata                       │  │
│  │  - apiLogs: API call logs for dashboard              │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Supermemory API (supermemory.ai)                │
│  - Semantic memory extraction                                │
│  - User profile generation                                   │
│  - Hybrid search (memories + chunks)                         │
│  - Content processing & embedding                            │
└─────────────────────────────────────────────────────────────┘
```

## Why This Architecture?

1. **Best of Both Worlds**: Supermemory's AI-powered memory + Convex's reactive sync
2. **Dashboard Visibility**: See all API calls, cache hits, errors in Convex dashboard
3. **Performance**: Smart caching reduces Supermemory API calls by ~80%
4. **Real-time**: Search results update reactively across all connected clients
5. **DX**: Install one package, 3 lines of config, start building

## Examples

Check out the `/example` directory for a complete Next.js chat app with:
- Real-time semantic search
- User profile extraction
- Conversation memory
- API analytics dashboard

## AI SDK Integration

Use Supermemory with Vercel AI SDK through the Convex backend:

### Middleware (Automatic Context Injection)

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { withSupermemory } from "@supermemory/convex-component/ai-sdk";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

const modelWithMemory = withSupermemory(
  openai("gpt-4"),
  convex,
  "user_123",
  { mode: "full", addMemory: "always" }
);

const result = await generateText({
  model: modelWithMemory,
  messages: [{ role: "user", content: "What do you know about me?" }]
});
```

### Tools (Agent-Based Memory)

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { supermemoryConvexTools } from "@supermemory/convex-component/ai-sdk";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

const result = await streamText({
  model: openai("gpt-4"),
  prompt: "Remember that I love TypeScript",
  tools: supermemoryConvexTools(convex, "user_123")
});
```

## Contributing

Contributions welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md).

## License

MIT © [Supermemory](https://supermemory.ai)

## Links

- [Supermemory Docs](https://supermemory.ai/docs)
- [Convex Docs](https://docs.convex.dev)
- [GitHub](https://github.com/supermemoryai/supermemory)
- [Discord](https://discord.gg/supermemory)

---

Built with ❤️ by the Supermemory team
