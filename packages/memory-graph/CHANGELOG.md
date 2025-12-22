# Memory Graph Changes

> **Testing Playground:** To test changes, run these 2 commands in separate terminals:
>
> **Terminal 1** - Build memory-graph in watch mode:
> ```bash
> cd packages/memory-graph && bun run dev
> ```
>
> **Terminal 2** - Run the playground:
> ```bash
> cd apps/memory-graph-playground && bun run dev
> ```
>
> Then open http://localhost:3000 in your browser.

## Slideshow Feature (2025-12-22)

**Feature:** Added slideshow mode to automatically cycle through nodes with smooth animations and physics.

**Implementation:**
- `isSlideshowActive` and `onSlideshowNodeChange` props for slideshow control
- Random node selection every 3.5 seconds (avoids consecutive duplicates)
- Smooth pan-to-node animation with automatic popover display
- Physics simulation triggers briefly (1s) on each selection for natural movement
- Background dimming animation on each node selection
- Popover backdrop scoped to graph container via `containerBounds` prop
- Single-click stop with automatic popover cleanup

## Visual & Layout Improvements (2025-12-22)

### Background Dimming When Popover is Open
**Feature:** When a popover is opened for a doc/memory node, the background dims while the selected node and popover remain in full focus.

**Implementation:**
- Smooth animated dimming: 1500ms ease-out cubic transition
- Canvas-based dimming: non-selected nodes reduced to 20% opacity
- Edges not connected to selected node reduced to 10% opacity
- Selected node remains at full opacity (1.0) for clear focus
- Transparent backdrop for click-outside-to-close functionality
- Escape key handler to close popover
- Popover positioned at z-index 1000

**User Experience:**
- Smooth, polished transition when opening/closing popovers
- Creates clear visual hierarchy when inspecting individual nodes
- Selected node stays bright and visible
- Reduces visual noise from surrounding graph elements
- Makes popover content easier to read
- Multiple ways to close: click backdrop, click X button, or press Escape key

**Files Changed:**
- `src/constants.ts:108-114` - Added ANIMATION config with dimDuration
- `src/components/node-popover.tsx:3,20-29` - Escape key handler and transparent backdrop
- `src/components/graph-canvas.tsx:12,53-54,62-91,289,294,301,306,317,435,454,577` - Smooth animation and dimming logic
- `src/components/memory-graph.tsx:620` - Pass selectedNodeId to canvas
- `src/types.ts:86` - Added selectedNodeId prop to GraphCanvasProps

### Smart Positioning Node Popover
**Feature:** Clicking nodes now shows a floating popover with detailed information, positioned near the node with smart viewport edge detection.

**Implementation:**
- DOM-based popover
- Auto-positions to avoid viewport edges with proper gap from node
- Popover positioned next to node (not on top) with 20px gap
- Calculates node dimensions dynamically based on type (document vs memory)
- Flips to opposite side when approaching viewport edges
- Click-outside to close
- Shows all node metadata: title, summary (2-line truncation), type, memory count, URL, creation date, and ID
- For memories: includes space, expiration date (if applicable), and forgotten status

**Files Changed:**
- `src/components/node-popover.tsx` - New popover component
- `src/components/memory-graph.tsx:421-429,434` - Smart positioning logic with gap calculation

### Document Type Icons on Cards
**Feature:** Document cards now display type-specific icons centered on the card for better visual identification.

**Supported Document Types:**
- 📄 TXT - Text documents (default for unsupported types)
- 📑 PDF - PDF files
- 📝 MD - Markdown files
- 📘 DOC/DOCX - Word documents
- 📄 RTF - Rich Text Format files
- 📊 CSV - Comma-separated values (grid icon)
- {} JSON - JSON files (curly braces)

**Implementation:**
- Icon rendering uses Canvas 2D API for performance
- Icons scale with card size (40% of card height)
- Only rendered when zoomed in (skipped in simplified rendering mode)
- Centered on document cards for better visual balance

**Files Changed:**
- `src/utils/document-icons.ts` - New utility with canvas-based icon drawing functions
- `src/components/graph-canvas.tsx:18,471-487` - Icon rendering integration

### Updated Color Scheme for Better Visual Clarity
**Changes:**
- Refined color palette for improved contrast and readability
- Better visual distinction between document and memory nodes
- Improved connection line visibility

### Simplified Graph Layout - Physics-Driven Approach
**Problem:** Complex concentric ring layout conflicted with physics simulation, causing nodes to "teleport" when clicked.

**Solution:** Replaced custom layout with simple grid initial positions, letting physics naturally organize the graph into a stable, circular shape.

**Implementation:**
- **Document Layout:** Simple grid with small random offsets (replaces concentric rings)
- **Memory Layout:** Basic circular positioning around parent documents
- **Hybrid Settling:** 50 quick pre-ticks (~5-10ms) + smooth animation to stability
- **Benefits:**
  - No jarring teleportation when interacting with nodes
  - Faster initial render (non-blocking UI)
  - Natural, organic layouts driven by node connections
  - Better perceived performance

**Files Changed:**
- `use-graph-data.ts:154-167` - Simplified document positioning
- `use-graph-data.ts:213-219` - Simplified memory clustering
- `use-force-simulation.ts:101-105` - Hybrid settling strategy

---

## Bug Fix: Edge Rendering Viewport Culling

**Problem:** Relationship lines (both doc-memory and doc-doc) would vanish when zooming in, particularly when connected nodes moved off-screen horizontally. This was caused by asymmetric viewport culling that only checked X-axis bounds.

**Root Cause:** Edge viewport culling only checked horizontal (X-axis) bounds, not vertical (Y-axis) bounds. The old logic would cull edges when *either* endpoint went off-screen horizontally (even if one was still visible), but had no vertical bounds checking at all. This caused edges to incorrectly disappear during horizontal panning.

**Solution:** Implemented proper viewport culling that checks both X and Y axis bounds, and only culls edges when BOTH endpoints are off-screen in the same direction.

**Implementation:**
- Added Y-axis bounds checking to edge viewport culling
- Changed logic to only cull when both source AND target nodes are off-screen in the same direction
- Applied consistent 100px margin on all sides (left, right, top, bottom)
- Fixed in both Canvas 2D and WebGL rendering implementations

**Files Changed:**
- `packages/memory-graph/src/components/graph-canvas.tsx:208-218` - Fixed Canvas 2D edge culling (screen space)

**Before:**
```typescript
// Only checked X-axis
if (sourceX < -100 || sourceX > width + 100 ||
    targetX < -100 || targetX > width + 100) {
    return; // Skip edge
}
```

**After:**
```typescript
// Checks both X and Y axis, only culls when BOTH nodes off-screen
const edgeMargin = 100;
if ((sourceX < -edgeMargin && targetX < -edgeMargin) ||
    (sourceX > width + edgeMargin && targetX > width + edgeMargin) ||
    (sourceY < -edgeMargin && targetY < -edgeMargin) ||
    (sourceY > height + edgeMargin && targetY > height + edgeMargin)) {
    return; // Skip edge
}
```

---

## Bug Fix: Memory Nodes Now Follow Parent Documents

**Problem:** When a memory node was manually dragged, it would stay at that absolute position. If the parent document was then dragged, the memory wouldn't move with it.

**Solution:** Store relative offset from parent document instead of absolute position.

**Implementation:**
- Modified `nodePositions` to track `parentDocId`, `offsetX`, `offsetY` for memory nodes
- When dragging memory: calculate offset from parent (`offsetX = memory.x - parent.x`)
- When rendering: apply offset to current parent position (`memory.x = parent.x + offsetX`)

**Files Changed:**
- `src/hooks/use-graph-interactions.ts:26-28, 111-156` - Enhanced drag handler
- `src/hooks/use-graph-data.ts:22, 203-220` - Apply relative offsets
- `src/components/memory-graph.tsx:251-257, 466` - Pass nodes to drag handler

## Performance Optimizations (2025-12-20)

### 1. **Similarity Calculation Refactored - k-NN Algorithm**
**Before:** O(n²) - every document compared with every other (4,950 comparisons for 100 docs)
**After:** O(n·k) - each doc compares with k=15 neighbors (1,500 comparisons for 100 docs)

**Benefits:**
- 3x faster for 100-doc graphs (~50ms → ~17ms)
- Similarity calculations only run when documents change (separated into own memo)
- UI interactions (drag, pan, zoom) don't trigger recalculation

**Implementation:**
- Split into 3 memos: `filteredDocuments` → `similarityEdges` → `graphData`
- Configurable via `SIMILARITY_CONFIG.maxComparisonsPerDoc` (default: 15)
- Location: `use-graph-data.ts:50-119`, `constants.ts:62-66`

### 2. **Memory Leak Fixed**
- NodeCache now cleans up deleted nodes
- Memory usage stays constant over long sessions
- Location: `use-graph-data.ts:29-48`

### 3. **Race Condition Eliminated**
- Node/edge updates now atomic
- No more NaN positions or simulation errors
- Location: `use-force-simulation.ts:117-135`

---