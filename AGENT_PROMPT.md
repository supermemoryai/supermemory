# Autonomous Exploit Research Memory System - Agent Prompt

## Your Role

You are an autonomous implementation agent tasked with extending Supermemory into an **exploit-research memory system** for DeFi protocol analysis. Your goal is to implement the complete system as specified in `CLAUDE.md` and `TODO.md`.

---

## Project Context

### What You're Building

A memory system that enables autonomous exploit research to:
1. **Persist findings** across context resets (no chat history dependency)
2. **Avoid repetition** via embedding-based deduplication
3. **Route feedback** from test executions back to hypotheses/paths
4. **Isolate data** strictly by `protocol_id` + `season_id`
5. **Resume seamlessly** from any point using retrieval-first prompts

### Current Codebase Structure

```
supermemory/
├── packages/
│   ├── validation/           # Zod schemas - ADD YOUR SCHEMAS HERE
│   │   ├── schemas.ts        # Existing base schemas (reference this)
│   │   └── api.ts            # Existing API schemas (reference this)
│   ├── tools/src/            # Tool implementations - ADD YOUR CODE HERE
│   │   ├── shared.ts         # Shared constants (reference this)
│   │   └── vercel/           # Existing middleware patterns (reference this)
│   └── lib/
│       ├── similarity.ts     # Cosine similarity (USE THIS)
│       └── generate-id.ts    # ID generation (USE THIS)
└── apps/web/                 # Next.js app (backend routes go here later)
```

### Key Existing Patterns to Follow

1. **Schema Pattern** (from `packages/validation/schemas.ts`):
```typescript
import { z } from "zod"
export const MetadataSchema = z.record(z.union([z.string(), z.number(), z.boolean()]))
export const MySchema = z.object({
  id: z.string(),
  // ... fields
  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type MyType = z.infer<typeof MySchema>
```

2. **Similarity Function** (from `packages/lib/similarity.ts`):
```typescript
export const cosineSimilarity = (vectorA: number[], vectorB: number[]): number => {
  // Already implemented - use this for dedup
}
```

3. **ID Generation** (from `packages/lib/generate-id.ts`):
```typescript
import { customAlphabet } from "nanoid"
export const generateId = () => customAlphabet("...")(22)
```

---

## Implementation Instructions

### Phase 1: Start with Schemas

**Create file:** `packages/validation/exploit-research-schemas.ts`

Implement in this order:
1. All enums first (PhaseEnum, SeasonStatusEnum, etc.)
2. Core entities (ProtocolSchema, SeasonSchema, ContractSchema)
3. Knowledge entities (GraphSchema, InvariantSchema, PathSchema, ScenarioSchema)
4. Execution entities (TestSchema, ExecutionSchema, FeedbackSchema)
5. Supporting entities (ToolEventSchema, ArtifactSchema, QuestionSchema, EntityRelationSchema)
6. Snapshot entity (SeasonSnapshotSchema)

**Validation:** After creating schemas, write tests in `packages/validation/__tests__/exploit-research-schemas.test.ts`

Run: `bun test packages/validation/__tests__/exploit-research-schemas.test.ts`

### Phase 2: API Schemas

**Create file:** `packages/validation/exploit-research-api.ts`

Implement all request/response schemas:
- LogEventRequestSchema / LogEventResponseSchema
- StoreArtifactRequestSchema / StoreArtifactResponseSchema
- RetrieveRequestSchema / RetrieveResponseSchema
- SimilarRequestSchema / SimilarResponseSchema
- LinkRequestSchema / LinkResponseSchema
- RecordFeedbackRequestSchema / RecordFeedbackResponseSchema
- SnapshotRequestSchema / SnapshotResponseSchema
- RestoreRequestSchema / RestoreResponseSchema
- Season management schemas

### Phase 3: Reducers

**Create file:** `packages/tools/src/exploit-research/reducers.ts`

Implement reducers:
1. `reduceSourceCode()` - Extract functions, state vars, requires, events
2. `reduceABI()` - Categorize functions, extract events/errors
3. `reduceGraph()` - Summarize nodes/edges, highlight critical nodes
4. `reduceInvariants()` - Group by category, show formula/confidence
5. `reducePath()` - Format steps, assumptions, preconditions
6. `reduceForgeLogs()` - Extract pass/fail, reverts, profits
7. `reduceAddressList()` - Categorize addresses
8. `reduceGeneric()` - First/last window with size marker
9. `reduceByKind()` - Dispatcher

### Phase 4: Dedup

**Create file:** `packages/tools/src/exploit-research/dedup.ts`

Implement:
1. `checkDuplicate()` - Single embedding vs existing
2. `calculateNoveltyScore()` - With category penalties
3. `filterDuplicates()` - Batch filtering

Use `cosineSimilarity` from `@supermemory/lib/similarity`

### Phase 5: Middleware

**Create file:** `packages/tools/src/exploit-research/middleware.ts`

Implement:
1. `createExploitResearchMiddleware()` - Factory function
2. `wrapToolExecutor()` - Intercept tool calls, store results
3. `buildPromptFromMemory()` - Retrieval-first prompt construction
4. `recordTestFeedback()` - Route feedback to linked entities
5. `checkDuplicate()` - Pre-creation dedup check

### Phase 6: Tests

Create comprehensive tests for each file:
- `packages/validation/__tests__/exploit-research-schemas.test.ts`
- `packages/validation/__tests__/exploit-research-api.test.ts`
- `packages/tools/src/exploit-research/__tests__/reducers.test.ts`
- `packages/tools/src/exploit-research/__tests__/dedup.test.ts`
- `packages/tools/src/exploit-research/__tests__/middleware.test.ts`
- `packages/tools/src/exploit-research/__tests__/integration.test.ts`

---

## Critical Requirements

### 1. Strict Isolation
Every function that reads/writes data MUST enforce:
```typescript
// REQUIRED on every operation
protocolId: string  // Hard isolation boundary
seasonId: string    // Per-season isolation
```

### 2. ID Naming Convention
```typescript
// Protocol ID
const protocolId = "uniswap-v3"

// Season ID
const seasonId = `${protocolId}:season-${YYYYMMDD}-${uuid4()}`

// Entity IDs
const invariantId = `${seasonId}:inv-${category}-${hash}`
const pathId = `${seasonId}:path-${hash}`
const testId = `${seasonId}:test-${hash}`
```

### 3. Reducer Output Format
Every reducer MUST return:
```typescript
interface ReducerResult {
  summary: string              // Reduced content for LLM
  shouldStoreRaw: boolean      // Whether to persist full content
  extractedMetadata: Record<string, unknown>  // Structured data
}
```

### 4. Dedup Thresholds
```typescript
const DEFAULT_CONFIG = {
  duplicateThreshold: 0.92,    // Reject if similarity >= this
  similarityThreshold: 0.85,   // Flag as similar if >= this
}
```

### 5. Test Requirements
Each test file MUST include:
- Valid input tests (happy path)
- Invalid input tests (edge cases)
- Boundary condition tests
- Error handling tests

---

## Commands Reference

```bash
# Install dependencies
bun install

# Run specific test
bun test packages/validation/__tests__/exploit-research-schemas.test.ts

# Run all tests
bun test

# Type check
bun run typecheck

# Lint
bun run lint
```

---

## Workflow

1. **Read** `CLAUDE.md` for full architecture details
2. **Read** `TODO.md` for step-by-step implementation tasks
3. **Implement** one phase at a time
4. **Test** each phase before moving to next
5. **Commit** after each phase passes tests

### After Each Phase

✅ Verify:
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Exports are correct
- [ ] Documentation comments added

---

## Success Criteria

The implementation is complete when:

1. **All schemas validate** - 23+ schemas compile and pass tests
2. **All reducers work** - 8 reducers achieve >50% size reduction
3. **Dedup functions** - Correctly identifies duplicates at 0.92 threshold
4. **Middleware integrates** - Captures tool calls, builds prompts, routes feedback
5. **Tests pass** - >90% code coverage, all tests green
6. **Documentation** - All public functions have JSDoc comments

---

## Start Here

Begin with Phase 1 from `TODO.md`:

```bash
# Create the schemas file
touch packages/validation/exploit-research-schemas.ts

# Start implementing enums, then schemas
# Reference packages/validation/schemas.ts for patterns
```

After creating schemas, create the test file and verify:

```bash
touch packages/validation/__tests__/exploit-research-schemas.test.ts
bun test packages/validation/__tests__/exploit-research-schemas.test.ts
```

Good luck! Refer to `CLAUDE.md` for detailed specifications and `TODO.md` for implementation checklist.
