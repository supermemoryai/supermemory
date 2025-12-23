# Memory Graph Changelog

## Development Setup

To test changes, run these commands in separate terminals:

**Terminal 1** - Build memory-graph in watch mode:
```bash
cd packages/memory-graph && bun run dev
```

**Terminal 2** - Run the playground:
```bash
cd apps/memory-graph-playground && bun run dev
```

Then open http://localhost:3000 in your browser.

---

### Features

#### Slideshow Mode
Auto-cycling through nodes with smooth animations and physics simulation
- Random node selection every 3.5s (avoids consecutive duplicates)
- Smooth pan-to-node animation with automatic popover
- Brief physics pulse (1s) on each selection
- Background dimming animation
- Single-click to stop

#### Node Popover with Background Dimming
Floating popover with smart positioning and focus dimming effect
- Smooth 1.5s cubic ease-out dimming animation
- Non-selected nodes: 20% opacity, unconnected edges: 10% opacity
- Smart edge detection with 20px gap from node
- Auto-flips to avoid viewport edges
- Close via backdrop click, X button, or Escape key
- Shows: title, summary, type, memory count, URL, date, ID

#### Document Type Icons
Canvas-rendered icons centered on document cards
- Supported: TXT, PDF, MD, DOC/DOCX, RTF, CSV, JSON
- Scales with card size (40% of height)
- Only renders when zoomed in

#### Physics-Driven Layout
Simplified initial positioning, letting physics create natural layouts
- Simple grid with random offsets (no concentric rings)
- 50 quick pre-ticks + smooth animation
- Eliminates teleportation on node interaction
- Faster, non-blocking initial render

#### Updated Color Scheme
Refined palette for better contrast and readability

### Bug Fixes

#### Edge Viewport Culling
Fixed edges disappearing during zoom/pan
- Now checks both X and Y axis bounds
- Only culls when BOTH endpoints off-screen in same direction
- 100px margin on all sides

#### Memory Nodes Follow Parents
Memory nodes now move with parent documents when dragged
- Store relative offset instead of absolute position
- Automatically repositions based on parent location

### Performance

#### k-NN Similarity Algorithm
Reduced from O(n²) to O(n·k)
- 3x faster: ~50ms → ~17ms for 100 docs
- 4,950 → 1,500 comparisons for 100 docs
- Separated into own memo (doesn't recalculate on UI interactions)

#### Memory Leak Fix
NodeCache now cleans up deleted nodes properly

#### Race Condition Fix
Atomic node/edge updates eliminate NaN positions

#### Canvas Rendering Optimizations
Reduced per-frame overhead and improved rendering efficiency
- Spatial grid for hit detection
- Batched edge rendering by type (fewer canvas state changes)
- Canvas quality settings initialized once instead of every frame
- Optimized render key using fast hash instead of string concatenation
- Memoized nodeMap to avoid rebuilding every frame

#### Node Limiting & Memory Management
Smart memory limiting prevents performance issues with large datasets
- `maxNodes` prop limits total memory nodes (default: 500 in playground)
- Dynamic per-document cap distributes budget across documents
- Prioritizes recent memories and high-relevance scores
- k-NN similarity limit reduced from 15 to 10 connections per document

---