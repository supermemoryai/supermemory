# Memory Graph Playground

A local development playground for testing the `@supermemory/memory-graph` package.

## Getting Started

1. Make sure the memory-graph package is built:
   ```bash
   cd ../memory-graph
   bun run build
   ```

2. Start the dev server:
   ```bash
   cd ../memory-graph-playground
   bun run dev
   ```

3. Open your browser to the URL shown (usually http://localhost:5173)

4. Enter your Supermemory API key and click "Load Graph"

## Features to Test

- ✅ API key authentication
- ✅ Data fetching with React Query
- ✅ Graph rendering with PixiJS
- ✅ Interactive pan and zoom
- ✅ Node selection and details
- ✅ Space filtering
- ✅ Legend with statistics
- ✅ CSS auto-injection
- ✅ Error handling

## Development

When making changes to the memory-graph package:

1. Make your changes in `packages/memory-graph/src`
2. Rebuild: `cd packages/memory-graph && bun run build`
3. The playground will hot-reload automatically

## Notes

- This playground uses the workspace version of `@supermemory/memory-graph`
- CSS is automatically injected from the package
- All dependencies are bundled except React/ReactDOM
