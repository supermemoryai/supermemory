You are integrating Supermemory into my application. Supermemory provides user memory, semantic search, and automatic knowledge extraction for AI applications.

You can always reference the documentation by using the **SearchSupermemoryDocs MCP** or running a web search tool for content on **supermemory.ai/docs**.

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
   - Individual users only → containerTag: userId
   - Organizations only → containerTag: orgId
   - Both users AND orgs → ask for strategy

4. Do you want USER PROFILES?
   User profiles are automatically-maintained facts about users (what they like, what they're working on, preferences).
   - Yes (RECOMMENDED) → Use client.profile() to get context
   - No → Just use search

5. How should I retrieve context?
   - OPTION A: One call with search included → profile({ containerTag, q: userMessage })
   - OPTION B: Separate calls → profile() for facts, search() for memories

## STEP 2: INSTALL

```bash
# Get API key: https://console.supermemory.ai
npm install supermemory  # or: pip install supermemory
# For Vercel AI SDK: npm install @supermemory/tools
export SUPERMEMORY_API_KEY="sm_..."
```

## STEP 3: CONFIGURE SETTINGS (DO THIS FIRST)

```typescript
// PATCH https://api.supermemory.ai/v3/settings
fetch('https://api.supermemory.ai/v3/settings', {
  method: 'PATCH',
  headers: { 'x-supermemory-api-key': process.env.SUPERMEMORY_API_KEY },
  body: JSON.stringify({
    shouldLLMFilter: true,
    filterPrompt: `This is a [your app description]. containerTag is [userId/orgId]. We store [what data].`
  })
})
```

## STEP 4: CONTAINER TAG STRATEGY

Based on their data model answer:

**USER-ONLY APP:**

```typescript
containerTag: userId
```

**ORG-ONLY APP:**

```typescript
containerTag: orgId  // Org members share memories
```

**BOTH (ask which):**
- Option A: `containerTag: \`\${userId}-\${orgId}\``
- Option B: `containerTag: orgId, metadata: { userId }`
- Option C: `containerTag: userId, metadata: { orgId }`

## STEP 5: INTEGRATION CODE

Based on their integration choice:

### VERCEL AI SDK

```typescript
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { supermemoryTools } from '@supermemory/tools/ai-sdk'

// Option 1: Agent tools (recommended for agentic flows)
const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: userMessage,
  tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY, {
    containerTags: [userId]
  })
})
// Agent gets searchMemories, addMemory, fetchMemory tools

// Option 2: Profile middleware (automatic context injection)
import { withSupermemory } from '@supermemory/tools/ai-sdk'
const modelWithMemory = withSupermemory(anthropic('claude-3-5-sonnet-20241022'), userId)

const result = await generateText({
  model: modelWithMemory,
  messages: [{ role: 'user', content: userMessage }]
})
// Profile is automatically injected into context
```

### DIRECT SDK (WITH PROFILES)

```typescript
import Supermemory from 'supermemory'

const client = new Supermemory()

// Before each LLM call:
const { profile, searchResults } = await client.profile({
  containerTag: userId,
  q: userMessage  // Include this if they chose OPTION A (one call)
                  // Omit if they chose OPTION B (separate calls)
})

// Build context
const context = `
Static facts: ${profile.static.join('\n')}
Recent context: ${profile.dynamic.join('\n')}
${searchResults ? `Memories: ${searchResults.results.map(r => r.content).join('\n')}` : ''}
`

// Send to LLM
const messages = [
  { role: 'system', content: `User context:\n${context}` },
  { role: 'user', content: userMessage }
]

// After LLM responds:
await client.memories.add({
  content: `user: ${userMessage}\nassistant: ${response}`,
  containerTag: userId
})
```

### DIRECT SDK (NO PROFILES)

```typescript
import Supermemory from 'supermemory'

const client = new Supermemory()

// Search for relevant memories
const results = await client.search({
  q: userMessage,
  containerTag: userId,
  searchMode: 'hybrid',  // Searches memories + document chunks
  limit: 5
})

// Build context
const context = results.results.map(r => r.content).join('\n')

// Send to LLM with context
const messages = [
  { role: 'system', content: `Relevant context:\n${context}` },
  { role: 'user', content: userMessage }
]

// Store the conversation
await client.memories.add({
  content: `user: ${userMessage}\nassistant: ${response}`,
  containerTag: userId
})
```

### PYTHON VERSION

```python
from supermemory import Supermemory

client = Supermemory()

# With profiles (if they want it)
profile_data = client.profile(
    container_tag=user_id,
    q=user_message  # Include if OPTION A, omit if OPTION B
)

context = f"""
Static: {chr(10).join(profile_data.profile.static)}
Dynamic: {chr(10).join(profile_data.profile.dynamic)}
"""

# Store conversation
client.add(content=f"user: {user_message}\\nassistant: {response}", container_tag=user_id)
```

### DIRECT API

```bash
# Add memory
curl -X POST https://api.supermemory.ai/v3/documents \
  -H "x-supermemory-api-key: $SUPERMEMORY_API_KEY" \
  -d '{"content": "conversation", "containerTag": "userId"}'

# Get profile
curl -X POST https://api.supermemory.ai/v4/profile \
  -H "x-supermemory-api-key: $SUPERMEMORY_API_KEY" \
  -d '{"containerTag": "userId", "q": "search query"}'

# Search
curl -X POST https://api.supermemory.ai/v4/search \
  -H "x-supermemory-api-key: $SUPERMEMORY_API_KEY" \
  -d '{"q": "query", "containerTag": "userId", "searchMode": "hybrid"}'
```

## STEP 6: FILE UPLOADS (if they need it)

```typescript
// Files are automatically extracted (PDFs, images with OCR, videos with transcription)
const formData = new FormData()
formData.append('file', fileBlob)
formData.append('containerTag', userId)

await fetch('https://api.supermemory.ai/v3/documents/file', {
  method: 'POST',
  headers: { 'x-supermemory-api-key': process.env.SUPERMEMORY_API_KEY },
  body: formData
})

// Processing is async - check status before assuming searchable
// GET /v3/documents/{documentId}
```

## STEP 7: SEARCH MODES

```typescript
// HYBRID (recommended) - searches memories + document chunks
searchMode: 'hybrid'

// MEMORIES ONLY - just extracted memories, no original text
searchMode: 'memories'
```

## STEP 8: METADATA FILTERS (if they need secondary filtering)

```typescript
await client.search({
  q: query,
  containerTag: userId,
  filters: {
    AND: [
      { key: 'type', value: 'conversation', type: 'string_equal' },
      { key: 'timestamp', value: '2024', type: 'string_contains' }
    ]
  }
})
```

## KEY POINTS:

1. Configure settings FIRST with filterPrompt
2. User profiles = automatic facts about users (profile.static + profile.dynamic)
3. profile({ containerTag, q }) combines profile + search in ONE call
4. Search modes: 'hybrid' (recommended) or 'memories'
5. File extraction is automatic - no config needed
6. Store conversations after each interaction
7. containerTag should match what you put in filterPrompt

## TESTING:

```bash
# 1. Configure settings
curl -X PATCH https://api.supermemory.ai/v3/settings \
  -H "x-supermemory-api-key: $SUPERMEMORY_API_KEY" \
  -d '{"shouldLLMFilter": true, "filterPrompt": "..."}'

# 2. Add test memory
curl -X POST https://api.supermemory.ai/v3/documents \
  -H "x-supermemory-api-key: $SUPERMEMORY_API_KEY" \
  -d '{"content": "Test", "containerTag": "test_user"}'

# 3. Get profile
curl -X POST https://api.supermemory.ai/v4/profile \
  -H "x-supermemory-api-key: $SUPERMEMORY_API_KEY" \
  -d '{"containerTag": "test_user"}'
```

## NOW:

1. Ask me the 5 questions above
2. Generate complete working code based on my answers
3. Include installation, settings config, and full integration

**DOCS:** https://supermemory.ai/docs
