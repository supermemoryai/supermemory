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
import { MemoryGraph, type DocumentWithMemories } from '@supermemory/memory-graph'

function App() {
  const [documents, setDocuments] = useState<DocumentWithMemories[]>([])

  return (
    <MemoryGraph
      documents={documents}
      isLoading={false}
      isLoadingMore={false}
      error={null}
      hasMore={false}
      loadMoreDocuments={() => {}}
      totalLoaded={documents.length}
      variant="console"
      showSpacesSelector={true}
    >
      <div>No memories found</div>
    </MemoryGraph>
  )
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `documents` | `DocumentWithMemories[]` | Array of documents to display |
| `isLoading` | `boolean` | Initial loading state |
| `isLoadingMore` | `boolean` | Loading more documents state |
| `error` | `Error \| null` | Error to display |
| `hasMore` | `boolean` | Whether more documents can be loaded |
| `loadMoreDocuments` | `() => void` | Callback to load more documents |
| `totalLoaded` | `number` | Total number of loaded documents |
| `variant` | `"default" \| "console"` | Visual theme variant |
| `showSpacesSelector` | `boolean` | Show space filter dropdown |
