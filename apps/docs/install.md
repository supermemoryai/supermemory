You are integrating Supermemory into my application. Supermemory provides user memory, semantic search, and automatic knowledge extraction for AI applications.

You can always reference the documentation by using the **supermemory-docs MCP** (`https://supermemory.ai/docs/mcp`) or running a web search tool for content on **supermemory.ai/docs**. Prefer `npx supermemory setup` / `npx supermemory help --json` when scaffolding.

This prompt targets the v5 API and the 5.x SDKs. Already on Supermemory v3/v4? Run `npx supermemory@latest migrate` instead of rewriting calls by hand.

## STEP 1: ASK ME THESE QUESTIONS

1. What are you building?
   - Personal chatbot/assistant
   - Team knowledge base
   - Customer support bot
   - Document Q&A
   - Other

2. How do you want to integrate?
   - Vercel AI SDK (@supermemory/tools)
   - OpenAI plugins
   - Direct SDK (supermemory npm/pip)
   - Direct API calls

3. Data model?
   - Individual users only → namespace: userId
   - Organizations only → namespace: orgId
   - Both users AND orgs → ask for strategy

4. Do you want USER PROFILES?
   User profiles are automatically-maintained facts about users (what they like, what they're working on, preferences).
   - Yes (RECOMMENDED) → Use `client.profile(namespace)` to get context
   - No → Just use search

5. How should I retrieve context?
   - OPTION A: Profile plus search → `profile(namespace)` for facts, then `search(namespace, { query: userMessage })` for relevant memories
   - OPTION B: Search only → `search(namespace, { query: userMessage })`

## STEP 2: INSTALL

```bash
# Get API key: https://console.supermemory.ai
npm install supermemory  # or: pip install supermemory (version 5 or later)
# For Vercel AI SDK: npm install @supermemory/tools
export SUPERMEMORY_API_KEY="sm_..."
```

## STEP 3: CANONICAL API SURFACE (use these, nothing else)

- Auth header: `Authorization: Bearer $SUPERMEMORY_API_KEY` (recommended; `x-api-key` and `x-supermemory-api-key` still work but are deprecated)
- Write content: `POST https://api.supermemory.ai/ns/{namespace}/document`
- Upload a file: `POST https://api.supermemory.ai/ns/{namespace}/document/file`
- Search: `POST https://api.supermemory.ai/ns/{namespace}/search`
- Profile: `POST https://api.supermemory.ai/ns/{namespace}/profile`
- Org settings: `PATCH https://api.supermemory.ai/organization`
- Scoping: one `namespace` in the URL path — never in the body or a header

DO NOT USE — deprecated or removed in v5:

- Endpoints: `/v3/documents`, `/v3/search`, `/v3/settings`, `/v4/search`, `/v4/profile`, `/v4/memories` (use `/ns/{namespace}/...` and `/organization`)
- Body keys: `containerTag`, `containerTags`, `customId` (use `id`), `entityContext` (use `supportingContext`), `documentDate` (use `date`), `q` (use `query`), `filters` (use `filter`)
- SDK: `client.add({ containerTag })`, `client.search.execute`, `client.memories.add`, `client.profile({ containerTag, q })`

## STEP 4: CONFIGURE ORGANIZATION CONTEXT (OPTIONAL)

Describe your app so extraction focuses on what matters:

```typescript
import { Supermemory } from "supermemory"

const client = new Supermemory()

await client.organization.update({
  organizationalContext: "This is a [your app description]. Each namespace is a [userId/orgId]. We store [what data].",
})
```

## STEP 5: NAMESPACE STRATEGY

Based on their data model answer:

**USER-ONLY APP:**

```typescript
const namespace = userId
```

**ORG-ONLY APP:**

```typescript
const namespace = orgId  // Org members share memories
```

**BOTH (ask which):**

```typescript
// Option A: Unique per user-org combination
const namespace = `${orgId}_${userId}`

// Option B: Org-scoped with user metadata
await client.add(orgId, { content, metadata: { userId } })

// Option C: User-scoped with org metadata
await client.add(userId, { content, metadata: { orgId } })
```

## STEP 6: INTEGRATION CODE

Based on their integration choice:

### VERCEL AI SDK

```typescript
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { supermemoryTools, withSupermemory } from "@supermemory/tools/ai-sdk"

// Option 1: Agent tools (recommended for agentic flows)
const result = await generateText({
  model: openai("gpt-5"),
  prompt: userMessage,
  tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
    namespace: userId,
  }),
})

// Option 2: Middleware (automatic context injection)
const modelWithMemory = withSupermemory(openai("gpt-5"), {
  namespace: userId,
  id: "conversation-1",
})

const answer = await generateText({
  model: modelWithMemory,
  messages: [{ role: "user", content: userMessage }],
})
// Profile is automatically injected into context
```

### DIRECT SDK (WITH PROFILES)

```typescript
import { Supermemory } from "supermemory"

const client = new Supermemory()

// Before each LLM call:
const { profile } = await client.profile(userId)
const related = await client.search(userId, {
  query: userMessage,
  searchMode: "memories",
  limit: 5,
})

// Build context
const context = [
  "Static facts:",
  ...profile.static.map((m) => m.memory),
  "Recent context:",
  ...profile.dynamic.map((m) => m.memory),
  "Memories:",
  ...related.results.map((r) => r.memory).filter(Boolean),
].join("\n")

// Send to LLM
const messages = [
  { role: "system", content: `User context:\n${context}` },
  { role: "user", content: userMessage },
]

// After LLM responds, append the turn to one document per conversation:
await client.add(userId, {
  content: `user: ${userMessage}\nassistant: ${response}`,
  id: conversationId,
})
```

### DIRECT SDK (NO PROFILES)

```typescript
import { Supermemory } from "supermemory"

const client = new Supermemory()

// Search memories and document chunks
const results = await client.search(userId, {
  query: userMessage,
  searchMode: "hybrid",
  limit: 5,
})

// Build context
const context = results.results
  .map((r) => r.memory ?? r.chunk)
  .filter(Boolean)
  .join("\n")

// Send to LLM with context
const messages = [
  { role: "system", content: `Relevant context:\n${context}` },
  { role: "user", content: userMessage },
]

// Store the conversation
await client.add(userId, {
  content: `user: ${userMessage}\nassistant: ${response}`,
  id: conversationId,
})
```

### PYTHON VERSION

```python
from supermemory import Supermemory

client = Supermemory()

# With profiles (if they want it)
profile = client.profile(user_id).profile
related = client.search(user_id, query=user_message, search_mode="memories", limit=5)

context = "\n".join(
    [
        "Static:",
        *[m.memory for m in profile.static],
        "Dynamic:",
        *[m.memory for m in profile.dynamic],
        "Memories:",
        *[r.memory for r in related.results if r.memory],
    ]
)

# Store conversation
client.add(
    user_id,
    content=f"user: {user_message}\nassistant: {response}",
    id=conversation_id,
)
```

### DIRECT API

```bash
# Add memory
curl -X POST https://api.supermemory.ai/ns/user_123/document \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "conversation", "id": "conversation_1"}'

# Get profile
curl -X POST https://api.supermemory.ai/ns/user_123/profile \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Search
curl -X POST https://api.supermemory.ai/ns/user_123/search \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "query", "searchMode": "hybrid"}'
```

## STEP 7: FILE UPLOADS (if they need it)

```typescript
// Files are automatically extracted (PDFs, images with OCR, videos with transcription)
const formData = new FormData()
formData.append("file", fileBlob)

await fetch(`https://api.supermemory.ai/ns/${userId}/document/file`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
  },
  body: formData,
})

// Processing is async - check status before assuming searchable
// client.documents.get(userId, documentId) → wait for system.status === "done"
```

## STEP 8: SEARCH MODES

```typescript
// HYBRID (default) - learned memories plus source chunks
searchMode: "hybrid"

// MEMORIES ONLY - learned memories, no original text
searchMode: "memories"

// CHUNKS ONLY - source passages for RAG
searchMode: "chunks"
```

## STEP 9: METADATA FILTERS (if they need secondary filtering)

```typescript
await client.search(userId, {
  query,
  filter: {
    operator: "and",
    operands: [
      { field: "type", operator: "eq", value: "conversation" },
      { field: "title", operator: "contains", value: "2024" },
    ],
  },
})
```

## KEY POINTS:

1. Every write and every search names one namespace in the URL path
2. User profiles = automatic facts about users (profile.static + profile.dynamic)
3. `profile(namespace)` takes no query; call `search(namespace, { query })` for message-specific memories
4. Search modes: 'hybrid' (default), 'memories', or 'chunks'
5. File extraction is automatic - no config needed
6. Store conversations after each interaction under a stable `id` per conversation
7. Processing is async: `system.status` tracks extraction, and memories are ready when `system.dreamingStatus` is `done` (it reads `dreaming` while they are generated). Pass `dreaming: "instant"` only when memories must be generated right away (it bills one extra operation per document)

## TESTING:

```bash
# 1. Add test memory, processed right away
curl -X POST https://api.supermemory.ai/ns/test_user/document \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test", "dreaming": "instant"}'

# 2. Get profile
curl -X POST https://api.supermemory.ai/ns/test_user/profile \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or smoke-test from the terminal with the CLI:

```bash
npx supermemory add "Test" --namespace test_user --dreaming instant
npx supermemory profile --namespace test_user
```

## NOW:

1. Ask me the 5 questions above
2. Generate complete working code based on my answers
3. Include installation, namespace strategy, and full integration

**DOCS:** https://supermemory.ai/docs
