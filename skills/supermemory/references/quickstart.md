# Supermemory Quickstart Guide

Get up and running with Supermemory in under 5 minutes.

## Step 1: Get Your API Key

1. Visit the [Supermemory Developer Console](https://console.supermemory.ai)
2. Sign up or log in
3. Navigate to **API Keys → Create API Key**
4. Copy your API key and save it securely

## Step 2: Install the SDK

Supermemory works with the following SDKs natively:

### TypeScript/JavaScript
```bash
npm install supermemory
```

📦 View on npm: [https://www.npmjs.com/package/supermemory](https://www.npmjs.com/package/supermemory)

### Python
```bash
pip install supermemory
# Or for async support with aiohttp
pip install supermemory[aiohttp]
```

📦 View on PyPI: [https://pypi.org/project/supermemory/](https://pypi.org/project/supermemory/)

### Other SDKs

Discover all available SDKs and community integrations at [supermemory.ai/docs](https://supermemory.ai/docs)

## Step 3: Set Environment Variable

Add your API key to your environment:

```bash
export SUPERMEMORY_API_KEY="your_api_key_here"
```

Or add to your `.env` file:
```
SUPERMEMORY_API_KEY=your_api_key_here
```

## Step 4: Basic Usage

### TypeScript Example

```typescript
import { Supermemory } from 'supermemory';

const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY
});

async function main() {
  // 1. Retrieve context for personalization
  const response = await client.profile({
    containerTag: "user_123", // Unique user identifier
    q: "What does the user prefer?"
  });

  console.log("Static Profile:", response.profile.static);
  console.log("Dynamic Profile:", response.profile.dynamic);
  if (response.searchResults) {
    console.log("Search Results:", response.searchResults.results);
  }

  // 2. Enrich your LLM prompt
  const systemMessage = `
    Static Profile:
    ${response.profile.static.map(f => `- ${f}`).join('\n')}

    Recent Context:
    ${response.profile.dynamic.map(f => `- ${f}`).join('\n')}
  `;

  // Send systemMessage to your LLM...

  // 3. Store new memories from the conversation
  await client.add({
    content: "User mentioned they prefer dark mode and TypeScript",
    containerTag: "user_123",
    metadata: {
      source: "chat",
      timestamp: new Date().toISOString()
    }
  });

  console.log("Memory stored successfully!");
}

main();
```

### Python Example

```python
import os
from supermemory import Supermemory

client = Supermemory(api_key=os.environ["SUPERMEMORY_API_KEY"])

def main():
    # 1. Retrieve context
    response = client.profile(
        container_tag="user_123",
        q="What does the user prefer?"
    )

    print("Static Profile:", response["profile"]["static"])
    print("Dynamic Profile:", response["profile"]["dynamic"])
    if "searchResults" in response:
        print("Search Results:", response["searchResults"]["results"])

    # 2. Enrich your LLM prompt
    static_facts = "\n".join(f"- {fact}" for fact in response["profile"]["static"])
    dynamic_facts = "\n".join(f"- {fact}" for fact in response["profile"]["dynamic"])

    system_message = f"""
    Static Profile:
    {static_facts}

    Recent Context:
    {dynamic_facts}
    """

    # Send system_message to your LLM...

    # 3. Store new memories
    client.add(
        content="User mentioned they prefer dark mode and TypeScript",
        container_tag="user_123",
        metadata={
            "source": "chat",
            "timestamp": "2026-02-21T10:00:00Z"
        }
    )

    print("Memory stored successfully!")

if __name__ == "__main__":
    main()
```

### Python Async Example

```python
import os
import asyncio
from supermemory import AsyncSupermemory

async def main():
    client = AsyncSupermemory(api_key=os.environ["SUPERMEMORY_API_KEY"])

    # 1. Retrieve context
    response = await client.profile(
        container_tag="user_123",
        q="What does the user prefer?"
    )

    print("User facts:", response["profile"]["static"])

    # 2. Store new memories
    await client.add(
        content="User mentioned they prefer dark mode and TypeScript",
        container_tag="user_123",
        metadata={"source": "chat"}
    )

    print("Memory stored successfully!")

if __name__ == "__main__":
    asyncio.run(main())
```

## Core Workflow Pattern

The standard Supermemory workflow follows three steps:

1. **Retrieve Context**: Use `profile()` to get relevant user information
2. **Enrich Prompt**: Combine context with your system message
3. **Store Memories**: Use `add()` to save new information

This pattern ensures your AI agent has perfect recall and becomes more personalized over time.

## Understanding Container Tags

Container tags are identifiers that isolate memories:

- Use **user IDs** for per-user personalization: `"user_123"`
- Use **project IDs** for project-specific context: `"project_abc"`
- Use **session IDs** for temporary context: `"session_xyz"`
- Use **organization IDs** for shared knowledge: `"org_acme"`

Memories with the same containerTag are grouped together and can be searched independently.

## Advanced: Threshold Filtering

Control relevance strictness with the `threshold` parameter:

```typescript
const context = await client.profile({
  containerTag: "user_123",
  query: "user preferences",
  threshold: 0.7  // 0-1: higher = stricter matching
});
```

- **0.0**: Most permissive (returns more results, lower precision)
- **0.5**: Balanced (recommended starting point)
- **1.0**: Most strict (returns fewer results, higher precision)

## Next Steps

- **User Profiles**: Learn about static vs. dynamic facts
- **Search API**: Explore advanced filtering and metadata queries
- **Document Ingestion**: Add PDFs, images, videos, and URLs
- **Integration Guides**: Connect with Vercel AI SDK, LangChain, CrewAI

## Common Patterns

### Chatbot with Memory
```typescript
// Before generating response
const context = await client.profile({
  containerTag: userId,
  query: userMessage
});

// After receiving LLM response
await client.add({
  content: `User: ${userMessage}\nAssistant: ${llmResponse}`,
  containerTag: userId
});
```

### Document Knowledge Base
```typescript
// Add documents
await client.add({
  content: "https://example.com/documentation",
  containerTag: "knowledge_base",
  metadata: { type: "documentation" }
});

// Search documents (use hybrid mode for RAG)
const response = await client.search.memories({
  q: "How do I authenticate?",
  containerTag: "knowledge_base",
  searchMode: "hybrid",
  limit: 10
});
```

### Personalized Recommendations
```typescript
// Get user profile
const profile = await client.profile({
  containerTag: userId,
  query: "user interests and preferences"
});

// Use profile to personalize recommendations
const recommendations = generateRecommendations(profile);
```

## Troubleshooting

**API Key Not Working**
- Ensure the environment variable is set correctly
- Check that the API key hasn't been revoked in the console
- Verify you're using the correct key (not accidentally using a test key)

**No Results from Search**
- Try lowering the `threshold` parameter
- Ensure the containerTag matches what you used during `add()`
- Wait 1-2 minutes after adding content for processing to complete

**Slow Processing**
- Large PDFs (100 pages) take 1-2 minutes
- Videos take 5-10 minutes
- Check document status with `documents.list()`

## Support

- **Documentation**: [supermemory.ai/docs](https://supermemory.ai/docs)
- **Console**: [console.supermemory.ai](https://console.supermemory.ai)
- **GitHub**: [github.com/supermemoryai/supermemory](https://github.com/supermemoryai/supermemory)
