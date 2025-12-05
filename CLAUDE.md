# Supermemory: Autonomous Exploit Research Memory System

## Project Overview

This document provides comprehensive implementation guidance for extending Supermemory into an **autonomous exploit-research memory system** that provides "unlimited structured intelligence" per protocol season without relying on chat history.

### Core Problem Statement

The autonomous exploit-research system suffers from:
- Context overflow resets losing all findings
- Repeated hypotheses/tests after resets
- No feedback routing from execution results
- Volatile in-memory graph/invariant caches
- Weak cross-phase coordination

### Solution: Supermemory Extension

Supermemory must persist, retrieve, deduplicate, and route feedback so the system can resume any season with full intelligence and avoid repetition.

---

## Architecture Mapping

### Existing Supermemory Concepts → Exploit Research Concepts

| Supermemory | Exploit Research | Notes |
|-------------|------------------|-------|
| `orgId` | `protocol_id` | Hard isolation boundary |
| `spaceId` | `season_id` | Per-protocol-season isolation |
| `Document` | Artifact (source, ABI, graph, etc.) | Raw content storage |
| `Chunk` | Reduced/summarized content | Embedded for retrieval |
| `MemoryEntry` | Invariant, Path, Hypothesis, Scenario | Knowledge graph nodes |
| `MemoryRelation` | `derived_from`, `violates`, `uses`, etc. | Extended relation types |
| `containerTags` | `[protocol_id, season_id, phase]` | Multi-level filtering |
| `customId` | Deterministic IDs for dedup | `<kind>:<hash>` pattern |
| `metadata` | Phase, contract, function, test info | Structured filtering |

### ID Naming Convention

```
protocol_id: <protocol_name>                    # e.g., "uniswap-v3"
season_id: <protocol_id>:season-<YYYYMMDD>-<uuid4>  # e.g., "uniswap-v3:season-20241205-a1b2c3d4"
graph_id: <season_id>:graph-<hash>
invariant_id: <season_id>:inv-<category>-<hash>
path_id: <season_id>:path-<hash>
scenario_id: <season_id>:scenario-<hash>
test_id: <season_id>:test-<hash>
artifact_id: <season_id>:artifact-<kind>-<hash>
tool_call_id: <season_id>:tool-<timestamp>-<uuid4>
```

---

## Extended Schema Definitions

### Location: `packages/validation/exploit-research-schemas.ts`

```typescript
import { z } from "zod"
import { MetadataSchema } from "./schemas"

// ============================================================================
// ENUMS
// ============================================================================

export const PhaseEnum = z.enum([
  "intake",           // Source/ABI collection
  "graphing",         // Contract graph construction
  "invariant",        // Invariant derivation
  "violation",        // Violation search
  "poc_generation",   // PoC code generation
  "execution",        // Foundry fork test execution
  "refinement",       // Iterative improvement
])
export type Phase = z.infer<typeof PhaseEnum>

export const SeasonStatusEnum = z.enum([
  "created",
  "active",
  "paused",
  "closed",
])
export type SeasonStatus = z.infer<typeof SeasonStatusEnum>

export const ArtifactKindEnum = z.enum([
  "source",
  "abi",
  "graph",
  "invariant",
  "path",
  "hypothesis",
  "scenario",
  "test",
  "execution",
  "log",
  "question",
  "forge_output",
  "contract_outline",
  "tool_output",
])
export type ArtifactKind = z.infer<typeof ArtifactKindEnum>

export const InvariantCategoryEnum = z.enum([
  "access_control",
  "arithmetic",
  "reentrancy",
  "oracle_manipulation",
  "flash_loan",
  "price_manipulation",
  "slippage",
  "timestamp_dependency",
  "front_running",
  "governance",
  "liquidity",
  "collateral",
  "interest_rate",
  "liquidation",
  "fee_extraction",
  "donation_attack",
  "first_depositor",
  "custom",
])
export type InvariantCategory = z.infer<typeof InvariantCategoryEnum>

export const TestStatusEnum = z.enum([
  "pending",
  "running",
  "pass",
  "fail",
  "flaky",
  "inconclusive",
  "error",
])
export type TestStatus = z.infer<typeof TestStatusEnum>

export const ExploitRelationEnum = z.enum([
  "derived_from",     // Created from parent
  "violates",         // Path violates invariant
  "uses",             // Uses contract/function
  "depends_on",       // Dependency relationship
  "tested_by",        // Tested by test case
  "confirmed_by",     // Confirmed by execution
  "refutes",          // Disproves hypothesis
  "updates",          // Updates existing knowledge (from base)
  "extends",          // Extends without replacing (from base)
  "derives",          // Inferred connection (from base)
])
export type ExploitRelation = z.infer<typeof ExploitRelationEnum>

export const SeverityEnum = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "informational",
])
export type Severity = z.infer<typeof SeverityEnum>

// ============================================================================
// CORE ENTITIES
// ============================================================================

export const ProtocolSchema = z.object({
  id: z.string(),                              // protocol_id
  name: z.string(),
  chains: z.array(z.string()),                 // ["ethereum", "arbitrum"]
  type: z.string(),                            // "dex", "lending", "bridge"
  valueContracts: z.array(z.string()),         // Addresses holding value
  criticalFunctions: z.array(z.object({
    contract: z.string(),
    function: z.string(),
    signature: z.string(),
    risk: SeverityEnum,
  })),
  seasonIds: z.array(z.string()),
  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Protocol = z.infer<typeof ProtocolSchema>

export const SeasonSchema = z.object({
  id: z.string(),                              // season_id
  protocolId: z.string(),
  status: SeasonStatusEnum,
  startedAt: z.coerce.date(),
  closedAt: z.coerce.date().nullable().optional(),

  // Coverage statistics
  coverage: z.object({
    contractsAnalyzed: z.number().default(0),
    functionsAnalyzed: z.number().default(0),
    invariantsGenerated: z.number().default(0),
    pathsExplored: z.number().default(0),
    scenariosGenerated: z.number().default(0),
    testsRun: z.number().default(0),
    testsPassed: z.number().default(0),
    testsFailed: z.number().default(0),
    profitableExploits: z.number().default(0),
  }),

  // Active phase tracking
  activePhases: z.array(PhaseEnum),
  currentPhase: PhaseEnum.nullable().optional(),

  // Checkpoint data
  checkpointData: z.record(z.unknown()).nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Season = z.infer<typeof SeasonSchema>

export const ContractSchema = z.object({
  id: z.string(),
  protocolId: z.string(),
  seasonId: z.string(),
  address: z.string(),
  chain: z.string(),
  name: z.string(),

  // Classification
  holdsValue: z.boolean().default(false),
  role: z.string().nullable().optional(),      // "vault", "router", "oracle"

  // Content
  outline: z.string().nullable().optional(),   // Reduced function/state summary
  abiHash: z.string().nullable().optional(),
  sourceHash: z.string().nullable().optional(),

  // References
  sourceArtifactId: z.string().nullable().optional(),
  abiArtifactId: z.string().nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Contract = z.infer<typeof ContractSchema>

export const GraphSchema = z.object({
  id: z.string(),                              // graph_id
  protocolId: z.string(),
  seasonId: z.string(),

  // Graph statistics
  nodeCount: z.number().default(0),
  edgeCount: z.number().default(0),
  graphHash: z.string(),                       // For change detection

  // Coverage
  contractsCovered: z.array(z.string()),       // Contract IDs
  coverage: z.number().default(0),             // 0-100 percentage

  // Storage reference
  graphArtifactId: z.string().nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Graph = z.infer<typeof GraphSchema>

export const InvariantSchema = z.object({
  id: z.string(),                              // invariant_id
  protocolId: z.string(),
  seasonId: z.string(),
  graphId: z.string().nullable().optional(),

  // Invariant definition
  category: InvariantCategoryEnum,
  formula: z.string(),                         // Logical/mathematical formula
  description: z.string(),

  // Target
  targetContract: z.string().nullable().optional(),
  targetFunction: z.string().nullable().optional(),
  variables: z.array(z.string()),              // State variables involved

  // Assessment
  severity: SeverityEnum,
  confidence: z.number().min(0).max(1),        // 0-1 confidence score
  sourceLocation: z.string().nullable().optional(),

  // Embeddings for similarity
  embedding: z.array(z.number()).nullable().optional(),
  embeddingModel: z.string().nullable().optional(),

  // Status
  isViolated: z.boolean().default(false),
  violationCount: z.number().default(0),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Invariant = z.infer<typeof InvariantSchema>

export const PathStepSchema = z.object({
  contract: z.string(),
  function: z.string(),
  inputs: z.record(z.unknown()).nullable().optional(),
  expectedState: z.record(z.unknown()).nullable().optional(),
  notes: z.string().nullable().optional(),
})
export type PathStep = z.infer<typeof PathStepSchema>

export const PathSchema = z.object({
  id: z.string(),                              // path_id
  protocolId: z.string(),
  seasonId: z.string(),

  // Violation target
  violatedInvariantId: z.string(),

  // Path definition
  steps: z.array(PathStepSchema),

  // Economics
  estimatedProfit: z.number().nullable().optional(),
  requiredCapital: z.number().nullable().optional(),

  // Assessment
  confidence: z.number().min(0).max(1),
  complexity: z.number().min(1).max(10),       // 1=simple, 10=complex

  // Preconditions
  assumptions: z.array(z.string()),
  preconditions: z.array(z.string()),

  // Dedup
  dedupEmbedding: z.array(z.number()).nullable().optional(),
  dedupEmbeddingModel: z.string().nullable().optional(),

  // Status
  isViable: z.boolean().default(true),
  testedCount: z.number().default(0),
  confirmedCount: z.number().default(0),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Path = z.infer<typeof PathSchema>

export const ScenarioSchema = z.object({
  id: z.string(),                              // scenario_id
  protocolId: z.string(),
  seasonId: z.string(),
  derivedFromPathId: z.string(),

  // Economics
  grossProfit: z.number().nullable().optional(),
  netProfit: z.number().nullable().optional(),
  gasCosts: z.number().nullable().optional(),
  flashLoanFees: z.number().nullable().optional(),
  requiredCapital: z.number().nullable().optional(),

  // Contracts involved
  contractsInvolved: z.array(z.string()),

  // Assessment
  confidence: z.number().min(0).max(1),
  complexity: z.number().min(1).max(10),
  isViable: z.boolean().default(true),

  // Dedup
  dedupEmbedding: z.array(z.number()).nullable().optional(),
  dedupEmbeddingModel: z.string().nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Scenario = z.infer<typeof ScenarioSchema>

export const TestSchema = z.object({
  id: z.string(),                              // test_id
  protocolId: z.string(),
  seasonId: z.string(),
  scenarioId: z.string(),

  // Test code
  codeHash: z.string(),
  codeArtifactId: z.string().nullable().optional(),

  // Status
  status: TestStatusEnum,

  // Fork configuration
  forkRpc: z.string().nullable().optional(),
  forkBlock: z.number().nullable().optional(),

  // Results
  forgeLogsRef: z.string().nullable().optional(),
  coverage: z.number().nullable().optional(),  // 0-100

  // Dedup
  dedupEmbedding: z.array(z.number()).nullable().optional(),
  dedupEmbeddingModel: z.string().nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Test = z.infer<typeof TestSchema>

export const ExecutionSchema = z.object({
  id: z.string(),
  protocolId: z.string(),
  seasonId: z.string(),
  testId: z.string(),

  // Results
  status: TestStatusEnum,
  profit: z.number().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  revertReason: z.string().nullable().optional(),

  // Environment
  forkRpc: z.string(),
  forkBlock: z.number(),

  // Artifacts
  logsArtifactId: z.string().nullable().optional(),
  traceArtifactId: z.string().nullable().optional(),

  // Metrics
  gasUsed: z.number().nullable().optional(),
  executionTime: z.number().nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
})
export type Execution = z.infer<typeof ExecutionSchema>

// ============================================================================
// EVENT LOG & ARTIFACTS
// ============================================================================

export const ToolEventSchema = z.object({
  id: z.string(),                              // tool_call_id
  protocolId: z.string(),
  seasonId: z.string(),
  phase: PhaseEnum,

  // Tool info
  toolName: z.string(),
  toolCallId: z.string(),                      // External tool call ID

  // Target
  targetContract: z.string().nullable().optional(),
  targetFunction: z.string().nullable().optional(),
  targetInvariantId: z.string().nullable().optional(),
  targetPathId: z.string().nullable().optional(),
  targetTestId: z.string().nullable().optional(),

  // Result
  success: z.boolean(),
  duration: z.number().nullable().optional(),  // ms

  // Token tracking
  inputTokens: z.number().nullable().optional(),
  outputTokens: z.number().nullable().optional(),
  costUsd: z.number().nullable().optional(),

  // References
  rawRef: z.string().nullable().optional(),    // Artifact ID for raw output
  summaryRef: z.string().nullable().optional(),// Artifact ID for summary
  embeddingId: z.string().nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
})
export type ToolEvent = z.infer<typeof ToolEventSchema>

export const ArtifactSchema = z.object({
  id: z.string(),                              // artifact_id
  protocolId: z.string(),
  seasonId: z.string(),

  // Type
  kind: ArtifactKindEnum,

  // Content
  raw: z.string().nullable().optional(),       // Raw content (may be large)
  rawHash: z.string().nullable().optional(),   // For dedup
  summary: z.string().nullable().optional(),   // Reduced content

  // Embeddings
  embedding: z.array(z.number()).nullable().optional(),
  embeddingModel: z.string().nullable().optional(),

  // Size tracking
  rawSize: z.number().nullable().optional(),   // bytes
  summarySize: z.number().nullable().optional(),

  // Retention
  retainUntil: z.coerce.date().nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Artifact = z.infer<typeof ArtifactSchema>

export const QuestionSchema = z.object({
  id: z.string(),
  protocolId: z.string(),
  seasonId: z.string(),

  // Question content
  text: z.string(),
  category: z.string().nullable().optional(),

  // Performance tracking
  successRate: z.number().default(0),          // 0-1
  timesAsked: z.number().default(0),

  // Links
  linkedInvariantId: z.string().nullable().optional(),
  linkedPathId: z.string().nullable().optional(),

  // Embeddings
  embedding: z.array(z.number()).nullable().optional(),
  embeddingModel: z.string().nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Question = z.infer<typeof QuestionSchema>

// ============================================================================
// RELATIONS
// ============================================================================

export const EntityRelationSchema = z.object({
  id: z.string(),
  parentId: z.string(),
  childId: z.string(),
  relation: ExploitRelationEnum,

  // Context
  protocolId: z.string(),
  seasonId: z.string(),

  // Metadata
  confidence: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().nullable().optional(),

  createdAt: z.coerce.date(),
})
export type EntityRelation = z.infer<typeof EntityRelationSchema>

// ============================================================================
// FEEDBACK
// ============================================================================

export const FeedbackSchema = z.object({
  id: z.string(),
  protocolId: z.string(),
  seasonId: z.string(),
  testId: z.string(),

  // Result
  status: TestStatusEnum,

  // Details
  profit: z.number().nullable().optional(),
  revertReason: z.string().nullable().optional(),
  failureDetails: z.string().nullable().optional(),

  // Linked entities to update
  linkedPathId: z.string().nullable().optional(),
  linkedScenarioId: z.string().nullable().optional(),
  linkedInvariantIds: z.array(z.string()).nullable().optional(),

  // Forge logs
  forgeLogsRef: z.string().nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
})
export type Feedback = z.infer<typeof FeedbackSchema>

// ============================================================================
// SNAPSHOT
// ============================================================================

export const SeasonSnapshotSchema = z.object({
  id: z.string(),
  seasonId: z.string(),
  protocolId: z.string(),

  // State at snapshot time
  coverage: SeasonSchema.shape.coverage,
  activePhases: z.array(PhaseEnum),
  currentPhase: PhaseEnum.nullable().optional(),

  // Active entity IDs
  activeGraphIds: z.array(z.string()),
  activeInvariantIds: z.array(z.string()),
  activePathIds: z.array(z.string()),
  activeScenarioIds: z.array(z.string()),
  activeTestIds: z.array(z.string()),

  // Checkpoint data
  checkpointData: z.record(z.unknown()).nullable().optional(),

  metadata: MetadataSchema.nullable().optional(),
  createdAt: z.coerce.date(),
})
export type SeasonSnapshot = z.infer<typeof SeasonSnapshotSchema>
```

---

## API Specifications

### Location: `packages/validation/exploit-research-api.ts`

```typescript
import { z } from "zod"
import "zod-openapi/extend"
import {
  PhaseEnum,
  ArtifactKindEnum,
  TestStatusEnum,
  ExploitRelationEnum,
  SeasonStatusEnum,
} from "./exploit-research-schemas"

// ============================================================================
// log_event API
// ============================================================================

export const LogEventRequestSchema = z.object({
  protocolId: z.string().openapi({
    description: "Protocol identifier (hard isolation boundary)",
    example: "uniswap-v3",
  }),
  seasonId: z.string().openapi({
    description: "Season identifier",
    example: "uniswap-v3:season-20241205-abc123",
  }),
  phase: PhaseEnum.openapi({
    description: "Current phase of the exploit research",
    example: "invariant",
  }),
  toolName: z.string().openapi({
    description: "Name of the tool that was called",
    example: "etherscan_fetch_source",
  }),
  toolCallId: z.string().openapi({
    description: "External tool call ID",
    example: "call_abc123",
  }),

  // Target (optional)
  targetContract: z.string().optional(),
  targetFunction: z.string().optional(),
  targetInvariantId: z.string().optional(),
  targetPathId: z.string().optional(),
  targetTestId: z.string().optional(),

  // Result
  success: z.boolean(),
  duration: z.number().optional(),

  // Token tracking
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  costUsd: z.number().optional(),

  // Content (will be processed into raw/summary/embedding)
  rawContent: z.string().optional(),
  summaryContent: z.string().optional(),

  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
})

export const LogEventResponseSchema = z.object({
  id: z.string(),
  rawRef: z.string().nullable(),
  summaryRef: z.string().nullable(),
  embeddingId: z.string().nullable(),
})

// ============================================================================
// store_artifact API
// ============================================================================

export const StoreArtifactRequestSchema = z.object({
  protocolId: z.string(),
  seasonId: z.string(),
  kind: ArtifactKindEnum,
  raw: z.string().optional(),
  summary: z.string().optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),

  // Optional pre-computed embedding
  embedding: z.array(z.number()).optional(),
  embeddingModel: z.string().optional(),

  // Retention
  retainDays: z.number().optional().default(30),
})

export const StoreArtifactResponseSchema = z.object({
  id: z.string(),
  embeddingId: z.string().nullable(),
  rawHash: z.string().nullable(),
})

// ============================================================================
// retrieve API
// ============================================================================

export const RetrieveRequestSchema = z.object({
  protocolId: z.string(),
  seasonId: z.string(),
  query: z.string().openapi({
    description: "Semantic search query",
    example: "flash loan vulnerability in swap function",
  }),

  // Filters
  filters: z.object({
    phase: PhaseEnum.optional(),
    contract: z.string().optional(),
    function: z.string().optional(),
    invariantId: z.string().optional(),
    pathId: z.string().optional(),
    scenarioId: z.string().optional(),
    testId: z.string().optional(),
    tool: z.string().optional(),
    kind: ArtifactKindEnum.optional(),

    // Recency filter
    createdAfter: z.coerce.date().optional(),
    createdBefore: z.coerce.date().optional(),
  }).optional(),

  // Pagination
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),

  // Options
  includeSummary: z.boolean().default(true),
  includeRaw: z.boolean().default(false),
  threshold: z.number().min(0).max(1).default(0.5),
})

export const RetrieveResultSchema = z.object({
  id: z.string(),
  kind: ArtifactKindEnum,
  summary: z.string().nullable(),
  raw: z.string().nullable(),
  similarity: z.number(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
})

export const RetrieveResponseSchema = z.object({
  results: z.array(RetrieveResultSchema),
  total: z.number(),
  timing: z.number(),
})

// ============================================================================
// similar API (for dedup/novelty)
// ============================================================================

export const SimilarRequestSchema = z.object({
  protocolId: z.string(),
  seasonId: z.string(),
  kind: ArtifactKindEnum,

  // One of these required
  text: z.string().optional(),
  embedding: z.array(z.number()).optional(),

  threshold: z.number().min(0).max(1).default(0.85),
  limit: z.number().min(1).max(50).default(5),
})

export const SimilarResultSchema = z.object({
  id: z.string(),
  similarity: z.number(),
  summary: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
})

export const SimilarResponseSchema = z.object({
  results: z.array(SimilarResultSchema),
  isDuplicate: z.boolean().openapi({
    description: "True if any result exceeds threshold",
  }),
  maxSimilarity: z.number(),
})

// ============================================================================
// link API
// ============================================================================

export const LinkRequestSchema = z.object({
  protocolId: z.string(),
  seasonId: z.string(),
  parentId: z.string(),
  childId: z.string(),
  relation: ExploitRelationEnum,
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
})

export const LinkResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
})

// ============================================================================
// record_feedback API
// ============================================================================

export const RecordFeedbackRequestSchema = z.object({
  protocolId: z.string(),
  seasonId: z.string(),
  testId: z.string(),
  status: TestStatusEnum,

  // Details
  profit: z.number().optional(),
  revertReason: z.string().optional(),
  failureDetails: z.string().optional(),

  // Linked entities to update
  linkedPathId: z.string().optional(),
  linkedScenarioId: z.string().optional(),
  linkedInvariantIds: z.array(z.string()).optional(),

  // Forge logs content
  forgeLogsContent: z.string().optional(),
})

export const RecordFeedbackResponseSchema = z.object({
  id: z.string(),
  updatedEntities: z.array(z.object({
    id: z.string(),
    type: z.string(),
    field: z.string(),
    oldValue: z.unknown(),
    newValue: z.unknown(),
  })),
})

// ============================================================================
// snapshot / restore API
// ============================================================================

export const SnapshotRequestSchema = z.object({
  seasonId: z.string(),
  protocolId: z.string(),
  metadata: z.record(z.unknown()).optional(),
})

export const SnapshotResponseSchema = z.object({
  id: z.string(),
  seasonId: z.string(),
  createdAt: z.coerce.date(),
})

export const RestoreRequestSchema = z.object({
  snapshotId: z.string(),
  protocolId: z.string(),
})

export const RestoreResponseSchema = z.object({
  success: z.boolean(),
  restoredSeasonId: z.string(),
  restoredEntities: z.object({
    graphs: z.number(),
    invariants: z.number(),
    paths: z.number(),
    scenarios: z.number(),
    tests: z.number(),
  }),
})

// ============================================================================
// Season Management
// ============================================================================

export const CreateSeasonRequestSchema = z.object({
  protocolId: z.string(),
  metadata: z.record(z.unknown()).optional(),
})

export const CreateSeasonResponseSchema = z.object({
  id: z.string(),
  protocolId: z.string(),
  status: SeasonStatusEnum,
  createdAt: z.coerce.date(),
})

export const CloseSeasonRequestSchema = z.object({
  seasonId: z.string(),
  protocolId: z.string(),
})

export const CloseSeasonResponseSchema = z.object({
  success: z.boolean(),
  finalSnapshot: z.string().nullable(),
})

// ============================================================================
// Import API (admin only)
// ============================================================================

export const ImportSummariesRequestSchema = z.object({
  targetSeasonId: z.string(),
  sourceSeasonId: z.string(),
  protocolId: z.string(),

  // What to import
  importInvariants: z.boolean().default(true),
  importPaths: z.boolean().default(false),
  importQuestions: z.boolean().default(true),

  // Filter
  minConfidence: z.number().min(0).max(1).default(0.7),
})

export const ImportSummariesResponseSchema = z.object({
  imported: z.object({
    invariants: z.number(),
    paths: z.number(),
    questions: z.number(),
  }),
})
```

---

## Reducer Implementations

### Location: `packages/tools/src/exploit-research/reducers.ts`

```typescript
/**
 * Reducers: Transform verbose tool outputs into compact summaries
 * before they hit the LLM or storage-heavy responses.
 *
 * Each reducer stores:
 * - raw_ref: Reference to full raw content
 * - summary: Reduced content for LLM consumption
 * - embedding: For semantic retrieval
 */

export interface ReducerResult {
  summary: string
  shouldStoreRaw: boolean
  extractedMetadata: Record<string, unknown>
}

// ============================================================================
// SOURCE/ABI REDUCER
// ============================================================================

export function reduceSourceCode(raw: string): ReducerResult {
  const lines = raw.split('\n')

  // Extract key elements
  const functions: string[] = []
  const stateVars: string[] = []
  const modifiers: string[] = []
  const requires: string[] = []
  const events: string[] = []

  let inFunction = false
  let braceCount = 0
  let currentFunction = ''

  for (const line of lines) {
    const trimmed = line.trim()

    // State variables
    if (trimmed.match(/^\s*(mapping|uint|int|address|bool|bytes|string)\s+/)) {
      stateVars.push(trimmed.replace(/;$/, ''))
    }

    // Function signatures
    if (trimmed.match(/^function\s+\w+/)) {
      const sig = trimmed.match(/function\s+(\w+)\s*\([^)]*\)/)?.[0]
      if (sig) functions.push(sig)
    }

    // Modifiers
    if (trimmed.match(/^modifier\s+\w+/)) {
      const mod = trimmed.match(/modifier\s+(\w+)/)?.[1]
      if (mod) modifiers.push(mod)
    }

    // Require statements (security-relevant)
    if (trimmed.includes('require(') || trimmed.includes('revert(')) {
      requires.push(trimmed)
    }

    // Events
    if (trimmed.match(/^event\s+\w+/)) {
      events.push(trimmed.replace(/;$/, ''))
    }
  }

  const summary = `## Contract Outline

### State Variables (${stateVars.length})
${stateVars.slice(0, 20).map(v => `- ${v}`).join('\n')}
${stateVars.length > 20 ? `... and ${stateVars.length - 20} more` : ''}

### Functions (${functions.length})
${functions.slice(0, 30).map(f => `- ${f}`).join('\n')}
${functions.length > 30 ? `... and ${functions.length - 30} more` : ''}

### Modifiers (${modifiers.length})
${modifiers.map(m => `- ${m}`).join('\n')}

### Security Checks (${requires.length})
${requires.slice(0, 15).map(r => `- ${r}`).join('\n')}
${requires.length > 15 ? `... and ${requires.length - 15} more` : ''}

### Events (${events.length})
${events.slice(0, 10).map(e => `- ${e}`).join('\n')}
${events.length > 10 ? `... and ${events.length - 10} more` : ''}`

  return {
    summary,
    shouldStoreRaw: true,
    extractedMetadata: {
      functionCount: functions.length,
      stateVarCount: stateVars.length,
      modifierCount: modifiers.length,
      requireCount: requires.length,
      eventCount: events.length,
    },
  }
}

// ============================================================================
// ABI REDUCER
// ============================================================================

export function reduceABI(raw: string): ReducerResult {
  try {
    const abi = JSON.parse(raw)

    const functions = abi.filter((item: any) => item.type === 'function')
    const events = abi.filter((item: any) => item.type === 'event')
    const errors = abi.filter((item: any) => item.type === 'error')

    const writeFunctions = functions.filter((f: any) =>
      f.stateMutability !== 'view' && f.stateMutability !== 'pure'
    )
    const readFunctions = functions.filter((f: any) =>
      f.stateMutability === 'view' || f.stateMutability === 'pure'
    )

    const summary = `## ABI Summary

### Write Functions (${writeFunctions.length})
${writeFunctions.slice(0, 20).map((f: any) =>
  `- ${f.name}(${f.inputs?.map((i: any) => `${i.type} ${i.name}`).join(', ') || ''})`
).join('\n')}
${writeFunctions.length > 20 ? `... and ${writeFunctions.length - 20} more` : ''}

### Read Functions (${readFunctions.length})
${readFunctions.slice(0, 15).map((f: any) =>
  `- ${f.name}(${f.inputs?.map((i: any) => `${i.type} ${i.name}`).join(', ') || ''})`
).join('\n')}
${readFunctions.length > 15 ? `... and ${readFunctions.length - 15} more` : ''}

### Events (${events.length})
${events.slice(0, 10).map((e: any) => `- ${e.name}`).join('\n')}
${events.length > 10 ? `... and ${events.length - 10} more` : ''}

### Errors (${errors.length})
${errors.map((e: any) => `- ${e.name}`).join('\n')}`

    return {
      summary,
      shouldStoreRaw: true,
      extractedMetadata: {
        totalFunctions: functions.length,
        writeFunctions: writeFunctions.length,
        readFunctions: readFunctions.length,
        eventCount: events.length,
        errorCount: errors.length,
      },
    }
  } catch {
    return {
      summary: `[Invalid ABI - parse error]\n${raw.slice(0, 500)}...`,
      shouldStoreRaw: true,
      extractedMetadata: { parseError: true },
    }
  }
}

// ============================================================================
// GRAPH REDUCER
// ============================================================================

export function reduceGraph(raw: string): ReducerResult {
  try {
    const graph = JSON.parse(raw)

    const nodeCount = graph.nodes?.length || 0
    const edgeCount = graph.edges?.length || 0

    // Extract critical nodes (entry points, value-holding, etc.)
    const criticalNodes = graph.nodes?.filter((n: any) =>
      n.holdsValue || n.isEntryPoint || n.risk === 'high'
    ) || []

    const summary = `## Graph Summary

Nodes: ${nodeCount} | Edges: ${edgeCount}

### Critical Nodes (${criticalNodes.length})
${criticalNodes.slice(0, 15).map((n: any) =>
  `- ${n.contract}.${n.function} [${n.risk || 'unknown'}]`
).join('\n')}
${criticalNodes.length > 15 ? `... and ${criticalNodes.length - 15} more` : ''}

### Coverage
- Contracts: ${new Set(graph.nodes?.map((n: any) => n.contract)).size}
- Functions: ${nodeCount}
- Call paths: ${edgeCount}`

    return {
      summary,
      shouldStoreRaw: true,
      extractedMetadata: {
        nodeCount,
        edgeCount,
        criticalNodeCount: criticalNodes.length,
      },
    }
  } catch {
    return {
      summary: `[Graph parse error]\n${raw.slice(0, 500)}...`,
      shouldStoreRaw: true,
      extractedMetadata: { parseError: true },
    }
  }
}

// ============================================================================
// INVARIANTS REDUCER
// ============================================================================

export function reduceInvariants(raw: string): ReducerResult {
  try {
    const invariants = JSON.parse(raw)

    if (!Array.isArray(invariants)) {
      return {
        summary: raw.slice(0, 2000),
        shouldStoreRaw: true,
        extractedMetadata: {},
      }
    }

    const byCategory: Record<string, any[]> = {}
    for (const inv of invariants) {
      const cat = inv.category || 'unknown'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(inv)
    }

    const summary = `## Invariants Summary (${invariants.length} total)

${Object.entries(byCategory).map(([cat, invs]) =>
`### ${cat} (${invs.length})
${invs.slice(0, 5).map((inv: any) =>
  `- [${inv.severity || '?'}] ${inv.formula || inv.description} (conf: ${(inv.confidence * 100).toFixed(0)}%)`
).join('\n')}
${invs.length > 5 ? `... and ${invs.length - 5} more` : ''}`
).join('\n\n')}`

    return {
      summary,
      shouldStoreRaw: true,
      extractedMetadata: {
        totalInvariants: invariants.length,
        byCategory: Object.fromEntries(
          Object.entries(byCategory).map(([k, v]) => [k, v.length])
        ),
      },
    }
  } catch {
    return {
      summary: raw.slice(0, 2000),
      shouldStoreRaw: true,
      extractedMetadata: {},
    }
  }
}

// ============================================================================
// PATHS/HYPOTHESES REDUCER
// ============================================================================

export function reducePath(raw: string): ReducerResult {
  try {
    const path = JSON.parse(raw)

    const steps = path.steps || []
    const summary = `## Path Summary

Violates: ${path.violatedInvariantId || 'unknown'}
Confidence: ${((path.confidence || 0) * 100).toFixed(0)}%
Est. Profit: ${path.estimatedProfit ? `$${path.estimatedProfit.toLocaleString()}` : 'unknown'}

### Steps (${steps.length})
${steps.map((s: any, i: number) =>
  `${i + 1}. ${s.contract}.${s.function}(${JSON.stringify(s.inputs || {}).slice(0, 50)})`
).join('\n')}

### Assumptions
${(path.assumptions || []).map((a: string) => `- ${a}`).join('\n') || 'None'}

### Preconditions
${(path.preconditions || []).map((p: string) => `- ${p}`).join('\n') || 'None'}`

    return {
      summary,
      shouldStoreRaw: true,
      extractedMetadata: {
        stepCount: steps.length,
        estimatedProfit: path.estimatedProfit,
        confidence: path.confidence,
      },
    }
  } catch {
    return {
      summary: raw.slice(0, 2000),
      shouldStoreRaw: true,
      extractedMetadata: {},
    }
  }
}

// ============================================================================
// FORGE LOGS REDUCER
// ============================================================================

export function reduceForgeLogs(raw: string): ReducerResult {
  const lines = raw.split('\n')

  // Extract key info
  const testResults: { name: string; status: string; duration?: string }[] = []
  const reverts: string[] = []
  const profits: string[] = []
  const errors: string[] = []

  let totalTests = 0
  let passed = 0
  let failed = 0

  for (const line of lines) {
    // Test results
    const testMatch = line.match(/\[(PASS|FAIL)\]\s+(.+?)\s+\((\d+(?:\.\d+)?m?s)\)/)
    if (testMatch) {
      totalTests++
      if (testMatch[1] === 'PASS') passed++
      else failed++
      testResults.push({
        name: testMatch[2],
        status: testMatch[1],
        duration: testMatch[3],
      })
    }

    // Revert reasons
    if (line.includes('revert') || line.includes('Revert')) {
      reverts.push(line.trim())
    }

    // Profit logs
    if (line.includes('profit') || line.includes('Profit') || line.includes('extracted')) {
      profits.push(line.trim())
    }

    // Errors
    if (line.includes('Error') || line.includes('error:')) {
      errors.push(line.trim())
    }
  }

  const summary = `## Forge Test Results

Total: ${totalTests} | Passed: ${passed} | Failed: ${failed}

### Test Results
${testResults.slice(0, 20).map(t => `- [${t.status}] ${t.name} (${t.duration})`).join('\n')}
${testResults.length > 20 ? `... and ${testResults.length - 20} more` : ''}

### Reverts (${reverts.length})
${reverts.slice(0, 5).map(r => `- ${r.slice(0, 100)}`).join('\n')}
${reverts.length > 5 ? `... and ${reverts.length - 5} more` : ''}

### Profits
${profits.slice(0, 5).map(p => `- ${p}`).join('\n') || 'None detected'}

### Errors (${errors.length})
${errors.slice(0, 5).map(e => `- ${e.slice(0, 100)}`).join('\n')}
${errors.length > 5 ? `... and ${errors.length - 5} more` : ''}`

  return {
    summary,
    shouldStoreRaw: true,
    extractedMetadata: {
      totalTests,
      passed,
      failed,
      revertCount: reverts.length,
      errorCount: errors.length,
    },
  }
}

// ============================================================================
// ADDRESS LIST REDUCER
// ============================================================================

export function reduceAddressList(raw: string): ReducerResult {
  try {
    const addresses = JSON.parse(raw)

    if (!Array.isArray(addresses)) {
      return {
        summary: raw.slice(0, 1000),
        shouldStoreRaw: true,
        extractedMetadata: {},
      }
    }

    const byCategory: Record<string, any[]> = {}
    let valueHolding = 0

    for (const addr of addresses) {
      const cat = addr.category || 'unknown'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(addr)
      if (addr.holdsValue) valueHolding++
    }

    const summary = `## Addresses (${addresses.length} total, ${valueHolding} value-holding)

${Object.entries(byCategory).map(([cat, addrs]) =>
`### ${cat} (${addrs.length})
${addrs.slice(0, 5).map((a: any) =>
  `- ${a.address?.slice(0, 10)}...${a.address?.slice(-6)} ${a.name || ''} ${a.holdsValue ? '[VALUE]' : ''}`
).join('\n')}
${addrs.length > 5 ? `... and ${addrs.length - 5} more` : ''}`
).join('\n\n')}`

    return {
      summary,
      shouldStoreRaw: true,
      extractedMetadata: {
        totalAddresses: addresses.length,
        valueHolding,
        byCategory: Object.fromEntries(
          Object.entries(byCategory).map(([k, v]) => [k, v.length])
        ),
      },
    }
  } catch {
    return {
      summary: raw.slice(0, 1000),
      shouldStoreRaw: true,
      extractedMetadata: {},
    }
  }
}

// ============================================================================
// GENERIC REDUCER (first/last window + size)
// ============================================================================

export function reduceGeneric(raw: string, maxLength = 2000): ReducerResult {
  if (raw.length <= maxLength) {
    return {
      summary: raw,
      shouldStoreRaw: false,
      extractedMetadata: { originalLength: raw.length },
    }
  }

  const halfWindow = Math.floor((maxLength - 50) / 2)
  const summary = `${raw.slice(0, halfWindow)}\n\n... [${raw.length - maxLength} chars omitted] ...\n\n${raw.slice(-halfWindow)}`

  return {
    summary,
    shouldStoreRaw: true,
    extractedMetadata: { originalLength: raw.length },
  }
}

// ============================================================================
// REDUCER DISPATCHER
// ============================================================================

export function reduceByKind(kind: string, raw: string): ReducerResult {
  switch (kind) {
    case 'source':
      return reduceSourceCode(raw)
    case 'abi':
      return reduceABI(raw)
    case 'graph':
      return reduceGraph(raw)
    case 'invariant':
      return reduceInvariants(raw)
    case 'path':
    case 'hypothesis':
      return reducePath(raw)
    case 'forge_output':
    case 'execution':
      return reduceForgeLogs(raw)
    case 'contract_outline':
      return reduceSourceCode(raw)
    default:
      return reduceGeneric(raw)
  }
}
```

---

## Dedup & Novelty Scoring

### Location: `packages/tools/src/exploit-research/dedup.ts`

```typescript
import { cosineSimilarity } from "@supermemory/lib/similarity"

export interface DedupResult {
  isDuplicate: boolean
  maxSimilarity: number
  duplicateOf: string | null
  noveltyScore: number
}

export interface DedupConfig {
  duplicateThreshold: number      // Default: 0.92
  similarityThreshold: number     // Default: 0.85
  noveltyPenalties: Record<string, number>
}

const DEFAULT_CONFIG: DedupConfig = {
  duplicateThreshold: 0.92,
  similarityThreshold: 0.85,
  noveltyPenalties: {
    // Penalize overused attack patterns
    'first_depositor': 0.3,
    'simple_mev': 0.25,
    'basic_flash_loan': 0.2,
    'oracle_manipulation': 0.15,
    'reentrancy': 0.1,
  },
}

/**
 * Check if an embedding represents a duplicate within existing embeddings
 */
export function checkDuplicate(
  newEmbedding: number[],
  existingEmbeddings: Array<{ id: string; embedding: number[]; metadata?: Record<string, unknown> }>,
  config: Partial<DedupConfig> = {}
): DedupResult {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  let maxSimilarity = 0
  let duplicateOf: string | null = null

  for (const existing of existingEmbeddings) {
    const similarity = cosineSimilarity(newEmbedding, existing.embedding)
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
      duplicateOf = existing.id
    }
  }

  const isDuplicate = maxSimilarity >= cfg.duplicateThreshold

  return {
    isDuplicate,
    maxSimilarity,
    duplicateOf: isDuplicate ? duplicateOf : null,
    noveltyScore: 1 - maxSimilarity,
  }
}

/**
 * Calculate novelty score with pattern penalties
 */
export function calculateNoveltyScore(
  embedding: number[],
  existingEmbeddings: Array<{ id: string; embedding: number[]; metadata?: Record<string, unknown> }>,
  category: string | null,
  config: Partial<DedupConfig> = {}
): number {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Base novelty from max similarity
  let maxSimilarity = 0
  for (const existing of existingEmbeddings) {
    const similarity = cosineSimilarity(embedding, existing.embedding)
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
    }
  }

  let noveltyScore = 1 - maxSimilarity

  // Apply category penalty
  if (category && cfg.noveltyPenalties[category]) {
    noveltyScore *= (1 - cfg.noveltyPenalties[category])
  }

  // Count similar existing patterns and reduce novelty
  const similarCount = existingEmbeddings.filter(
    e => cosineSimilarity(embedding, e.embedding) > cfg.similarityThreshold
  ).length

  if (similarCount > 0) {
    noveltyScore *= Math.pow(0.9, similarCount)
  }

  return Math.max(0, Math.min(1, noveltyScore))
}

/**
 * Filter duplicates from a batch of candidates
 */
export function filterDuplicates<T extends { embedding: number[] }>(
  candidates: T[],
  existingEmbeddings: Array<{ id: string; embedding: number[] }>,
  config: Partial<DedupConfig> = {}
): Array<T & { noveltyScore: number }> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const results: Array<T & { noveltyScore: number }> = []
  const seenEmbeddings: Array<{ id: string; embedding: number[] }> = [...existingEmbeddings]

  for (const candidate of candidates) {
    const dedup = checkDuplicate(candidate.embedding, seenEmbeddings, cfg)

    if (!dedup.isDuplicate) {
      results.push({
        ...candidate,
        noveltyScore: dedup.noveltyScore,
      })

      // Add to seen for intra-batch dedup
      seenEmbeddings.push({
        id: `new-${results.length}`,
        embedding: candidate.embedding,
      })
    }
  }

  return results
}
```

---

## Middleware Integration

### Location: `packages/tools/src/exploit-research/middleware.ts`

```typescript
/**
 * Middleware for intercepting tool calls and storing to Supermemory
 */

import { reduceByKind } from "./reducers"
import type { Phase, ArtifactKind } from "@supermemory/validation/exploit-research-schemas"

export interface ToolCallContext {
  protocolId: string
  seasonId: string
  phase: Phase
}

export interface MiddlewareConfig {
  apiKey: string
  baseUrl?: string
  verbose?: boolean
  autoEmbed?: boolean
}

/**
 * Create middleware that intercepts tool outputs and stores them
 */
export function createExploitResearchMiddleware(config: MiddlewareConfig) {
  const log = config.verbose ? console.log : () => {}

  return {
    /**
     * Wrap a tool executor to automatically store outputs
     */
    wrapToolExecutor<TInput, TOutput>(
      toolName: string,
      artifactKind: ArtifactKind,
      executor: (input: TInput) => Promise<TOutput>,
      options?: {
        extractTarget?: (input: TInput) => { contract?: string; function?: string }
        shouldReduce?: boolean
      }
    ) {
      return async (input: TInput, context: ToolCallContext): Promise<TOutput> => {
        const startTime = Date.now()
        const toolCallId = `${context.seasonId}:tool-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

        try {
          log(`[${toolName}] Executing...`)
          const result = await executor(input)
          const duration = Date.now() - startTime

          // Convert result to string for storage
          const rawOutput = typeof result === 'string' ? result : JSON.stringify(result)

          // Apply reducer
          const reduced = options?.shouldReduce !== false
            ? reduceByKind(artifactKind, rawOutput)
            : { summary: rawOutput, shouldStoreRaw: true, extractedMetadata: {} }

          // Extract target info
          const target = options?.extractTarget?.(input) || {}

          // Store the event
          await storeToolEvent({
            protocolId: context.protocolId,
            seasonId: context.seasonId,
            phase: context.phase,
            toolName,
            toolCallId,
            targetContract: target.contract,
            targetFunction: target.function,
            success: true,
            duration,
            rawContent: reduced.shouldStoreRaw ? rawOutput : undefined,
            summaryContent: reduced.summary,
            metadata: reduced.extractedMetadata,
          }, config)

          log(`[${toolName}] Completed in ${duration}ms`)

          return result
        } catch (error) {
          const duration = Date.now() - startTime

          // Store failure event
          await storeToolEvent({
            protocolId: context.protocolId,
            seasonId: context.seasonId,
            phase: context.phase,
            toolName,
            toolCallId,
            success: false,
            duration,
            metadata: {
              error: error instanceof Error ? error.message : String(error),
            },
          }, config)

          throw error
        }
      }
    },

    /**
     * Build prompt from Supermemory instead of chat history
     */
    async buildPromptFromMemory(
      context: ToolCallContext,
      options: {
        includeInvariants?: number  // top-k
        includePaths?: number
        includeTests?: number
        includeQuestions?: number
        contractFocus?: string
        query?: string
      }
    ): Promise<string> {
      const sections: string[] = []

      // Fetch season status
      const season = await fetchSeasonStatus(context.seasonId, config)
      if (season) {
        sections.push(`## Season Status
Protocol: ${context.protocolId}
Season: ${context.seasonId}
Phase: ${context.phase}
Coverage: ${JSON.stringify(season.coverage)}`)
      }

      // Fetch relevant invariants
      if (options.includeInvariants) {
        const invariants = await retrieveArtifacts({
          protocolId: context.protocolId,
          seasonId: context.seasonId,
          query: options.query || 'security vulnerability invariant',
          filters: { kind: 'invariant' },
          limit: options.includeInvariants,
        }, config)

        if (invariants.length > 0) {
          sections.push(`## Relevant Invariants (${invariants.length})
${invariants.map(inv => inv.summary).join('\n\n')}`)
        }
      }

      // Fetch relevant paths
      if (options.includePaths) {
        const paths = await retrieveArtifacts({
          protocolId: context.protocolId,
          seasonId: context.seasonId,
          query: options.query || 'exploit path attack vector',
          filters: { kind: 'path' },
          limit: options.includePaths,
        }, config)

        if (paths.length > 0) {
          sections.push(`## Relevant Paths (${paths.length})
${paths.map(p => p.summary).join('\n\n')}`)
        }
      }

      // Fetch recent test results
      if (options.includeTests) {
        const tests = await retrieveArtifacts({
          protocolId: context.protocolId,
          seasonId: context.seasonId,
          query: 'test execution result',
          filters: { kind: 'execution' },
          limit: options.includeTests,
        }, config)

        if (tests.length > 0) {
          sections.push(`## Recent Test Results (${tests.length})
${tests.map(t => t.summary).join('\n\n')}`)
        }
      }

      // Contract-specific context
      if (options.contractFocus) {
        const contractContext = await retrieveArtifacts({
          protocolId: context.protocolId,
          seasonId: context.seasonId,
          query: options.contractFocus,
          filters: { contract: options.contractFocus },
          limit: 5,
        }, config)

        if (contractContext.length > 0) {
          sections.push(`## Contract Focus: ${options.contractFocus}
${contractContext.map(c => c.summary).join('\n\n')}`)
        }
      }

      return sections.join('\n\n---\n\n')
    },

    /**
     * Record feedback from test execution
     */
    async recordTestFeedback(
      testId: string,
      result: {
        status: 'pass' | 'fail' | 'flaky' | 'inconclusive'
        profit?: number
        revertReason?: string
        failureDetails?: string
        forgeLogsContent?: string
      },
      linkedIds: {
        pathId?: string
        scenarioId?: string
        invariantIds?: string[]
      },
      context: ToolCallContext
    ): Promise<void> {
      await recordFeedback({
        protocolId: context.protocolId,
        seasonId: context.seasonId,
        testId,
        ...result,
        linkedPathId: linkedIds.pathId,
        linkedScenarioId: linkedIds.scenarioId,
        linkedInvariantIds: linkedIds.invariantIds,
      }, config)
    },

    /**
     * Check for duplicates before creating hypothesis/test
     */
    async checkDuplicate(
      kind: ArtifactKind,
      content: string,
      context: ToolCallContext,
      threshold = 0.85
    ): Promise<{ isDuplicate: boolean; duplicateOf?: string; similarity: number }> {
      const result = await checkSimilar({
        protocolId: context.protocolId,
        seasonId: context.seasonId,
        kind,
        text: content,
        threshold,
        limit: 1,
      }, config)

      return {
        isDuplicate: result.isDuplicate,
        duplicateOf: result.results[0]?.id,
        similarity: result.maxSimilarity,
      }
    },
  }
}

// Helper functions (implementations would call the actual API)
async function storeToolEvent(payload: any, config: MiddlewareConfig): Promise<void> {
  // Implementation calls POST /v5/exploit-research/log-event
}

async function fetchSeasonStatus(seasonId: string, config: MiddlewareConfig): Promise<any> {
  // Implementation calls GET /v5/exploit-research/seasons/:seasonId
}

async function retrieveArtifacts(params: any, config: MiddlewareConfig): Promise<any[]> {
  // Implementation calls POST /v5/exploit-research/retrieve
  return []
}

async function recordFeedback(payload: any, config: MiddlewareConfig): Promise<void> {
  // Implementation calls POST /v5/exploit-research/feedback
}

async function checkSimilar(params: any, config: MiddlewareConfig): Promise<any> {
  // Implementation calls POST /v5/exploit-research/similar
  return { isDuplicate: false, maxSimilarity: 0, results: [] }
}
```

---

## Testing Strategy

### Test Categories

1. **Unit Tests**: Schema validation, reducers, dedup logic
2. **Integration Tests**: API endpoints, database operations
3. **E2E Tests**: Full workflow from intake to execution
4. **Contract Tests**: API contract validation with snapshots

### Test File Structure

```
packages/
├── validation/
│   └── __tests__/
│       └── exploit-research-schemas.test.ts
├── tools/
│   └── src/
│       └── exploit-research/
│           └── __tests__/
│               ├── reducers.test.ts
│               ├── dedup.test.ts
│               ├── middleware.test.ts
│               └── integration.test.ts
└── e2e/
    └── exploit-research/
        ├── season-lifecycle.test.ts
        ├── dedup-workflow.test.ts
        ├── feedback-routing.test.ts
        └── recovery.test.ts
```

---

## Security Considerations

1. **Secret Redaction**: RPC keys, API keys must be redacted before storage
2. **Isolation Enforcement**: Hard protocol_id + season_id filters on every operation
3. **Admin Imports**: Manual approval required for cross-season imports
4. **Retention Policies**: Raw content expires after N days (configurable)
5. **Sensitive Marking**: Flag artifacts containing sensitive info

---

## Metrics to Track

1. **Tokens Saved**: Reduction ratio from reducers
2. **Retrieval Hit Rate**: Percentage of retrievals returning useful results
3. **Dedup Rejections**: Count of duplicates prevented
4. **Phase Coverage**: Progress through phases per season
5. **Execution Pass Rate**: Test success rate
6. **Novelty Distribution**: Track pattern diversity

---

## Development Workflow

1. Implement schemas in `packages/validation/exploit-research-schemas.ts`
2. Implement API schemas in `packages/validation/exploit-research-api.ts`
3. Write unit tests for schemas
4. Implement reducers in `packages/tools/src/exploit-research/reducers.ts`
5. Write unit tests for reducers
6. Implement dedup in `packages/tools/src/exploit-research/dedup.ts`
7. Write unit tests for dedup
8. Implement middleware in `packages/tools/src/exploit-research/middleware.ts`
9. Write integration tests
10. Implement API routes (backend required)
11. Write E2E tests
12. Document API with OpenAPI specs

---

## Example JSON Payloads

### log_event
```json
{
  "protocolId": "uniswap-v3",
  "seasonId": "uniswap-v3:season-20241205-abc123",
  "phase": "invariant",
  "toolName": "etherscan_fetch_source",
  "toolCallId": "call_xyz789",
  "targetContract": "0x1234...5678",
  "success": true,
  "duration": 1250,
  "rawContent": "// SPDX-License-Identifier...",
  "metadata": {
    "chain": "ethereum",
    "verified": true
  }
}
```

### store_artifact
```json
{
  "protocolId": "uniswap-v3",
  "seasonId": "uniswap-v3:season-20241205-abc123",
  "kind": "invariant",
  "raw": "{\"category\":\"arithmetic\",\"formula\":\"reserve0 * reserve1 >= k\",...}",
  "summary": "## Invariant: Constant Product\n...",
  "metadata": {
    "contract": "UniswapV3Pool",
    "severity": "critical"
  }
}
```

### retrieve
```json
{
  "protocolId": "uniswap-v3",
  "seasonId": "uniswap-v3:season-20241205-abc123",
  "query": "flash loan attack vector swap function",
  "filters": {
    "phase": "violation",
    "contract": "UniswapV3Pool"
  },
  "limit": 10,
  "includeSummary": true,
  "threshold": 0.6
}
```

### record_feedback
```json
{
  "protocolId": "uniswap-v3",
  "seasonId": "uniswap-v3:season-20241205-abc123",
  "testId": "uniswap-v3:season-20241205-abc123:test-def456",
  "status": "pass",
  "profit": 125000,
  "linkedPathId": "uniswap-v3:season-20241205-abc123:path-ghi789",
  "linkedInvariantIds": ["uniswap-v3:season-20241205-abc123:inv-arithmetic-jkl012"],
  "forgeLogsContent": "[PASS] testFlashLoanExploit (1.234s)..."
}
```
