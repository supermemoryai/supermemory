# @supermemory/memory-graph

> Interactive graph visualization component for Supermemory - visualize and explore your memory connections

[![npm version](https://img.shields.io/npm/v/@supermemory/memory-graph.svg)](https://www.npmjs.com/package/@supermemory/memory-graph)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎨 **WebGL-powered rendering** - Smooth performance with hundreds of nodes using PixiJS
- 🔍 **Interactive exploration** - Pan, zoom, drag nodes, and explore connections
- 🧠 **Semantic connections** - Visualizes relationships based on content similarity
- 📱 **Responsive design** - Works seamlessly on mobile and desktop
- 🎯 **Zero configuration** - Works out of the box with automatic CSS injection
- 📦 **Lightweight** - Tree-shakeable and optimized bundle
- 🎭 **TypeScript** - Full TypeScript support with exported types

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

```tsx
import { MemoryGraph } from '@supermemory/memory-graph'

function App() {
  return (
    <MemoryGraph
      apiKey="your-api-key"
      id="optional-document-id"
    />
  )
}
```

That's it! The CSS is automatically injected, no manual imports needed.

## Usage

### Basic Usage

```tsx
import { MemoryGraph } from '@supermemory/memory-graph'

<MemoryGraph
  apiKey="your-supermemory-api-key"
  variant="console"
/>
```

### Advanced Usage

```tsx
import { MemoryGraph } from '@supermemory/memory-graph'

<MemoryGraph
  apiKey="your-api-key"
  id="document-123"
  baseUrl="https://api.supermemory.ai"
  variant="consumer"
  showSpacesSelector={true}
  onError={(error) => {
    console.error('Failed to load graph:', error)
  }}
  onSuccess={(data) => {
    console.log('Graph loaded:', data)
  }}
/>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | `string` | **required** | Your Supermemory API key |
| `id` | `string` | `undefined` | Optional document ID to filter the graph |
| `baseUrl` | `string` | `"https://api.supermemory.ai"` | API base URL |
| `variant` | `"console" \| "consumer"` | `"console"` | Visual variant - console for full view, consumer for embedded |
| `showSpacesSelector` | `boolean` | `true` | Show/hide the spaces filter dropdown |
| `onError` | `(error: Error) => void` | `undefined` | Callback when data fetching fails |
| `onSuccess` | `(data: any) => void` | `undefined` | Callback when data is successfully loaded |

## Framework Integration

### Next.js

```tsx
// app/graph/page.tsx
'use client'

import { MemoryGraph } from '@supermemory/memory-graph'

export default function GraphPage() {
  return (
    <div className="w-full h-screen">
      <MemoryGraph apiKey={process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY!} />
    </div>
  )
}
```

### Vite/React

```tsx
// src/App.tsx
import { MemoryGraph } from '@supermemory/memory-graph'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MemoryGraph apiKey={import.meta.env.VITE_SUPERMEMORY_API_KEY} />
    </div>
  )
}
```

### Create React App

```tsx
// src/App.tsx
import { MemoryGraph } from '@supermemory/memory-graph'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MemoryGraph apiKey={process.env.REACT_APP_SUPERMEMORY_API_KEY} />
    </div>
  )
}
```

## Getting an API Key

1. Visit [supermemory.ai](https://supermemory.ai)
2. Sign up or log in to your account
3. Navigate to Settings > API Keys
4. Generate a new API key
5. Copy and use it in your application

⚠️ **Security Note**: Never commit API keys to version control. Use environment variables.

## Features in Detail

### WebGL Rendering

The graph uses PixiJS for hardware-accelerated WebGL rendering, enabling smooth interaction with hundreds of nodes and connections.

### Semantic Similarity

Connections between memories are visualized based on semantic similarity, with stronger connections appearing more prominent.

### Interactive Controls

- **Pan**: Click and drag the background
- **Zoom**: Mouse wheel or pinch on mobile
- **Select Node**: Click on any document or memory
- **Drag Nodes**: Click and drag individual nodes
- **Fit to View**: Auto-fit button to center all content

### Touch Support

Full support for touch gestures including pinch-to-zoom and touch-drag for mobile devices.

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

MIT © [Supermemory](https://supermemory.ai)

## Support

- 📧 Email: support@supermemory.ai
- 🐛 Issues: [GitHub Issues](https://github.com/supermemoryai/supermemory/issues)
- 💬 Discord: [Join our community](https://discord.gg/supermemory)

## Roadmap

- [ ] Custom theme support
- [ ] Export graph as image
- [ ] Advanced filtering options
- [ ] Graph animation presets
- [ ] Accessibility improvements
- [ ] Collaboration features

---

Made with ❤️ by the Supermemory team
