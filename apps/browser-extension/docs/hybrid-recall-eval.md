# Hybrid recall — evaluation & proof

This doc explains **what we claim**, **how we prove it**, and **how to re-run the proof** for the browser-extension auto-recall change on branch `feat/extension-hybrid-recall`.

## Claim (precise)

Auto-recall in the extension used to:

1. Call `/v4/search` **without** `searchMode` (API default = `"memories"`), and  
2. Format each hit as `` `${result.memory}` `` only.

When the API returns a **document chunk** (`chunk` set, `memory` absent), the injected “Included Memories” prompt got the literal string `undefined` and **lost** that document context.

**After this change**, auto-recall:

1. Requests `searchMode: "hybrid"` (memories **and** document chunks), and  
2. Formats each hit as `memory || chunk`, skipping empty hits and renumbering contiguously.

We claim an improvement in **context the extension injects into the LLM**, not an improvement to Supermemory’s private ranking/embedding engine.

| In scope | Out of scope |
|----------|----------------|
| Request body uses hybrid | Server ranking / fusion quality |
| Prompt lines no longer contain `undefined` | MemoryBench provider scores |
| Chunk-only API hits become usable prompt text | Changing how memories are stored |
| Empty hits don’t invent numbered lines | End-to-end browser chrome E2E |

## How the proof works

We run an **offline A/B** on fixed gold fixtures that look like hybrid `/v4/search` payloads:

```
same fixture results
        │
        ├─► legacy formatter  →  metrics L
        │   (memory field only — old background.ts)
        │
        └─► new formatter     →  metrics N
            (memory || chunk — search-request.ts)
```

Fixtures live in `utils/hybrid-recall.eval.ts` (`HYBRID_RECALL_FIXTURES`):

| Fixture id | What it models |
|------------|----------------|
| `mixed-memory-and-chunk` | Typical mix: extracted facts + one RAG chunk |
| `chunk-starvation-shape` | Memory-heavy list with a single surviving doc chunk |
| `chunk-only-page` | Document-only hits (no extracted memories) |
| `empty-and-whitespace-noise` | Garbage / blank hits must not pollute the prompt |

### Metrics

| Metric | Meaning |
|--------|---------|
| **undefined lines** | Prompt lines matching `\bundefined\b` (legacy bug signature) |
| **chunk-only recall** | How many fixture strings that exist *only* as `chunk` appear in the prompt |
| **expected recall** | How many gold substrings appear in the prompt |
| **usable lines** | Non-empty lines that are not `undefined` |
| **requestUsesHybrid** | `buildSearchMemoriesBody` sets `searchMode: "hybrid"` |

### Pass gates (`assertHybridRecallPass`)

The harness **fails CI-style** unless all of these hold:

1. Search body uses `searchMode: "hybrid"`.
2. New formatter: **0** undefined lines.
3. Legacy formatter: **> 0** undefined lines (fixtures still prove the gap).
4. New recovers **all** chunk-only gold strings; legacy recovers **none**.
5. New recovers **all** expected strings and **beats** legacy expected recovery.

That combination both **shows the bug** and **shows the fix**.

## Run the proof

From `apps/browser-extension`:

```bash
# Human-readable before/after report (exit 1 on FAIL)
bun run eval:hybrid-recall

# Same gates as automated tests (+ unit coverage)
bun test utils/hybrid-recall.eval.test.ts utils/search-request.test.ts
```

Equivalent:

```bash
bun utils/hybrid-recall.eval.ts
bun test
```

## Latest local result (re-run to refresh)

Captured with `bun run eval:hybrid-recall`:

```
fixtures: 4
request searchMode hybrid: true

undefined lines   legacy=6  next=0
chunk-only recall legacy=0/4  next=4/4
expected recall   legacy=6/10  next=10/10

PASS: new path recovers all fixture context; legacy gap confirmed.
```

### Example before / after (one fixture)

**Fixture:** `mixed-memory-and-chunk`

| | Legacy | Next |
|---|--------|------|
| Line 1 | Prefers dark mode | Prefers dark mode |
| Line 2 | Uses Biome for formatting | Uses Biome for formatting |
| Line 3 | **`undefined`** | Deploy checklist: run migrations before restarting the API |

The third hit is chunk-only. Legacy injects noise; next injects the document text the model can use.

### Chunk-only page (strongest gap)

**Fixture:** `chunk-only-page`

| Legacy | Next |
|--------|------|
| `1. undefined` | Incident runbook… |
| `2. undefined` | Rollback: redeploy… |

Legacy usable context: **0**. Next: **2/2** document lines.

## How to present this (PR / review)

Suggested PR section:

```markdown
## Proof

Offline A/B eval: `bun run eval:hybrid-recall` in `apps/browser-extension`.

| Metric | Legacy | Next |
|--------|--------|------|
| undefined prompt lines | 6 | 0 |
| chunk-only texts recovered | 0/4 | 4/4 |
| expected texts recovered | 6/10 | 10/10 |

Doc: `apps/browser-extension/docs/hybrid-recall-eval.md`
Harness: `utils/hybrid-recall.eval.ts`
```

Attach the full CLI report as a PR comment or screenshot of the test output.

## Manual smoke (optional, not automated)

Use when you want confidence against a **live** API (requires your account + loaded extension build):

1. Load the extension from a local `bun run build` / `bun run dev` output.
2. In one Supermemory project, save (a) a short preference fact and (b) a multi-sentence note/doc whose wording won’t be extracted as a memory yet (or search in a way that returns chunks).
3. On ChatGPT/Claude/T3, type a query that should hit both.
4. Open **Included Memories**.
5. Confirm: no `undefined` rows; document wording appears when the hit is a chunk.

This smoke check is complementary. The offline harness is the **regression-proof** gate; smoke validates wiring to a real `/v4/search`.

## What this does *not* replace

- **MemoryBench** (`supermemoryai/memorybench`) scores providers’ ingest→search→answer quality. It does not exercise this Chrome content-script formatter.
- Server-side hybrid ranking quirks (e.g. memory-heavy containers starving chunks — see supermemory#1398) are unchanged by this PR. We only ensure that **when** a chunk is returned, the extension uses it.

## File map

| Path | Role |
|------|------|
| `utils/search-request.ts` | `searchMode: "hybrid"` + `formatSearchHitsForPrompt` |
| `entrypoints/background.ts` | Wires formatter into `GET_RELATED_MEMORIES` |
| `utils/hybrid-recall.eval.ts` | Fixtures, legacy vs next scoring, CLI report |
| `utils/hybrid-recall.eval.test.ts` | Hard pass gates in `bun test` |
| `utils/search-request.test.ts` | Unit tests for body + hit formatting |
| `docs/hybrid-recall-eval.md` | This document |
