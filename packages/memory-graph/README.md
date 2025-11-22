# @supermemory/memory-graph

> Interactive graph visualization component for Supermemory - visualize and explore your memory connections

[![npm version](https://img.shields.io/npm/v/@supermemory/memory-graph.svg)](https://www.npmjs.com/package/@supermemory/memory-graph)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **WebGL-powered rendering** - Smooth performance with hundreds of nodes
- **Interactive exploration** - Pan, zoom, drag nodes, and explore connections
- **Semantic connections** - Visualizes relationships based on content similarity
- **Responsive design** - Works seamlessly on mobile and desktop
- **Zero configuration** - Works out of the box with automatic CSS injection
- **Lightweight** - Tree-shakeable and optimized bundle
- **TypeScript** - Full TypeScript support with exported types

## Installation

```bash
npm install @supermemory/memory-graph
# or
yarn add @supermemory/memory-graph
# or
pnpm add @supermemory/memory-graph
# or
bun add @supermemory/memory-graph
```

## Quick Start

The component accepts document data directly - you fetch the data from your backend, which proxies requests to the Supermemory API with proper authentication.

```tsx
import { MemoryGraph } from '@supermemory/memory-graph'
import type { DocumentWithMemories } from '@supermemory/memory-graph'

function App() {
  const [documents, setDocuments] = useState<DocumentWithMemories[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Fetch from YOUR backend (which proxies to Supermemory API)
    fetch('/api/supermemory-graph')
      .then(res => res.json())
      .then(data => {
        setDocuments(data.documents)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err)
        setIsLoading(false)
      })
  }, [])

  return (
    <MemoryGraph
      documents={documents}
      isLoading={isLoading}
      error={error}
    />
  )
}
```

## Backend Proxy Example

Create an API route in your backend that authenticates and proxies requests to Supermemory:

### Next.js API Route

```typescript
// app/api/supermemory-graph/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Add your own auth check here
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const response = await fetch('https://api.supermemory.ai/v3/documents/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
    },
    body: JSON.stringify({
      page: 1,
      limit: 500,
      sort: 'createdAt',
      order: 'desc',
    }),
  })

  const data = await response.json()
  return NextResponse.json(data)
}
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `documents` | `DocumentWithMemories[]` | **required** | Array of documents to display |
| `isLoading` | `boolean` | `false` | Whether data is currently loading |
| `error` | `Error \| null` | `null` | Error that occurred during fetching |
| `variant` | `"console" \| "consumer"` | `"console"` | Visual variant |
| `showSpacesSelector` | `boolean` | Based on variant | Show/hide the spaces filter |
| `children` | `ReactNode` | - | Content to show when no documents |
| `highlightDocumentIds` | `string[]` | `[]` | Document IDs to highlight |
| `highlightsVisible` | `boolean` | `true` | Whether highlights are visible |

### Pagination Props (Optional)

For large datasets, you can implement pagination:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isLoadingMore` | `boolean` | `false` | Whether loading more data |
| `hasMore` | `boolean` | `false` | Whether more data is available |
| `totalLoaded` | `number` | `documents.length` | Total documents loaded |
| `loadMoreDocuments` | `() => Promise<void>` | - | Callback to load more |

### Types

```typescript
import type {
  DocumentWithMemories,
  MemoryEntry,
  DocumentsResponse,
  MemoryGraphProps
} from '@supermemory/memory-graph'
```

## Advanced Usage

### With Pagination

```tsx
import { MemoryGraph } from '@supermemory/memory-graph'

function GraphWithPagination() {
  const [documents, setDocuments] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const loadMore = async () => {
    setIsLoadingMore(true)
    const res = await fetch(`/api/supermemory-graph?page=${page + 1}`)
    const data = await res.json()
    setDocuments(prev => [...prev, ...data.documents])
    setHasMore(data.pagination.currentPage < data.pagination.totalPages)
    setPage(p => p + 1)
    setIsLoadingMore(false)
  }

  return (
    <MemoryGraph
      documents={documents}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      loadMoreDocuments={loadMore}
      totalLoaded={documents.length}
    />
  )
}
```

### Custom Empty State

```tsx
<MemoryGraph documents={[]} isLoading={false}>
  <div className="empty-state">
    <h2>No memories yet</h2>
    <p>Start adding content to see your knowledge graph</p>
  </div>
</MemoryGraph>
```

### Variants

The `variant` prop controls the visual layout and initial viewport settings:

| Variant | Initial Zoom | Spaces Selector | Legend Position | Use Case |
|---------|-------------|-----------------|-----------------|----------|
| `console` | 0.8 | Shown | Bottom-right | Full-page dashboard views |
| `consumer` | 0.5 | Hidden | Top-right | Embedded/widget views |

```tsx
// Full dashboard view
<MemoryGraph
  documents={documents}
  variant="console"
/>

// Embedded widget
<MemoryGraph
  documents={documents}
  variant="consumer"
/>
```

## Interactive Controls

- **Pan**: Click and drag the background
- **Zoom**: Mouse wheel or pinch on mobile
- **Select Node**: Click on any document or memory
- **Drag Nodes**: Click and drag individual nodes
- **Fit to View**: Auto-fit button to center all content

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers with WebGL support

## Requirements

- React 18+
- Modern browser with WebGL support

## Development

```bash
# Install dependencies
bun install

# Build the package
bun run build

# Watch mode for development
bun run dev

# Type checking
bun run check-types
```

## License

MIT

## Support

- Issues: [GitHub Issues](https://github.com/supermemoryai/supermemory/issues)
