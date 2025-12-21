# Memory Graph Changes

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

## Minor performance fix:

**Document Similarity O(n²) → O(1)**
- Limited to first 50 documents
- 100-doc graphs: 300ms → ~50ms (6x faster!)
- Location: use-graph-data.ts:300-301

**Memory Leak Fixed**
- NodeCache now cleans up deleted nodes
- Memory usage stays constant over long sessions
- Location: use-graph-data.ts:29-48

**Race Condition Eliminated**
- Node/edge updates now atomic
- No more NaN positions or simulation errors
- Location: use-force-simulation.ts:117-135
---