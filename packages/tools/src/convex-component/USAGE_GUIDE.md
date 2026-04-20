# Supermemory Convex Component - Complete Usage Guide

This guide walks you through everything you need to know to use the Supermemory Convex Component in your application.

## Table of Contents

1. [Installation](#installation)
2. [Setup](#setup)
3. [Basic Usage](#basic-usage)
4. [React Hooks API](#react-hooks-api)
5. [Client SDK API](#client-sdk-api)
6. [Advanced Patterns](#advanced-patterns)
7. [Convex Dashboard](#convex-dashboard)
8. [Troubleshooting](#troubleshooting)

## Installation

```bash
npm install @supermemory/convex-component convex
# or
bun add @supermemory/convex-component convex
```

## Setup

### Step 1: Initialize Convex (if you haven't already)

```bash
npx convex dev
```

### Step 2: Configure the Component

Create or update `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import supermemory from "@supermemory/convex-component/convex.config";

const app = defineApp();
app.use(supermemory, { name: "supermemory" });

export default app;
```

### Step 3: Set Your Supermemory API Key

You have two options:

**Option A: Environment Variable (Recommended)**

```bash
# Add to .env.local
SUPERMEMORY_API_KEY=your-api-key-here
```

**Option B: Store in Convex**

```bash
npx convex run supermemory:mutations.setApiKey '{"apiKey": "your-api-key-here"}'
```

Get your API key from [supermemory.ai/dashboard](https://supermemory.ai/dashboard).

## Basic Usage

### Adding Memories

```typescript
import { createSupermemoryClient } from "@supermemory/convex-component";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const supermemory = createSupermemoryClient(convex);

// Add a simple memory
await supermemory.add({
  content: "User prefers dark mode and uses TypeScript",
  containerTag: "user_alice",
});

// Add a conversation
await supermemory.add({
  content: `User: What's your favorite framework?
Assistant: I love Next.js for full-stack development.
User: Me too! The app router is amazing.`,
  containerTag: "user_alice",
  customId: "conversation_001", // For updates
});
```

### Searching Memories

```typescript
const results = await supermemory.search({
  q: "framework preferences",
  containerTag: "user_alice",
  searchMode: "hybrid", // or "memories"
  limit: 5,
});

console.log(results.results);
// [
//   {
//     id: "mem_xyz",
//     memory: "User loves Next.js for full-stack development",
//     similarity: 0.92,
//     ...
//   }
// ]
```

### Getting User Profiles

```typescript
const profile = await supermemory.profile({
  containerTag: "user_alice",
  q: "preferences", // Optional: context for search
});

console.log("Static facts:", profile.profile.static);
// ["User prefers dark mode", "User uses TypeScript"]

console.log("Dynamic context:", profile.profile.dynamic);
// ["Recently discussed Next.js framework"]
```

## React Hooks API

### useAddMemory

Add memories with a simple hook:

```tsx
import { useAddMemory } from "@supermemory/convex-component/react";

function ChatInput({ userId }) {
  const addMemory = useAddMemory();
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    await addMemory({
      content: message,
      containerTag: userId,
      metadata: { type: "chat" },
    });
    setMessage("");
  };

  return (
    <div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### useSupermemorySearch

Reactive search with automatic UI updates:

```tsx
import { useSupermemorySearch } from "@supermemory/convex-component/react";

function SearchResults({ userId }) {
  const [query, setQuery] = useState("");
  const { results, isLoading, error, search } = useSupermemorySearch(null);

  const handleSearch = () => {
    search({
      q: query,
      containerTag: userId,
      searchMode: "hybrid",
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search memories..."
      />
      <button onClick={handleSearch} disabled={isLoading}>
        {isLoading ? "Searching..." : "Search"}
      </button>

      {error && <div>Error: {error.message}</div>}

      {results && (
        <div>
          <p>
            Found {results.total} results in {results.timing}ms
            {results.cached && " (cached)"}
          </p>
          {results.results.map((result) => (
            <div key={result.id}>
              <p>{result.memory || result.chunk}</p>
              <small>Similarity: {(result.similarity * 100).toFixed(1)}%</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### useSupermemoryProfile

Get user profile with reactive updates:

```tsx
import { useSupermemoryProfile } from "@supermemory/convex-component/react";

function UserContextPanel({ userId }) {
  const { profile, isLoading, refresh } = useSupermemoryProfile({
    containerTag: userId,
  });

  if (isLoading) return <div>Loading profile...</div>;
  if (!profile) return null;

  return (
    <div>
      <h2>User Context</h2>
      <button onClick={() => refresh()}>Refresh</button>

      <section>
        <h3>Static Facts (Always True)</h3>
        <ul>
          {profile.profile.static.map((fact, i) => (
            <li key={i}>{fact}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Dynamic Context (Recent)</h3>
        <ul>
          {profile.profile.dynamic.map((fact, i) => (
            <li key={i}>{fact}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

### useDocumentList

List documents reactively:

```tsx
import { useDocumentList } from "@supermemory/convex-component/react";

function DocumentHistory({ userId }) {
  const documents = useDocumentList({ containerTag: userId, limit: 20 });

  return (
    <div>
      <h2>Memory History</h2>
      {documents?.map((doc) => (
        <div key={doc._id}>
          <p>{doc.contentPreview}</p>
          <small>
            {doc.status} • {new Date(doc.addedAt).toLocaleString()}
          </small>
        </div>
      ))}
    </div>
  );
}
```

### useApiStats

Dashboard statistics:

```tsx
import { useApiStats } from "@supermemory/convex-component/react";

function ApiDashboard({ userId }) {
  const stats = useApiStats({ containerTag: userId });

  if (!stats) return <div>Loading...</div>;

  const successRate = (stats.successfulCalls / stats.totalCalls) * 100;

  return (
    <div>
      <h2>API Statistics</h2>
      <div className="stats-grid">
        <div>
          <strong>{stats.totalCalls}</strong>
          <span>Total Calls</span>
        </div>
        <div>
          <strong>{successRate.toFixed(1)}%</strong>
          <span>Success Rate</span>
        </div>
        <div>
          <strong>{stats.averageResponseTime.toFixed(0)}ms</strong>
          <span>Avg Response</span>
        </div>
      </div>

      <h3>Calls by Endpoint</h3>
      {Object.entries(stats.callsByEndpoint).map(([endpoint, count]) => (
        <div key={endpoint}>
          {endpoint}: {count}
        </div>
      ))}
    </div>
  );
}
```

## Client SDK API

### Complete API Reference

```typescript
const supermemory = createSupermemoryClient(convex);

// Add content
await supermemory.add({
  content: string,
  containerTag: string,
  customId?: string,
  metadata?: Record<string, any>
});

// Search
await supermemory.search({
  q: string,
  containerTag: string,
  searchMode?: "hybrid" | "memories",
  limit?: number,
  threshold?: number,
  rerank?: boolean,
  filters?: Record<string, any>
});

// Get profile
await supermemory.profile({
  containerTag: string,
  q?: string
});

// List documents
await supermemory.listDocuments({
  containerTag?: string,
  limit?: number
});

// Get document by custom ID
await supermemory.getDocumentByCustomId(customId: string);

// Get API logs
await supermemory.getApiLogs({
  endpoint?: string,
  containerTag?: string,
  limit?: number
});

// Get stats
await supermemory.getApiStats({
  containerTag?: string
});

// Search cached documents
await supermemory.searchCached({
  searchText: string,
  containerTag?: string,
  limit?: number
});

// Clean expired cache
await supermemory.cleanCache();

// Update document status
await supermemory.updateDocumentStatus({
  documentId: string,
  status: "queued" | "processed" | "failed"
});

// Set API key
await supermemory.setApiKey(apiKey: string);
```

## Advanced Patterns

### Multi-Tenant Applications

Organize memories by user, session, or organization:

```typescript
// Per user
await supermemory.add({
  content: "User data",
  containerTag: `user_${userId}`,
});

// Per organization
await supermemory.add({
  content: "Company knowledge",
  containerTag: `org_${orgId}`,
});

// Per session
await supermemory.add({
  content: "Chat session",
  containerTag: `session_${sessionId}`,
});
```

### Metadata Filtering

Add rich metadata and filter searches:

```typescript
// Add with metadata
await supermemory.add({
  content: "Product design doc for feature X",
  containerTag: "user_123",
  metadata: {
    type: "document",
    category: "design",
    priority: "high",
    team: "product",
    tags: ["feature-x", "q1-2024"],
  },
});

// Search with filters
const results = await supermemory.search({
  q: "design documents",
  containerTag: "user_123",
  filters: {
    AND: [
      { key: "type", value: "document" },
      { key: "priority", value: "high" },
    ],
  },
});
```

### Updating Content with Custom IDs

Use custom IDs to update existing memories:

```typescript
// Initial message
await supermemory.add({
  content: "User: Hello\nAssistant: Hi!",
  containerTag: "user_123",
  customId: "conversation_abc",
});

// Add new messages (Supermemory handles the diff)
await supermemory.add({
  content: "User: How are you?\nAssistant: I'm great!",
  containerTag: "user_123",
  customId: "conversation_abc", // Same ID = update
});
```

### Building a Chatbot with Memory

```tsx
import { useAddMemory, useSupermemoryProfile } from "@supermemory/convex-component/react";

function AIChatbot({ userId }) {
  const addMemory = useAddMemory();
  const { profile, refresh } = useSupermemoryProfile({ containerTag: userId });
  const [conversation, setConversation] = useState([]);

  const sendMessage = async (userMessage: string) => {
    // Get user context
    await refresh();

    // Build context-aware prompt
    const context = `
Static profile: ${profile?.profile.static.join(", ")}
Dynamic context: ${profile?.profile.dynamic.join(", ")}
    `;

    // Call your LLM with context
    const aiResponse = await callLLM({
      systemPrompt: `User context:\n${context}`,
      messages: conversation,
      userMessage,
    });

    // Store conversation in memory
    await addMemory({
      content: `User: ${userMessage}\nAssistant: ${aiResponse}`,
      containerTag: userId,
      customId: `conversation_${Date.now()}`,
    });

    // Update UI
    setConversation([...conversation, { user: userMessage, ai: aiResponse }]);
  };

  return <ChatUI messages={conversation} onSend={sendMessage} />;
}
```

## Convex Dashboard

The Supermemory component gives you full visibility in your Convex dashboard:

### Tables You'll See

1. **searchCache**: Cached search results with TTL
2. **profileCache**: Cached user profiles
3. **documents**: All memories/documents added
4. **apiLogs**: Every API call made to Supermemory
5. **config**: Configuration (API key, etc.)

### Viewing API Logs

```typescript
// In Convex dashboard, run:
const logs = await ctx.db.query("apiLogs").order("desc").take(100);

// Or use the client:
const logs = await supermemory.getApiLogs({ limit: 100 });
```

### Cache Management

Caches automatically expire:
- Search cache: 5 minutes
- Profile cache: 2 minutes

Clean manually:

```typescript
await supermemory.cleanCache();
```

## Troubleshooting

### "Cannot find module '@supermemory/convex-component/convex.config'"

Make sure you've installed the package and it's in your `package.json`.

### "Supermemory API key not configured"

Set the `SUPERMEMORY_API_KEY` environment variable or use `setApiKey()`.

### Search results are empty

Check that:
1. You've added content with `add()`
2. The `containerTag` matches
3. Wait a few seconds for Supermemory to process the content

### TypeScript errors in hooks

Make sure you have the correct React version (18+ or 19+) and convex version (1.35+).

### Cache not updating

Caches expire automatically. To force refresh:
```typescript
// Clean all caches
await supermemory.cleanCache();

// Or refetch profile
await refresh(); // in useSupermemoryProfile
```

## Next Steps

- Check out the `/example` directory for complete examples
- Read the main [README.md](./README.md) for API reference
- Join our [Discord](https://discord.gg/supermemory) for support

---

Built with ❤️ by the Supermemory team
