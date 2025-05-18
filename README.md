<div align="center">
  <img src="logo.svg" alt="supermemory Logo" width="400" />
  <p><strong>The Memory API for the AI era</strong></p>
</div>

> [!WARNING]
> This repo contains archived code for supermemory v1 and no longer receives updates or support.

## 🧠 What is supermemory?

supermemory is a powerful, developer-friendly API that seamlessly integrates external knowledge into your AI applications. It serves as the perfect memory layer for your AI stack, providing semantic search and retrieval capabilities that enhance your models with relevant context.

With supermemory, you can:

- **Store and organize knowledge** in a searchable database that understands meaning, not just keywords
- **Enhance AI responses** with accurate, up-to-date information from your data
- **Eliminate hallucinations** by grounding AI outputs in your trusted content
- **Connect to any source** with pre-built integrations for websites, PDFs, images, and more

## ✨ Key Features

- **Universal Content Handling**: Automatically process and index content from URLs, PDFs, text, and more
- **Semantic Search**: Find information based on meaning, not just keyword matching
- **Advanced Filtering**: Organize and retrieve information using metadata, categories, and user partitioning
- **Query Enhancement**: Rewriting and reranking for more relevant results
- **Simple Integration**: Clean, consistent API with SDKs for TypeScript and Python

## 🚀 Getting Started

Getting started with supermemory takes just minutes:

1. Sign up at [console.supermemory.ai](https://console.supermemory.ai)
2. Create your API key
3. Start adding and querying content

```javascript
// Install: npm install supermemory
import { supermemory } from 'supermemory';

const client = new supermemory({
  apiKey: 'YOUR_API_KEY',
});

// Add content to your knowledge base
await client.memory.create({
  content: "https://en.wikipedia.org/wiki/Artificial_intelligence",
  metadata: {
    source: "wikipedia",
    category: "AI"
  }
});

// Query your knowledge base
const results = await client.search.create({
  q: "What are the ethical considerations in AI development?",
  limit: 5
});
```

## 📚 Documentation

We've created comprehensive documentation to help you get the most out of supermemory:

- [Quick Start Guide](https://docs.supermemory.ai/quickstart/overview)
- [API Reference](https://docs.supermemory.ai/api-reference)
- [SDK Documentation](https://docs.supermemory.ai/sdks)
- [Use Cases & Examples](https://docs.supermemory.ai/overview/use-cases)

## 🌟 Use Cases

supermemory powers a wide range of AI-enhanced applications:

- **RAG (Retrieval Augmented Generation)**: Enhance LLM outputs with accurate data
- **Knowledge Bases & Documentation**: Create intelligent, searchable repositories
- **Customer Support**: Build chatbots with access to your support documentation
- **Research Assistants**: Query across papers, notes, and references
- **Content Management**: Organize and retrieve multimedia content semantically

## 💬 Support

Have questions or feedback? We're here to help:
- Email: [dhravya@supermemory.com](mailto:dhravya@supermemory.com)
- Documentation: [docs.supermemory.ai](https://docs.supermemory.ai)

## 🔄 Updates & Roadmap

Stay up to date with the latest improvements:
- [Changelog](https://docs.supermemory.ai/changelog/overview)
- [X](https://x.com/supermemoryai)
