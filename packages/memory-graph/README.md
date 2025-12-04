# @supermemory/memory-graph

Interactive graph visualization for documents and their memory connections.

[![npm version](https://img.shields.io/npm/v/@supermemory/memory-graph.svg)](https://www.npmjs.com/package/@supermemory/memory-graph)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @supermemory/memory-graph
# or
bun add @supermemory/memory-graph
# or
pnpm add @supermemory/memory-graph
```

## Quick Start

```tsx
import { MemoryGraph } from '@supermemory/memory-graph';
import type { DocumentWithMemories } from '@supermemory/memory-graph';

function App() {
  const [documents, setDocuments] = useState<DocumentWithMemories[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/graph')
      .then(res => res.json())
      .then(data => {
        setDocuments(data.documents);
        setIsLoading(false);
      });
  }, []);

  return (
    <div style={{ height: '100vh' }}>
      <MemoryGraph
        documents={documents}
        isLoading={isLoading}
        variant="console"
      />
    </div>
  );
}
```

## Features

- **Interactive canvas visualization** - Pan, zoom, and drag nodes using Canvas 2D rendering
- **Document and memory nodes** - Documents as rectangles, memories as hexagons
- **Relationship visualization** - Edges show document similarity and memory version chains
- **Space filtering** - Filter by workspace or view all memories
- **Two variants** - Full-featured console mode or embedded consumer mode
- **Pagination support** - Load more documents on demand
- **TypeScript support** - Full type definitions included

## Essential Props

| Prop | Type | Description |
|------|------|-------------|
| `documents` | `DocumentWithMemories[]` | Array of documents with their memory entries |
| `isLoading` | `boolean` | Show loading state |
| `variant` | `"console" \| "consumer"` | Display mode (default: "console") |
| `error` | `Error \| null` | Error to display |
| `loadMoreDocuments` | `() => Promise<void>` | Function to load more data |
| `highlightDocumentIds` | `string[]` | IDs of documents to highlight |

## Documentation

Full documentation available at [docs.supermemory.ai](https://docs.supermemory.ai):

- [Overview](https://docs.supermemory.ai/memory-graph/overview) - What it is and when to use it
- [Installation](https://docs.supermemory.ai/memory-graph/installation) - Setup and requirements
- [Quick Start](https://docs.supermemory.ai/memory-graph/quickstart) - Get running in 2 minutes
- [API Reference](https://docs.supermemory.ai/memory-graph/api-reference) - Complete API documentation
- [Examples](https://docs.supermemory.ai/memory-graph/examples) - Common use cases
- [Troubleshooting](https://docs.supermemory.ai/memory-graph/troubleshooting) - Common issues

## Requirements

- React 18+
- Modern browser

## License

MIT

## Links

- [GitHub](https://github.com/supermemoryai/supermemory/tree/main/packages/memory-graph)
- [Issues](https://github.com/supermemoryai/supermemory/issues)
- [Supermemory](https://supermemory.ai)
