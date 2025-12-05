# Supermemory Exploit Research Extension - Implementation TODO

## Overview

This document provides a step-by-step implementation plan for the autonomous exploit-research memory system. Each phase includes:
- Implementation tasks with file paths
- Test requirements with validation criteria
- Checkpoints to verify production-readiness

**Estimated Total Implementation: 6 Phases**

---

## Phase 1: Core Schema Implementation

### 1.1 Create Exploit Research Schemas

**File:** `packages/validation/exploit-research-schemas.ts`

#### Tasks:
- [ ] Create `PhaseEnum` with all 7 phases (intake, graphing, invariant, violation, poc_generation, execution, refinement)
- [ ] Create `SeasonStatusEnum` (created, active, paused, closed)
- [ ] Create `ArtifactKindEnum` (source, abi, graph, invariant, path, hypothesis, scenario, test, execution, log, question, forge_output, contract_outline, tool_output)
- [ ] Create `InvariantCategoryEnum` with all 17 categories
- [ ] Create `TestStatusEnum` (pending, running, pass, fail, flaky, inconclusive, error)
- [ ] Create `ExploitRelationEnum` with all 10 relation types
- [ ] Create `SeverityEnum` (critical, high, medium, low, informational)
- [ ] Create `ProtocolSchema` with all required fields
- [ ] Create `SeasonSchema` with coverage tracking and phase management
- [ ] Create `ContractSchema` with value/role classification
- [ ] Create `GraphSchema` with node/edge statistics
- [ ] Create `InvariantSchema` with formula, confidence, embeddings
- [ ] Create `PathStepSchema` for individual path steps
- [ ] Create `PathSchema` with steps, economics, dedup embeddings
- [ ] Create `ScenarioSchema` with full economics breakdown
- [ ] Create `TestSchema` with fork configuration and status
- [ ] Create `ExecutionSchema` with results and metrics
- [ ] Create `ToolEventSchema` for event logging
- [ ] Create `ArtifactSchema` for multi-granular storage
- [ ] Create `QuestionSchema` for reasoning tracking
- [ ] Create `EntityRelationSchema` for relationship tracking
- [ ] Create `FeedbackSchema` for test result routing
- [ ] Create `SeasonSnapshotSchema` for state persistence
- [ ] Export all schemas and types

#### Tests: `packages/validation/__tests__/exploit-research-schemas.test.ts`

```typescript
import { describe, it, expect } from "vitest"
import {
  ProtocolSchema,
  SeasonSchema,
  InvariantSchema,
  PathSchema,
  TestSchema,
  // ... all schemas
} from "../exploit-research-schemas"

describe("Exploit Research Schemas", () => {
  describe("ProtocolSchema", () => {
    it("should validate a complete protocol", () => {
      const valid = {
        id: "uniswap-v3",
        name: "Uniswap V3",
        chains: ["ethereum", "arbitrum"],
        type: "dex",
        valueContracts: ["0x1234..."],
        criticalFunctions: [
          { contract: "Pool", function: "swap", signature: "swap(address,bool,int256,uint160,bytes)", risk: "high" }
        ],
        seasonIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(() => ProtocolSchema.parse(valid)).not.toThrow()
    })

    it("should reject missing required fields", () => {
      const invalid = { id: "test" }
      expect(() => ProtocolSchema.parse(invalid)).toThrow()
    })
  })

  describe("SeasonSchema", () => {
    it("should validate season with default coverage", () => {
      const season = {
        id: "uniswap-v3:season-20241205-abc123",
        protocolId: "uniswap-v3",
        status: "active",
        startedAt: new Date(),
        coverage: {
          contractsAnalyzed: 5,
          functionsAnalyzed: 50,
          invariantsGenerated: 20,
          pathsExplored: 10,
          scenariosGenerated: 5,
          testsRun: 3,
          testsPassed: 2,
          testsFailed: 1,
          profitableExploits: 0,
        },
        activePhases: ["invariant", "violation"],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(() => SeasonSchema.parse(season)).not.toThrow()
    })

    it("should enforce status enum values", () => {
      expect(() => SeasonSchema.shape.status.parse("invalid")).toThrow()
      expect(() => SeasonSchema.shape.status.parse("active")).not.toThrow()
    })
  })

  describe("InvariantSchema", () => {
    it("should validate invariant with embeddings", () => {
      const invariant = {
        id: "inv-001",
        protocolId: "uniswap-v3",
        seasonId: "uniswap-v3:season-20241205-abc123",
        category: "arithmetic",
        formula: "reserve0 * reserve1 >= k",
        description: "Constant product invariant",
        variables: ["reserve0", "reserve1", "k"],
        severity: "critical",
        confidence: 0.95,
        embedding: new Array(1536).fill(0.1),
        embeddingModel: "text-embedding-3-small",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(() => InvariantSchema.parse(invariant)).not.toThrow()
    })

    it("should enforce confidence range 0-1", () => {
      expect(() => InvariantSchema.shape.confidence.parse(1.5)).toThrow()
      expect(() => InvariantSchema.shape.confidence.parse(-0.1)).toThrow()
      expect(() => InvariantSchema.shape.confidence.parse(0.5)).not.toThrow()
    })

    it("should validate all invariant categories", () => {
      const categories = [
        "access_control", "arithmetic", "reentrancy", "oracle_manipulation",
        "flash_loan", "price_manipulation", "slippage", "timestamp_dependency",
        "front_running", "governance", "liquidity", "collateral",
        "interest_rate", "liquidation", "fee_extraction", "donation_attack",
        "first_depositor", "custom"
      ]
      for (const cat of categories) {
        expect(() => InvariantSchema.shape.category.parse(cat)).not.toThrow()
      }
    })
  })

  describe("PathSchema", () => {
    it("should validate path with steps", () => {
      const path = {
        id: "path-001",
        protocolId: "uniswap-v3",
        seasonId: "uniswap-v3:season-20241205-abc123",
        violatedInvariantId: "inv-001",
        steps: [
          { contract: "Pool", function: "flash", inputs: { amount0: "1000000" } },
          { contract: "Pool", function: "swap", inputs: { zeroForOne: true } },
        ],
        estimatedProfit: 50000,
        confidence: 0.8,
        complexity: 5,
        assumptions: ["Sufficient liquidity"],
        preconditions: ["Block number > 18000000"],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(() => PathSchema.parse(path)).not.toThrow()
    })

    it("should enforce complexity range 1-10", () => {
      expect(() => PathSchema.shape.complexity.parse(0)).toThrow()
      expect(() => PathSchema.shape.complexity.parse(11)).toThrow()
      expect(() => PathSchema.shape.complexity.parse(5)).not.toThrow()
    })
  })

  describe("TestSchema", () => {
    it("should validate all test statuses", () => {
      const statuses = ["pending", "running", "pass", "fail", "flaky", "inconclusive", "error"]
      for (const status of statuses) {
        expect(() => TestSchema.shape.status.parse(status)).not.toThrow()
      }
    })
  })

  describe("ExploitRelationEnum", () => {
    it("should validate all relation types", () => {
      const relations = [
        "derived_from", "violates", "uses", "depends_on",
        "tested_by", "confirmed_by", "refutes", "updates", "extends", "derives"
      ]
      for (const rel of relations) {
        expect(() => ExploitRelationEnum.parse(rel)).not.toThrow()
      }
    })
  })
})
```

#### Validation Checkpoint 1.1:
- [ ] All 23+ schemas compile without TypeScript errors
- [ ] All enum values match specification
- [ ] All tests pass: `bun test packages/validation/__tests__/exploit-research-schemas.test.ts`
- [ ] Schema types are properly exported

---

### 1.2 Create API Schemas

**File:** `packages/validation/exploit-research-api.ts`

#### Tasks:
- [ ] Create `LogEventRequestSchema` with all required fields
- [ ] Create `LogEventResponseSchema`
- [ ] Create `StoreArtifactRequestSchema` with retention options
- [ ] Create `StoreArtifactResponseSchema`
- [ ] Create `RetrieveRequestSchema` with filters
- [ ] Create `RetrieveResultSchema` and `RetrieveResponseSchema`
- [ ] Create `SimilarRequestSchema` for dedup checks
- [ ] Create `SimilarResponseSchema` with `isDuplicate` flag
- [ ] Create `LinkRequestSchema` and `LinkResponseSchema`
- [ ] Create `RecordFeedbackRequestSchema` with linked entities
- [ ] Create `RecordFeedbackResponseSchema` with update tracking
- [ ] Create `SnapshotRequestSchema` and `SnapshotResponseSchema`
- [ ] Create `RestoreRequestSchema` and `RestoreResponseSchema`
- [ ] Create `CreateSeasonRequestSchema` and response
- [ ] Create `CloseSeasonRequestSchema` and response
- [ ] Create `ImportSummariesRequestSchema` and response (admin)
- [ ] Add OpenAPI annotations to all schemas

#### Tests: `packages/validation/__tests__/exploit-research-api.test.ts`

```typescript
import { describe, it, expect } from "vitest"
import {
  LogEventRequestSchema,
  StoreArtifactRequestSchema,
  RetrieveRequestSchema,
  SimilarRequestSchema,
  RecordFeedbackRequestSchema,
} from "../exploit-research-api"

describe("Exploit Research API Schemas", () => {
  describe("LogEventRequestSchema", () => {
    it("should validate complete log event", () => {
      const event = {
        protocolId: "uniswap-v3",
        seasonId: "uniswap-v3:season-20241205-abc123",
        phase: "invariant",
        toolName: "etherscan_fetch_source",
        toolCallId: "call_xyz789",
        success: true,
        duration: 1250,
        rawContent: "// SPDX-License-Identifier...",
      }
      expect(() => LogEventRequestSchema.parse(event)).not.toThrow()
    })

    it("should require protocolId and seasonId", () => {
      const invalid = { toolName: "test", success: true }
      expect(() => LogEventRequestSchema.parse(invalid)).toThrow()
    })
  })

  describe("RetrieveRequestSchema", () => {
    it("should validate with filters", () => {
      const request = {
        protocolId: "uniswap-v3",
        seasonId: "uniswap-v3:season-20241205-abc123",
        query: "flash loan vulnerability",
        filters: {
          phase: "violation",
          contract: "Pool",
          createdAfter: new Date("2024-12-01"),
        },
        limit: 20,
        threshold: 0.6,
      }
      expect(() => RetrieveRequestSchema.parse(request)).not.toThrow()
    })

    it("should enforce limit bounds", () => {
      expect(() => RetrieveRequestSchema.shape.limit.parse(0)).toThrow()
      expect(() => RetrieveRequestSchema.shape.limit.parse(101)).toThrow()
      expect(() => RetrieveRequestSchema.shape.limit.parse(50)).not.toThrow()
    })

    it("should enforce threshold bounds", () => {
      expect(() => RetrieveRequestSchema.shape.threshold.parse(-0.1)).toThrow()
      expect(() => RetrieveRequestSchema.shape.threshold.parse(1.1)).toThrow()
    })
  })

  describe("SimilarRequestSchema", () => {
    it("should accept text for dedup check", () => {
      const request = {
        protocolId: "uniswap-v3",
        seasonId: "uniswap-v3:season-20241205-abc123",
        kind: "hypothesis",
        text: "Flash loan attack on swap function",
        threshold: 0.85,
      }
      expect(() => SimilarRequestSchema.parse(request)).not.toThrow()
    })

    it("should accept embedding for dedup check", () => {
      const request = {
        protocolId: "uniswap-v3",
        seasonId: "uniswap-v3:season-20241205-abc123",
        kind: "test",
        embedding: new Array(1536).fill(0.1),
        threshold: 0.9,
      }
      expect(() => SimilarRequestSchema.parse(request)).not.toThrow()
    })
  })

  describe("RecordFeedbackRequestSchema", () => {
    it("should validate complete feedback", () => {
      const feedback = {
        protocolId: "uniswap-v3",
        seasonId: "uniswap-v3:season-20241205-abc123",
        testId: "test-001",
        status: "pass",
        profit: 125000,
        linkedPathId: "path-001",
        linkedInvariantIds: ["inv-001", "inv-002"],
        forgeLogsContent: "[PASS] testExploit (1.5s)",
      }
      expect(() => RecordFeedbackRequestSchema.parse(feedback)).not.toThrow()
    })
  })
})
```

#### Validation Checkpoint 1.2:
- [ ] All API schemas compile without errors
- [ ] OpenAPI annotations generate valid documentation
- [ ] All tests pass: `bun test packages/validation/__tests__/exploit-research-api.test.ts`
- [ ] Request/Response pairs are consistent

---

## Phase 2: Reducer Implementation

### 2.1 Implement Content Reducers

**File:** `packages/tools/src/exploit-research/reducers.ts`

#### Tasks:
- [ ] Implement `reduceSourceCode()` - Extract functions, state vars, modifiers, requires
- [ ] Implement `reduceABI()` - Categorize functions (read/write), extract events/errors
- [ ] Implement `reduceGraph()` - Summarize node/edge counts, extract critical nodes
- [ ] Implement `reduceInvariants()` - Group by category, show formula/confidence
- [ ] Implement `reducePath()` - Format steps, assumptions, preconditions
- [ ] Implement `reduceForgeLogs()` - Extract pass/fail counts, reverts, profits
- [ ] Implement `reduceAddressList()` - Categorize addresses, highlight value-holding
- [ ] Implement `reduceGeneric()` - First/last window with size marker
- [ ] Implement `reduceByKind()` - Dispatcher to appropriate reducer
- [ ] Add type definitions for `ReducerResult`

#### Tests: `packages/tools/src/exploit-research/__tests__/reducers.test.ts`

```typescript
import { describe, it, expect } from "vitest"
import {
  reduceSourceCode,
  reduceABI,
  reduceGraph,
  reduceInvariants,
  reducePath,
  reduceForgeLogs,
  reduceAddressList,
  reduceGeneric,
  reduceByKind,
} from "../reducers"

describe("Reducers", () => {
  describe("reduceSourceCode", () => {
    it("should extract function signatures", () => {
      const source = `
        contract Pool {
          mapping(address => uint256) public balances;
          uint256 public totalSupply;

          function deposit(uint256 amount) external {
            require(amount > 0, "Invalid amount");
            balances[msg.sender] += amount;
          }

          function withdraw(uint256 amount) external {
            require(balances[msg.sender] >= amount, "Insufficient");
            balances[msg.sender] -= amount;
          }
        }
      `
      const result = reduceSourceCode(source)

      expect(result.summary).toContain("deposit")
      expect(result.summary).toContain("withdraw")
      expect(result.summary).toContain("State Variables")
      expect(result.summary).toContain("Security Checks")
      expect(result.extractedMetadata.functionCount).toBe(2)
      expect(result.extractedMetadata.requireCount).toBe(2)
      expect(result.shouldStoreRaw).toBe(true)
    })

    it("should limit output for large contracts", () => {
      const largeFunctions = Array(100).fill(0)
        .map((_, i) => `function fn${i}(uint256 x) public { }`)
        .join('\n')
      const source = `contract Large { ${largeFunctions} }`
      const result = reduceSourceCode(source)

      expect(result.summary).toContain("... and")
      expect(result.summary.length).toBeLessThan(source.length)
    })
  })

  describe("reduceABI", () => {
    it("should categorize functions correctly", () => {
      const abi = JSON.stringify([
        { type: "function", name: "deposit", stateMutability: "payable", inputs: [] },
        { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [] },
        { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address", name: "account" }] },
        { type: "event", name: "Transfer" },
        { type: "error", name: "InsufficientBalance" },
      ])
      const result = reduceABI(abi)

      expect(result.summary).toContain("Write Functions (2)")
      expect(result.summary).toContain("Read Functions (1)")
      expect(result.summary).toContain("Events (1)")
      expect(result.summary).toContain("Errors (1)")
      expect(result.extractedMetadata.writeFunctions).toBe(2)
      expect(result.extractedMetadata.readFunctions).toBe(1)
    })

    it("should handle invalid JSON gracefully", () => {
      const result = reduceABI("not valid json")
      expect(result.summary).toContain("Invalid ABI")
      expect(result.extractedMetadata.parseError).toBe(true)
    })
  })

  describe("reduceGraph", () => {
    it("should extract critical nodes", () => {
      const graph = JSON.stringify({
        nodes: [
          { contract: "Pool", function: "swap", holdsValue: true, risk: "high" },
          { contract: "Pool", function: "deposit", holdsValue: true },
          { contract: "Router", function: "route", isEntryPoint: true },
          { contract: "Oracle", function: "getPrice", risk: "medium" },
        ],
        edges: [
          { from: "Router.route", to: "Pool.swap" },
          { from: "Pool.swap", to: "Oracle.getPrice" },
        ],
      })
      const result = reduceGraph(graph)

      expect(result.summary).toContain("Nodes: 4")
      expect(result.summary).toContain("Edges: 2")
      expect(result.summary).toContain("Critical Nodes")
      expect(result.extractedMetadata.nodeCount).toBe(4)
      expect(result.extractedMetadata.edgeCount).toBe(2)
    })
  })

  describe("reduceInvariants", () => {
    it("should group by category", () => {
      const invariants = JSON.stringify([
        { category: "arithmetic", formula: "x + y >= z", severity: "high", confidence: 0.9 },
        { category: "arithmetic", formula: "a * b == c", severity: "medium", confidence: 0.8 },
        { category: "access_control", formula: "onlyOwner", severity: "critical", confidence: 0.95 },
      ])
      const result = reduceInvariants(invariants)

      expect(result.summary).toContain("arithmetic (2)")
      expect(result.summary).toContain("access_control (1)")
      expect(result.extractedMetadata.totalInvariants).toBe(3)
      expect(result.extractedMetadata.byCategory.arithmetic).toBe(2)
    })
  })

  describe("reduceForgeLogs", () => {
    it("should extract test results", () => {
      const logs = `
        Running 3 tests for test/Exploit.t.sol
        [PASS] testFlashLoan (1.234s)
        [FAIL] testReentrancy (0.567s)
        [PASS] testOracle (2.345s)

        Error: Revert: insufficient liquidity
        Profit extracted: 50000 USDC
      `
      const result = reduceForgeLogs(logs)

      expect(result.summary).toContain("Total: 3")
      expect(result.summary).toContain("Passed: 2")
      expect(result.summary).toContain("Failed: 1")
      expect(result.summary).toContain("Reverts")
      expect(result.summary).toContain("Profits")
      expect(result.extractedMetadata.totalTests).toBe(3)
      expect(result.extractedMetadata.passed).toBe(2)
      expect(result.extractedMetadata.failed).toBe(1)
    })
  })

  describe("reduceGeneric", () => {
    it("should truncate long content with markers", () => {
      const longContent = "x".repeat(5000)
      const result = reduceGeneric(longContent, 2000)

      expect(result.summary.length).toBeLessThan(longContent.length)
      expect(result.summary).toContain("chars omitted")
      expect(result.shouldStoreRaw).toBe(true)
    })

    it("should not truncate short content", () => {
      const shortContent = "short content"
      const result = reduceGeneric(shortContent, 2000)

      expect(result.summary).toBe(shortContent)
      expect(result.shouldStoreRaw).toBe(false)
    })
  })

  describe("reduceByKind", () => {
    it("should dispatch to correct reducer", () => {
      const sourceResult = reduceByKind("source", "function test() {}")
      expect(sourceResult.summary).toContain("Functions")

      const genericResult = reduceByKind("unknown", "some content")
      expect(genericResult.summary).toBe("some content")
    })
  })
})
```

#### Validation Checkpoint 2.1:
- [ ] All reducers compile without errors
- [ ] Each reducer handles edge cases (empty input, malformed data)
- [ ] Reduction ratios > 50% for typical inputs
- [ ] All tests pass: `bun test packages/tools/src/exploit-research/__tests__/reducers.test.ts`
- [ ] Performance: reducers complete in < 100ms for typical inputs

---

## Phase 3: Dedup & Novelty Implementation

### 3.1 Implement Dedup Logic

**File:** `packages/tools/src/exploit-research/dedup.ts`

#### Tasks:
- [ ] Define `DedupResult` interface
- [ ] Define `DedupConfig` with thresholds and penalties
- [ ] Implement `checkDuplicate()` - Single embedding vs existing
- [ ] Implement `calculateNoveltyScore()` - With category penalties
- [ ] Implement `filterDuplicates()` - Batch filtering with intra-batch dedup
- [ ] Add default penalties for common attack patterns
- [ ] Add configurable thresholds

#### Tests: `packages/tools/src/exploit-research/__tests__/dedup.test.ts`

```typescript
import { describe, it, expect } from "vitest"
import {
  checkDuplicate,
  calculateNoveltyScore,
  filterDuplicates,
  type DedupConfig,
} from "../dedup"

describe("Dedup & Novelty", () => {
  // Helper to create a random-ish embedding
  const createEmbedding = (seed: number, dim = 1536): number[] => {
    const embedding = []
    for (let i = 0; i < dim; i++) {
      embedding.push(Math.sin(seed * (i + 1)) * 0.1)
    }
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0))
    return embedding.map(x => x / norm)
  }

  // Helper to create similar embedding
  const createSimilarEmbedding = (base: number[], noise = 0.05): number[] => {
    const noisy = base.map(x => x + (Math.random() - 0.5) * noise)
    const norm = Math.sqrt(noisy.reduce((sum, x) => sum + x * x, 0))
    return noisy.map(x => x / norm)
  }

  describe("checkDuplicate", () => {
    it("should detect exact duplicates", () => {
      const embedding = createEmbedding(1)
      const existing = [{ id: "existing-1", embedding }]

      const result = checkDuplicate(embedding, existing)

      expect(result.isDuplicate).toBe(true)
      expect(result.maxSimilarity).toBeCloseTo(1.0, 2)
      expect(result.duplicateOf).toBe("existing-1")
    })

    it("should detect near-duplicates above threshold", () => {
      const base = createEmbedding(1)
      const similar = createSimilarEmbedding(base, 0.02)
      const existing = [{ id: "existing-1", embedding: base }]

      const result = checkDuplicate(similar, existing, { duplicateThreshold: 0.95 })

      expect(result.isDuplicate).toBe(true)
      expect(result.maxSimilarity).toBeGreaterThan(0.95)
    })

    it("should not flag different embeddings as duplicates", () => {
      const embedding1 = createEmbedding(1)
      const embedding2 = createEmbedding(100)
      const existing = [{ id: "existing-1", embedding: embedding1 }]

      const result = checkDuplicate(embedding2, existing)

      expect(result.isDuplicate).toBe(false)
      expect(result.maxSimilarity).toBeLessThan(0.5)
      expect(result.duplicateOf).toBeNull()
    })

    it("should handle empty existing array", () => {
      const embedding = createEmbedding(1)

      const result = checkDuplicate(embedding, [])

      expect(result.isDuplicate).toBe(false)
      expect(result.maxSimilarity).toBe(0)
      expect(result.noveltyScore).toBe(1)
    })
  })

  describe("calculateNoveltyScore", () => {
    it("should penalize overused patterns", () => {
      const embedding = createEmbedding(1)

      const scoreWithPenalty = calculateNoveltyScore(
        embedding, [], "first_depositor"
      )
      const scoreWithoutPenalty = calculateNoveltyScore(
        embedding, [], "custom"
      )

      expect(scoreWithPenalty).toBeLessThan(scoreWithoutPenalty)
    })

    it("should reduce novelty for similar existing patterns", () => {
      const base = createEmbedding(1)
      const similar1 = createSimilarEmbedding(base, 0.1)
      const similar2 = createSimilarEmbedding(base, 0.1)
      const newEmbedding = createSimilarEmbedding(base, 0.1)

      const existingNone = calculateNoveltyScore(newEmbedding, [], null)
      const existingOne = calculateNoveltyScore(
        newEmbedding,
        [{ id: "1", embedding: similar1 }],
        null
      )
      const existingTwo = calculateNoveltyScore(
        newEmbedding,
        [{ id: "1", embedding: similar1 }, { id: "2", embedding: similar2 }],
        null
      )

      expect(existingTwo).toBeLessThan(existingOne)
      expect(existingOne).toBeLessThan(existingNone)
    })

    it("should return score between 0 and 1", () => {
      const embedding = createEmbedding(1)
      const existing = Array(10).fill(0).map((_, i) => ({
        id: `existing-${i}`,
        embedding: createEmbedding(i + 2),
      }))

      const score = calculateNoveltyScore(embedding, existing, "first_depositor")

      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    })
  })

  describe("filterDuplicates", () => {
    it("should remove duplicates from batch", () => {
      const base = createEmbedding(1)
      const candidates = [
        { id: "c1", embedding: createEmbedding(1) },
        { id: "c2", embedding: createSimilarEmbedding(base, 0.01) }, // Duplicate of c1
        { id: "c3", embedding: createEmbedding(50) }, // Different
        { id: "c4", embedding: createSimilarEmbedding(base, 0.01) }, // Duplicate of c1
      ]

      const filtered = filterDuplicates(candidates, [])

      expect(filtered.length).toBeLessThan(candidates.length)
      expect(filtered.every(c => c.noveltyScore !== undefined)).toBe(true)
    })

    it("should also check against existing embeddings", () => {
      const existingEmbedding = createEmbedding(1)
      const existing = [{ id: "existing-1", embedding: existingEmbedding }]

      const candidates = [
        { id: "c1", embedding: createSimilarEmbedding(existingEmbedding, 0.01) }, // Dup of existing
        { id: "c2", embedding: createEmbedding(100) }, // Different
      ]

      const filtered = filterDuplicates(candidates, existing)

      expect(filtered.length).toBe(1)
      expect(filtered[0].id).toBe("c2")
    })

    it("should include novelty scores in results", () => {
      const candidates = [
        { id: "c1", embedding: createEmbedding(1) },
        { id: "c2", embedding: createEmbedding(2) },
      ]

      const filtered = filterDuplicates(candidates, [])

      for (const result of filtered) {
        expect(typeof result.noveltyScore).toBe("number")
        expect(result.noveltyScore).toBeGreaterThanOrEqual(0)
        expect(result.noveltyScore).toBeLessThanOrEqual(1)
      }
    })
  })
})
```

#### Validation Checkpoint 3.1:
- [ ] Dedup correctly identifies duplicates at 0.92 threshold
- [ ] Novelty penalties work for all configured categories
- [ ] Batch dedup prevents intra-batch duplicates
- [ ] All tests pass: `bun test packages/tools/src/exploit-research/__tests__/dedup.test.ts`
- [ ] Performance: < 50ms for 100 candidate checks

---

## Phase 4: Middleware Implementation

### 4.1 Implement Middleware

**File:** `packages/tools/src/exploit-research/middleware.ts`

#### Tasks:
- [ ] Define `ToolCallContext` interface
- [ ] Define `MiddlewareConfig` interface
- [ ] Implement `createExploitResearchMiddleware()` factory
- [ ] Implement `wrapToolExecutor()` - Intercepts tool calls, stores results
- [ ] Implement `buildPromptFromMemory()` - Retrieval-first prompt building
- [ ] Implement `recordTestFeedback()` - Routes feedback to linked entities
- [ ] Implement `checkDuplicate()` - Pre-creation dedup check
- [ ] Add helper functions for API calls
- [ ] Add error handling and retry logic

#### Tests: `packages/tools/src/exploit-research/__tests__/middleware.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createExploitResearchMiddleware } from "../middleware"

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("Middleware", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  const config = {
    apiKey: "test-api-key",
    baseUrl: "https://api.test.com",
    verbose: false,
  }

  const context = {
    protocolId: "uniswap-v3",
    seasonId: "uniswap-v3:season-20241205-abc123",
    phase: "invariant" as const,
  }

  describe("wrapToolExecutor", () => {
    it("should wrap tool and store success result", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "event-123" }),
      })

      const middleware = createExploitResearchMiddleware(config)
      const mockExecutor = vi.fn().mockResolvedValue("tool output")

      const wrapped = middleware.wrapToolExecutor(
        "test_tool",
        "source",
        mockExecutor
      )

      const result = await wrapped({ input: "test" }, context)

      expect(result).toBe("tool output")
      expect(mockExecutor).toHaveBeenCalledWith({ input: "test" })
      expect(mockFetch).toHaveBeenCalled()

      // Verify the stored event
      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.protocolId).toBe("uniswap-v3")
      expect(body.seasonId).toBe(context.seasonId)
      expect(body.toolName).toBe("test_tool")
      expect(body.success).toBe(true)
    })

    it("should store failure event on error", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "event-123" }),
      })

      const middleware = createExploitResearchMiddleware(config)
      const mockExecutor = vi.fn().mockRejectedValue(new Error("Tool failed"))

      const wrapped = middleware.wrapToolExecutor(
        "failing_tool",
        "source",
        mockExecutor
      )

      await expect(wrapped({ input: "test" }, context)).rejects.toThrow("Tool failed")

      // Verify failure was stored
      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.success).toBe(false)
      expect(body.metadata.error).toBe("Tool failed")
    })

    it("should apply reducer to output", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "event-123" }),
      })

      const middleware = createExploitResearchMiddleware(config)
      const sourceCode = `
        contract Test {
          function deposit() public {}
          function withdraw() public {}
        }
      `
      const mockExecutor = vi.fn().mockResolvedValue(sourceCode)

      const wrapped = middleware.wrapToolExecutor(
        "fetch_source",
        "source",
        mockExecutor,
        { shouldReduce: true }
      )

      await wrapped({}, context)

      // Verify reduced content was stored
      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.summaryContent).toContain("Functions")
      expect(body.summaryContent.length).toBeLessThan(sourceCode.length * 2)
    })
  })

  describe("checkDuplicate", () => {
    it("should call similar API and return result", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          isDuplicate: true,
          maxSimilarity: 0.95,
          results: [{ id: "existing-123", similarity: 0.95 }],
        }),
      })

      const middleware = createExploitResearchMiddleware(config)

      const result = await middleware.checkDuplicate(
        "hypothesis",
        "Flash loan attack on swap",
        context
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.duplicateOf).toBe("existing-123")
      expect(result.similarity).toBe(0.95)
    })
  })

  describe("buildPromptFromMemory", () => {
    it("should fetch and format memory sections", async () => {
      mockFetch
        // Season status
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: context.seasonId,
            coverage: { invariantsGenerated: 10, pathsExplored: 5 },
          }),
        })
        // Invariants
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [
              { id: "inv-1", summary: "Invariant 1 summary" },
              { id: "inv-2", summary: "Invariant 2 summary" },
            ],
          }),
        })
        // Paths
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [{ id: "path-1", summary: "Path 1 summary" }],
          }),
        })

      const middleware = createExploitResearchMiddleware(config)

      const prompt = await middleware.buildPromptFromMemory(context, {
        includeInvariants: 5,
        includePaths: 3,
      })

      expect(prompt).toContain("Season Status")
      expect(prompt).toContain("Relevant Invariants")
      expect(prompt).toContain("Invariant 1 summary")
      expect(prompt).toContain("Relevant Paths")
    })
  })

  describe("recordTestFeedback", () => {
    it("should call feedback API with linked entities", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "feedback-123",
          updatedEntities: [
            { id: "path-1", type: "path", field: "confirmedCount", oldValue: 0, newValue: 1 },
          ],
        }),
      })

      const middleware = createExploitResearchMiddleware(config)

      await middleware.recordTestFeedback(
        "test-123",
        { status: "pass", profit: 50000 },
        { pathId: "path-1", invariantIds: ["inv-1"] },
        context
      )

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.testId).toBe("test-123")
      expect(body.status).toBe("pass")
      expect(body.profit).toBe(50000)
      expect(body.linkedPathId).toBe("path-1")
      expect(body.linkedInvariantIds).toContain("inv-1")
    })
  })
})
```

#### Validation Checkpoint 4.1:
- [ ] Middleware compiles without errors
- [ ] Tool wrapping captures all outputs and stores correctly
- [ ] Prompt building retrieves relevant context
- [ ] Feedback routing updates linked entities
- [ ] All tests pass: `bun test packages/tools/src/exploit-research/__tests__/middleware.test.ts`

---

## Phase 5: Integration Tests

### 5.1 End-to-End Workflow Tests

**File:** `packages/tools/src/exploit-research/__tests__/integration.test.ts`

#### Tasks:
- [ ] Test full season lifecycle (create → active → closed)
- [ ] Test dedup workflow (create hypothesis → check duplicate → reject/accept)
- [ ] Test feedback routing (test pass → update path → update invariant)
- [ ] Test snapshot/restore (create snapshot → close season → restore)
- [ ] Test reset recovery (simulate overflow → rebuild from memory)
- [ ] Test cross-season import (closed season → import to new season)

#### Tests:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createExploitResearchMiddleware } from "../middleware"

// These tests require a running Supermemory instance
// Skip in CI unless SUPERMEMORY_API_KEY is set
const runIntegration = !!process.env.SUPERMEMORY_API_KEY

describe.skipIf(!runIntegration)("Integration Tests", () => {
  const config = {
    apiKey: process.env.SUPERMEMORY_API_KEY!,
    baseUrl: process.env.SUPERMEMORY_BASE_URL,
    verbose: true,
  }

  let seasonId: string
  const protocolId = `test-protocol-${Date.now()}`

  describe("Season Lifecycle", () => {
    it("should create a new season", async () => {
      const response = await fetch(`${config.baseUrl}/v5/exploit-research/seasons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ protocolId }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.id).toMatch(new RegExp(`^${protocolId}:season-`))
      expect(data.status).toBe("active")
      seasonId = data.id
    })

    it("should store and retrieve artifacts", async () => {
      const middleware = createExploitResearchMiddleware(config)
      const context = { protocolId, seasonId, phase: "intake" as const }

      // Store an artifact
      const storeResponse = await fetch(`${config.baseUrl}/v5/exploit-research/artifacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId,
          kind: "source",
          raw: "contract Test { function test() public {} }",
          summary: "Simple test contract with one function",
        }),
      })

      expect(storeResponse.ok).toBe(true)
      const stored = await storeResponse.json()
      expect(stored.id).toBeDefined()

      // Retrieve it
      const retrieveResponse = await fetch(`${config.baseUrl}/v5/exploit-research/retrieve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId,
          query: "test contract function",
          limit: 5,
        }),
      })

      expect(retrieveResponse.ok).toBe(true)
      const retrieved = await retrieveResponse.json()
      expect(retrieved.results.length).toBeGreaterThan(0)
      expect(retrieved.results[0].summary).toContain("test")
    })

    it("should enforce protocol isolation", async () => {
      // Try to retrieve from different protocol
      const response = await fetch(`${config.baseUrl}/v5/exploit-research/retrieve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId: "different-protocol",
          seasonId,
          query: "test",
          limit: 5,
        }),
      })

      // Should return empty or error
      const data = await response.json()
      expect(data.results?.length || 0).toBe(0)
    })

    it("should close season and freeze writes", async () => {
      // Close the season
      const closeResponse = await fetch(`${config.baseUrl}/v5/exploit-research/seasons/${seasonId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ protocolId }),
      })

      expect(closeResponse.ok).toBe(true)

      // Try to write to closed season
      const writeResponse = await fetch(`${config.baseUrl}/v5/exploit-research/artifacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId,
          kind: "source",
          raw: "should fail",
        }),
      })

      expect(writeResponse.ok).toBe(false)
      expect(writeResponse.status).toBe(403)
    })
  })

  describe("Dedup Workflow", () => {
    let newSeasonId: string

    beforeAll(async () => {
      // Create a fresh season for dedup tests
      const response = await fetch(`${config.baseUrl}/v5/exploit-research/seasons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ protocolId }),
      })
      const data = await response.json()
      newSeasonId = data.id
    })

    it("should detect duplicate hypotheses", async () => {
      const hypothesis = "Flash loan attack on the swap function to drain liquidity"

      // Store first hypothesis
      await fetch(`${config.baseUrl}/v5/exploit-research/artifacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId: newSeasonId,
          kind: "hypothesis",
          raw: hypothesis,
          summary: hypothesis,
        }),
      })

      // Wait for embedding
      await new Promise(r => setTimeout(r, 1000))

      // Check for duplicate
      const similarResponse = await fetch(`${config.baseUrl}/v5/exploit-research/similar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId: newSeasonId,
          kind: "hypothesis",
          text: "Flash loan exploit targeting swap to remove liquidity",
          threshold: 0.8,
        }),
      })

      expect(similarResponse.ok).toBe(true)
      const similar = await similarResponse.json()
      expect(similar.isDuplicate).toBe(true)
      expect(similar.maxSimilarity).toBeGreaterThan(0.8)
    })

    it("should allow novel hypotheses", async () => {
      const novelHypothesis = "Oracle manipulation via Chainlink price feed"

      const similarResponse = await fetch(`${config.baseUrl}/v5/exploit-research/similar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId: newSeasonId,
          kind: "hypothesis",
          text: novelHypothesis,
          threshold: 0.8,
        }),
      })

      expect(similarResponse.ok).toBe(true)
      const similar = await similarResponse.json()
      expect(similar.isDuplicate).toBe(false)
    })
  })

  describe("Feedback Routing", () => {
    let testSeasonId: string
    let pathId: string
    let testId: string

    beforeAll(async () => {
      // Create season and entities for feedback test
      const seasonResponse = await fetch(`${config.baseUrl}/v5/exploit-research/seasons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ protocolId }),
      })
      testSeasonId = (await seasonResponse.json()).id

      // Create a path
      const pathResponse = await fetch(`${config.baseUrl}/v5/exploit-research/artifacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId: testSeasonId,
          kind: "path",
          raw: JSON.stringify({
            violatedInvariantId: "inv-test",
            steps: [{ contract: "Pool", function: "swap" }],
            confidence: 0.7,
          }),
        }),
      })
      pathId = (await pathResponse.json()).id

      // Create a test
      const testResponse = await fetch(`${config.baseUrl}/v5/exploit-research/artifacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId: testSeasonId,
          kind: "test",
          raw: "test_code",
          metadata: { scenarioId: "scenario-test" },
        }),
      })
      testId = (await testResponse.json()).id
    })

    it("should route feedback and update linked entities", async () => {
      const feedbackResponse = await fetch(`${config.baseUrl}/v5/exploit-research/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId: testSeasonId,
          testId,
          status: "pass",
          profit: 75000,
          linkedPathId: pathId,
          forgeLogsContent: "[PASS] testExploit (2.1s)\nProfit: 75000 USDC",
        }),
      })

      expect(feedbackResponse.ok).toBe(true)
      const feedback = await feedbackResponse.json()
      expect(feedback.updatedEntities).toBeDefined()
      expect(feedback.updatedEntities.length).toBeGreaterThan(0)

      // Verify path was updated
      const pathUpdated = feedback.updatedEntities.find(
        (e: any) => e.id === pathId
      )
      expect(pathUpdated).toBeDefined()
      expect(pathUpdated.field).toBe("confirmedCount")
    })
  })

  describe("Snapshot & Restore", () => {
    let snapshotSeasonId: string
    let snapshotId: string

    beforeAll(async () => {
      // Create season with some content
      const seasonResponse = await fetch(`${config.baseUrl}/v5/exploit-research/seasons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ protocolId }),
      })
      snapshotSeasonId = (await seasonResponse.json()).id

      // Add some artifacts
      for (let i = 0; i < 3; i++) {
        await fetch(`${config.baseUrl}/v5/exploit-research/artifacts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            protocolId,
            seasonId: snapshotSeasonId,
            kind: "invariant",
            raw: `invariant_${i}`,
            summary: `Test invariant ${i}`,
          }),
        })
      }
    })

    it("should create snapshot", async () => {
      const response = await fetch(`${config.baseUrl}/v5/exploit-research/snapshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          seasonId: snapshotSeasonId,
        }),
      })

      expect(response.ok).toBe(true)
      const snapshot = await response.json()
      expect(snapshot.id).toBeDefined()
      snapshotId = snapshot.id
    })

    it("should restore from snapshot", async () => {
      const response = await fetch(`${config.baseUrl}/v5/exploit-research/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          protocolId,
          snapshotId,
        }),
      })

      expect(response.ok).toBe(true)
      const restored = await response.json()
      expect(restored.success).toBe(true)
      expect(restored.restoredEntities.invariants).toBe(3)
    })
  })
})
```

#### Validation Checkpoint 5.1:
- [ ] All integration tests pass with live Supermemory instance
- [ ] Protocol isolation is enforced correctly
- [ ] Closed seasons reject writes
- [ ] Dedup correctly identifies duplicates
- [ ] Feedback updates propagate to linked entities
- [ ] Snapshots capture and restore full state

---

## Phase 6: Documentation & Cleanup

### 6.1 Export and Documentation

#### Tasks:
- [ ] Export all schemas from `packages/validation/index.ts`
- [ ] Export all tools from `packages/tools/src/index.ts`
- [ ] Add JSDoc comments to all public functions
- [ ] Create OpenAPI spec for all endpoints
- [ ] Update README with usage examples
- [ ] Add migration guide for existing integrations

### 6.2 Final Validation

#### Production Readiness Checklist:

- [ ] **Schemas**: All 30+ schemas validated with comprehensive tests
- [ ] **Reducers**: All 8 reducers handle edge cases, achieve > 50% reduction
- [ ] **Dedup**: Correctly identifies duplicates at 0.92 threshold
- [ ] **Middleware**: Captures all tool calls, routes feedback correctly
- [ ] **Isolation**: Protocol + Season filters enforced on every operation
- [ ] **Performance**:
  - Reducers: < 100ms for typical inputs
  - Dedup: < 50ms for 100 candidates
  - Retrieval: < 500ms for 10 results
- [ ] **Error Handling**: All API errors return structured responses
- [ ] **Logging**: Verbose mode logs all operations with timing
- [ ] **Tests**: > 90% code coverage, all tests pass
- [ ] **Documentation**: Complete API documentation with examples

---

## Quick Reference: File Locations

```
packages/
├── validation/
│   ├── exploit-research-schemas.ts    # Core schemas
│   ├── exploit-research-api.ts        # API request/response schemas
│   └── __tests__/
│       ├── exploit-research-schemas.test.ts
│       └── exploit-research-api.test.ts
├── tools/
│   └── src/
│       └── exploit-research/
│           ├── reducers.ts            # Content reducers
│           ├── dedup.ts               # Dedup & novelty
│           ├── middleware.ts          # Tool middleware
│           ├── index.ts               # Exports
│           └── __tests__/
│               ├── reducers.test.ts
│               ├── dedup.test.ts
│               ├── middleware.test.ts
│               └── integration.test.ts
└── lib/
    └── similarity.ts                  # Existing similarity functions
```

---

## Command Reference

```bash
# Run all tests
bun test

# Run specific test file
bun test packages/validation/__tests__/exploit-research-schemas.test.ts

# Run with coverage
bun test --coverage

# Type check
bun run typecheck

# Lint
bun run lint

# Build
bun run build
```

---

## Next Steps After Implementation

1. **Backend Routes**: Implement API routes in `apps/web` or separate service
2. **Database Migrations**: Add tables for Protocol, Season, Graph, etc.
3. **OpenHands Integration**: Wire middleware into conversation loop
4. **Monitoring**: Add metrics collection for production
5. **Rate Limiting**: Implement per-protocol/season rate limits
