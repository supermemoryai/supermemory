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
  // 1. Retrieve context for personalization ("user_123" is the namespace)
  const { profile } = await client.profile("user_123");

  console.log("Static Profile:", profile.static);
  console.log("Dynamic Profile:", profile.dynamic);

  // Profile takes no query; search separately for query-ranked results
  const { results } = await client.search("user_123", {
    query: "What does the user prefer?",
    searchMode: "memories"
  });
  console.log("Search Results:", results);

  // 2. Enrich your LLM prompt
  const systemMessage = `
    Static Profile:
    ${profile.static.map(m => `- ${m.memory}`).join('\n')}

    Recent Context:
    ${profile.dynamic.map(m => `- ${m.memory}`).join('\n')}
  `;

  // Send systemMessage to your LLM...

  // 3. Store new memories from the conversation
  await client.add("user_123", {
    content: "User mentioned they prefer dark mode and TypeScript",
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

The Python SDK takes the namespace first, then keyword arguments.

```python
import os
from supermemory import Supermemory

client = Supermemory(api_key=os.environ["SUPERMEMORY_API_KEY"])

def main():
    # 1. Retrieve context
    response = client.profile("user_123")

    print("Static Profile:", response.profile.static)
    print("Dynamic Profile:", response.profile.dynamic)

    # 2. Enrich your LLM prompt
    static_facts = "\n".join(f"- {m.memory}" for m in response.profile.static)
    dynamic_facts = "\n".join(f"- {m.memory}" for m in response.profile.dynamic)

    system_message = f"""
    Static Profile:
    {static_facts}

    Recent Context:
    {dynamic_facts}
    """

    # Send system_message to your LLM...

    # 3. Store new memories
    client.add(
        "user_123",
        content="User mentioned they prefer dark mode and TypeScript",
        metadata={
            "source": "chat",
            "timestamp": "2026-02-21T10:00:00Z"
        }
    )

    print("Memory stored successfully!")

if __name__ == "__main__":
    main()
```

## Core Workflow Pattern

The standard Supermemory workflow follows three steps:

1. **Retrieve Context**: Use `profile()` to get relevant user information
2. **Enrich Prompt**: Combine context with your system message
3. **Store Memories**: Use `add()` to save new information

This pattern ensures your AI agent has perfect recall and becomes more personalized over time.

## Understanding Namespaces

A namespace is the identifier that isolates memories. It goes first in every SDK call and in the URL (`/ns/{namespace}/...`):

- Use **user IDs** for per-user personalization: `"user_123"`
- Use **project IDs** for project-specific context: `"project_abc"`
- Use **session IDs** for temporary context: `"session_xyz"`
- Use **organization IDs** for shared knowledge: `"org_acme"`

A document belongs to exactly one namespace, and each request reads or writes one namespace. To read across several, run one call per namespace and merge the results.

## Advanced: Threshold Filtering

Control relevance strictness with the `threshold` search option (v5 default `0.3`):

```typescript
const { results } = await client.search("user_123", {
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
const [{ profile }, { results }] = await Promise.all([
  client.profile(userId),
  client.search(userId, { query: userMessage, searchMode: "memories" })
]);

// After receiving LLM response; a stable id keeps one conversation in one document
await client.add(userId, {
  content: `User: ${userMessage}\nAssistant: ${llmResponse}`,
  id: conversationId
});
```

### Document Knowledge Base
```typescript
// Add documents
await client.add("knowledge_base", {
  content: "https://example.com/documentation",
  metadata: { type: "documentation" }
});

// Search documents (hybrid is the v5 default: memories + source chunks)
const response = await client.search("knowledge_base", {
  query: "How do I authenticate?",
  searchMode: "hybrid",
  limit: 10
});
```

### Personalized Recommendations
```typescript
// Get user profile
const { profile } = await client.profile(userId);

// Use profile to personalize recommendations
const recommendations = generateRecommendations(profile);
```

## Troubleshooting

**API Key Not Working**
- Ensure the environment variable is set correctly
- Check that the API key hasn't been revoked in the console
- Verify you're using the correct key (not accidentally using a test key)

**No Results from Search**
- Try lowering the `threshold` option
- Ensure the namespace matches what you used during `add()`
- Wait for processing to finish. With the default `dreaming: "dynamic"`, a fresh namespace can show zero memories and an empty profile for several minutes; pass `dreaming: "instant"` to `add()` for quickstarts and tests

**Slow Processing**
- Large PDFs (100 pages) take 1-2 minutes
- Videos take 5-10 minutes
- Check document status with `client.list(namespace, "documents")` and read `system.status` on each item

## Support

- **Documentation**: [supermemory.ai/docs](https://supermemory.ai/docs)
- **Console**: [console.supermemory.ai](https://console.supermemory.ai)
- **GitHub**: [github.com/supermemoryai/supermemory](https://github.com/supermemoryai/supermemory)
