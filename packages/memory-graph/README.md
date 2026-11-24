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

Add a server route that returns `fetchMemoryGraph` for the signed-in user. It calls `POST /ns/{namespace}/graph` with your API key, follows `nextCursor` to the last page and returns the documents `MemoryGraph` renders. It only uses the global `fetch`, so it runs on Node, Bun, Deno and Cloudflare Workers.

```ts
// app/api/memory-graph/route.ts (Next.js App Router)
import { fetchMemoryGraph } from '@supermemory/memory-graph/server';

export async function POST() {
  const user = await auth(); // your auth
  if (!user) return new Response('Unauthorized', { status: 401 });

  return Response.json(
    await fetchMemoryGraph({ apiKey: process.env.SUPERMEMORY_API_KEY!, namespace: user.id }),
  );
}
```

Then point `MemoryGraph` at the route. It shows loading, empty and error states on its own:

```tsx
import { MemoryGraph } from '@supermemory/memory-graph';

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <MemoryGraph endpoint="/api/memory-graph" variant="console" />
    </div>
  );
}
```

Keep the API key on the server: it can read every namespace in your organization, so your route checks who is signed in and passes only that user's namespace. A namespace is up to 100 letters, digits, `_`, `:` or `-`, so map IDs such as `auth0|123` or emails first. `fetchMemoryGraph` throws `MemoryGraphError` with the API's `status` (`400`, `401`, `403`, `429`) and reason when a request fails.

On a non-JavaScript backend, call `POST https://api.supermemory.ai/ns/{namespace}/graph?limit=100` with `Authorization: Bearer $SUPERMEMORY_API_KEY`, repeat with `&cursor=<nextCursor>` until it is `null`, and return `{ nodes, edges }` with every page's nodes and edges. `<MemoryGraph endpoint>` accepts that shape too. To fetch documents yourself, convert each page with `graphPageToDocuments` and pass `documents`.

## Features

- **Interactive canvas visualization** - Pan, zoom, and drag nodes using Canvas 2D rendering
- **Document and memory nodes** - Documents as rectangles, memories as hexagons
- **Relationship visualization** - Edges show document similarity and memory version chains
- **Space filtering** - Filter by workspace or view all memories
- **Two variants** - Full-featured console mode or embedded consumer mode
- **Pagination support** - Keep the initial graph fitted as pages arrive; manual pan, zoom, or selection takes control of the view
- **TypeScript support** - Full type definitions included

## Essential Props

| Prop | Type | Description |
|------|------|-------------|
| `endpoint` | `string` | Your server route returning `fetchMemoryGraph`'s result, fetched with `POST` |
| `documents` | `GraphApiDocument[]` | Documents with their memories, when you fetch them yourself |
| `isLoading` | `boolean` | Show loading state |
| `variant` | `"console" \| "consumer"` | Display mode (default: "console") |
| `error` | `Error \| null` | Error to display |
| `onLoadMore` | `() => void` | Load the next page (follow `nextCursor`) |
| `hasMore` | `boolean` | Whether `nextCursor` is set |
| `highlightDocumentIds` | `string[]` | IDs of documents to highlight |

Console mode uses the supplied theme colors for its surface, 16px dot grid, document icons, and node fills and strokes. Consumer mode keeps its transparent surface and cluster colors.

### Opt-in appearance and document opening

The default appearance remains the icon-based document nodes and existing connection styling. Configure the same options on `MemoryGraph` or `GraphCanvas` to use stacked document squares and stronger connections:

```tsx
<MemoryGraph
  documents={documents}
  appearance={{ documentNodes: "stacked", connections: "emphasized" }}
  openDocumentOnEnter
  onOpenDocument={openPersistedDocument}
/>
```

`appearance.documentNodes` accepts `"icons"` (default) or `"stacked"`. Stacks have no icons or text, stay inside the original node bounds and collapse to plain blocks at smaller zooms. Selection uses a single accented boundary; full document identity stays in the popover.

`appearance.connections` accepts `"default"` (default) or `"emphasized"`. Emphasized connections recover smoothly from a quiet overview, with stronger semantic relations and subordinate, glow-free document sources. Configure `colors.edgeDocument` for the source ink. Older custom `GraphCanvas` palettes without that field use `textSecondary` for emphasized sources. No node positions, hit targets or stored graph data change.

`openDocumentOnEnter` defaults to `false` and applies only to `MemoryGraph`. With an `onOpenDocument` callback, it adds a discoverable, focus-scoped Enter action. Opening uses a loaded persisted document ID; memories require one confirmed source. Typing, modifiers, repeated keys and composition do not open a document. Native buttons retain their normal activation. The package calls your callback and does not own routing or authorization. Without the option or callback, no new focus target or Enter behavior is added.

Set `colors.dotColor` or the `--graph-dot` CSS variable to style the dot grid independently of text. When neither is set, the grid uses `textMuted`.

Document-to-memory links use `colors.edgeDocument` or `--graph-edge-document`, while derived-memory relations use `colors.edgeDerives` or `--graph-edge-derives`.

For paginated initial loading, pass `hasMore` and `isLoadingMore` alongside `documents`. In both variants, new batches gradually warm the force layout from the existing node positions. Initial and appended nodes relax until their movement stays low, then cool automatically; a tick limit bounds settling for layouts that keep drifting. The initial view smoothly follows the changing bounds until loading and settling finish. Manual interaction immediately cancels automatic camera movement. Clicking a node selects it without restarting the forces; dragging warms the layout until release, including release outside the canvas. Changing the document selection starts a new fit; the Fit control remains available at any time. The existing static layout safeguard for more than 6,000 nodes remains in place.

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
