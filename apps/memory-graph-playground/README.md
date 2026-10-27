# Memory Graph Playground

A demo app showcasing the `@supermemory/memory-graph` package.

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and enter your Supermemory API key.

## Usage Example

```tsx
import { MemoryGraph, type GraphApiDocument } from '@supermemory/memory-graph'

function App() {
  const [documents, setDocuments] = useState<GraphApiDocument[]>([])

  return (
    <MemoryGraph
      documents={documents}
      isLoading={false}
      isLoadingMore={false}
      error={null}
      hasMore={false}
      onLoadMore={() => {}}
      totalCount={documents.length}
      variant="console"
    >
      <div>No memories found</div>
    </MemoryGraph>
  )
}
```

See [`src/app/page.tsx`](./src/app/page.tsx) for the full working example, including converting a raw API response into `GraphApiDocument[]`.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `documents` | `GraphApiDocument[]` | Array of documents to display |
| `isLoading` | `boolean` | Initial loading state |
| `isLoadingMore` | `boolean` | Loading more documents state |
| `error` | `Error \| null` | Error to display |
| `hasMore` | `boolean` | Whether more documents can be loaded |
| `onLoadMore` | `() => void` | Callback to load more documents |
| `totalCount` | `number` | Total number of loaded documents |
| `variant` | `"console" \| "consumer"` | Visual variant |

See [`packages/memory-graph`](../../packages/memory-graph/src/types.ts) for the full `MemoryGraphProps` reference.
