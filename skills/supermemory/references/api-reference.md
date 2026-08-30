# Supermemory API Reference

Complete reference for the Supermemory REST API.

## Base URL

```
https://api.supermemory.ai
```

## Authentication

All requests require a bearer token:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

Get a key from [console.supermemory.ai](https://console.supermemory.ai). Keys are either **full-access** or **scoped** to specific container tags / projects — scoped keys can read anything in their scope but are rejected (`403`) by org-level write endpoints like `PATCH /v3/settings`.

## Endpoint coverage

Every endpoint below is callable over plain HTTP. Some also have a generated SDK method — the rest need `fetch`/`requests`. Coverage verified against `supermemory@4.25.4` (npm) and `supermemory==3.56.0` (PyPI); check for newer releases before assuming a method is still missing.

| Endpoint | SDK method | Purpose |
|---|---|---|
| `POST /v3/documents` | `client.documents.add()` | Ingest text, URL, or file reference |
| `POST /v3/documents/batch` | `client.documents.batchAdd()` | Ingest up to many documents in one call |
| `POST /v3/documents/file` | `client.documents.uploadFile()` | Multipart file upload |
| `POST /v4/conversations` | — HTTP only | Ingest structured chat transcripts |
| `POST /v4/memories` | — HTTP only | Write memories directly, skipping extraction |
| `POST /v4/search` | `client.search()` | Memory search (default; low latency) |
| `POST /v3/search` | `client.search.documents()` *(deprecated)* | Legacy document-shaped search |
| `POST /v4/profile` | `client.profile()` | Static + dynamic user profile |
| `POST /v4/profile/buckets` | — HTTP only | List effective bucket definitions |
| `PATCH /v4/memories` | `client.memories.updateMemory()` | Supersede a memory with a new version |
| `DELETE /v4/memories` | `client.memories.forget()` | Forget one memory |
| `POST /v4/memories/forget-matching` | — HTTP only | Agentic mass forget, with dry-run |
| `POST /v4/memories/list` | — HTTP only | List memory entries with version history |
| `POST /v3/documents/list` | `client.documents.list()` | Paginated document listing |
| `GET /v3/documents/{id}` | `client.documents.get()` | Fetch one document |
| `PATCH /v3/documents/{id}` | `client.documents.update()` | Update document content/metadata |
| `DELETE /v3/documents/{id}` | `client.documents.delete()` | Delete document + its memories |
| `DELETE /v3/documents/bulk` | `client.documents.deleteBulk()` | Delete many documents |
| `GET /v3/documents/processing` | `client.documents.listProcessing()` | In-flight ingestion status |
| `GET /v3/documents/{id}/chunks` | — HTTP only | Raw chunks for a document |
| `GET /v3/documents/{id}/file-url` | — HTTP only | Signed URL for an uploaded file |
| `GET /v3/container-tags/list` | — HTTP only | List container tags |
| `GET|PATCH|DELETE /v3/container-tags/{tag}` | — HTTP only | Read / configure / delete a container tag |
| `POST /v3/container-tags/merge` | — HTTP only | Merge one tag into another |
| `GET /v3/container-tags/merge/{mergeId}` | — HTTP only | Poll a merge job |
| `GET /v3/settings` | `client.settings.get()` | Read org settings |
| `PATCH /v3/settings` | `client.settings.update()` | Update org settings (incl. buckets) |
| `POST /v3/settings/reset` | — HTTP only | Reset org settings to defaults |
| `POST /v3/settings/suggest-buckets` | — HTTP only | AI-suggested bucket definitions |
| `/v3/connections/*` | `client.connections.*` | Google Drive, Notion, OneDrive, etc. |

When no SDK method exists, call the endpoint directly — same base URL, same bearer token. That is a supported path, not a workaround:

```typescript
const res = await fetch("https://api.supermemory.ai/v4/memories/forget-matching", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ containerTag: "user_123", query: "Project Titan", dryRun: true }),
});
```

---

## Ingestion

### POST /v3/documents

Queue any content for processing. Extraction, chunking, embedding, and memory generation happen asynchronously.

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | yes | Raw text, a URL, or a file reference. URLs, PDFs, images, and videos are fetched and parsed |
| `containerTag` | string | no | Space this document belongs to. Max 100 chars, alphanumeric plus `-`, `_`, `.` |
| `customId` | string | no | Your own idempotency key. Re-adding the same `customId` updates that document |
| `metadata` | object | no | String/number/boolean/string[] values, filterable at search time |
| `entityContext` | string | no | Up to 1,500 chars of context that steers extraction for this container tag |
| `filepath` | string | no | Virtual path, used by supermemory filesystem features |
| `taskType` | `"memory"` \| `"superrag"` | no | `"memory"` (default) for the full context layer, `"superrag"` for managed RAG only |

```bash
curl -X POST https://api.supermemory.ai/v3/documents \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "John prefers dark mode and TypeScript over JavaScript",
    "containerTag": "user_123",
    "customId": "prefs_v1",
    "metadata": { "source": "onboarding", "verified": true }
  }'
```

```json
{ "id": "doc_abc123", "status": "queued" }
```

Ingestion is asynchronous: poll `GET /v3/documents/processing` or `GET /v3/documents/{id}` for status. Expect ~1–2 minutes for a 100-page PDF and 5–10 minutes for video.

### POST /v4/memories — write memories directly

Bypasses document ingestion and extraction. Use when you already have clean, entity-centric facts; the memories are embedded and immediately searchable.

| Field | Type | Required | Description |
|---|---|---|---|
| `memories` | array | yes | 1–100 items |
| `memories[].content` | string | yes | The fact, 1–10,000 chars. Write it entity-centric: "John prefers dark mode" |
| `memories[].isStatic` | boolean | no | `true` for permanent identity traits (name, hometown, profession). Defaults to `false` |
| `memories[].metadata` | object | no | Arbitrary key-value metadata |
| `memories[].forgetAfter` | string \| null | no | ISO 8601 expiry — the memory is auto-forgotten after this time |
| `memories[].forgetReason` | string \| null | no | Why it will expire. Only meaningful with `forgetAfter` |
| `memories[].temporalContext` | object | no | `{ documentDate?, eventDate?[] }` — when the content was authored / what dates it references |
| `containerTag` | string | yes | Space these memories belong to |

```bash
curl -X POST https://api.supermemory.ai/v4/memories \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "memories": [
      { "content": "John prefers dark mode", "isStatic": false },
      { "content": "John is from Seattle", "isStatic": true }
    ],
    "containerTag": "user_123"
  }'
```

```json
{
  "documentId": "doc_xyz",
  "memories": [
    { "id": "mem_abc123", "memory": "John prefers dark mode", "isStatic": false,
      "createdAt": "2026-08-10T12:00:00Z", "forgetAfter": null, "forgetReason": null, "metadata": null }
  ]
}
```

### POST /v4/conversations — ingest a transcript

Send structured messages instead of a flattened string. The backend diffs against the previous state of the same `conversationId`, so re-sending a grown transcript appends rather than duplicating.

| Field | Type | Required | Description |
|---|---|---|---|
| `conversationId` | string | yes | Stable ID for this thread |
| `messages` | array | yes | `{ role: "user" \| "assistant" \| "system" \| "tool", content, name?, tool_calls?, tool_call_id? }`. `content` is a string or an array of `{ type: "text" \| "image_url", ... }` parts |
| `containerTags` | string[] | no | Spaces this conversation belongs to |
| `metadata` | object | no | Arbitrary key-value metadata |
| `entityContext` | string | no | Context that steers extraction |

```bash
curl -X POST https://api.supermemory.ai/v4/conversations \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_123",
    "messages": [
      { "role": "user", "content": "I switched my editor to Zed" },
      { "role": "assistant", "content": "Noted — how are you finding it?" }
    ],
    "containerTags": ["user_123"]
  }'
```

Prefer this over concatenating turns into `POST /v3/documents`: roles, tool calls, and images survive, and repeated sends of the same thread stay one document.

---

## Recall

### POST /v4/search

The default search. Returns memories, optionally enriched with document chunks.

| Field | Type | Required | Description |
|---|---|---|---|
| `q` | string | yes | Natural-language query |
| `containerTag` | string | no | Restrict to one space |
| `limit` | number | no | Max results |
| `threshold` | number | no | Similarity floor, 0–1 |
| `searchMode` | `"memories"` \| `"hybrid"` \| `"documents"` | no | `"memories"` (default) for facts, `"hybrid"` for facts + chunks (best for RAG), `"documents"` for chunks only |
| `filters` | object | no | Metadata filters, see [Filters](#filters) |
| `include` | object | no | `{ chunks?, documents?, summaries?, relatedMemories?, forgottenMemories? }` — extra payload per result |
| `rerank` | boolean | no | Re-rank results with a cross-encoder. Higher precision, slower |
| `rewriteQuery` | boolean | no | Let the service rewrite `q` before searching. Helps with terse or pronoun-heavy queries |
| `aggregate` | boolean | no | Collapse near-duplicate memories into one aggregated result |
| `filepath` | string | no | Restrict to a virtual path |

```bash
curl -X POST https://api.supermemory.ai/v4/search \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "authentication methods",
    "containerTag": "docs",
    "searchMode": "hybrid",
    "threshold": 0.3,
    "limit": 10
  }'
```

```json
{
  "results": [
    {
      "id": "mem_abc123",
      "memory": "The API authenticates with a bearer token",
      "similarity": 0.82,
      "updatedAt": "2026-08-01T10:00:00Z",
      "metadata": { "source": "docs" },
      "version": 2
    }
  ],
  "total": 1,
  "timing": 142
}
```

Result fields worth knowing: `memory` is set on memory results, `chunk` on chunk results (hybrid/documents mode), `similarity` is the score (not `score`), and `chunks` / `documents` / `context` appear only when requested via `include`.

`POST /v3/search` still exists for the legacy document-shaped response and is exposed as the deprecated `client.search.documents()`. Use `/v4/search` for anything new.

### POST /v4/profile

The fastest way to personalize a prompt: pre-computed facts about a container tag, no query required.

| Field | Type | Required | Description |
|---|---|---|---|
| `containerTag` | string | yes | User / project / space identifier |
| `q` | string | no | Also run a search and return `searchResults` |
| `threshold` | number | no | Similarity floor for `searchResults`, 0–1 |
| `filters` | object | no | Metadata filters applied to profile *and* search results |
| `include` | array | no | Sections to return: `"static"`, `"dynamic"`, `"buckets"`. Omit for all. **HTTP only** — not in the generated SDKs |
| `buckets` | string[] | no | Limit to specific bucket keys. Only meaningful with `"buckets"` included. **HTTP only** |

```bash
curl -X POST https://api.supermemory.ai/v4/profile \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "containerTag": "user_123", "q": "what tools does the user like?" }'
```

```json
{
  "profile": {
    "static": ["John Doe, staff engineer in Seattle"],
    "dynamic": ["[Recent] [2026-08-09] Switched their editor to Zed"],
    "buckets": { "preferences": ["[Summary] Prefers concise, technical answers"] }
  },
  "searchResults": { "results": [], "total": 0, "timing": 88 }
}
```

`searchResults` is present only when `q` was provided. `buckets` is present only when requested via `include`.

**`[Recent]` and `[Summary]` prefixes.** Older memories for an entity are periodically aggregated into a synthesis, prefixed `[Summary]`; anything ingested since is prefixed `[Recent]` (with a `[YYYY-MM-DD]` date in `dynamic`). Strip the prefixes for raw text, or keep them to signal recency to your model.

Because `include`/`buckets` are not in the generated SDK types, request bucketed profiles over HTTP:

```typescript
const res = await fetch("https://api.supermemory.ai/v4/profile", {
  method: "POST",
  headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    containerTag: "user_123",
    include: ["buckets"],              // omits static + dynamic entirely
    buckets: ["preferences", "goals"], // omit for all configured buckets
  }),
});
const { profile } = await res.json();
```

### POST /v4/profile/buckets

Lists the **effective** bucket definitions for a container tag — org buckets merged with that tag's own additions. Use it to discover valid keys before requesting a bucketed profile.

```bash
curl -X POST https://api.supermemory.ai/v4/profile/buckets \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "containerTag": "user_123" }'
```

```json
{ "buckets": [{ "key": "preferences", "description": "Explicit first-person preferences..." }] }
```

Reading buckets works with any key and any role. Writing them does not — see [Buckets](#buckets).

---

## Memory lifecycle

Memories are versioned and soft-deleted. Updating creates a new version that supersedes the old one; forgetting marks a memory forgotten rather than destroying the row.

### DELETE /v4/memories — forget one memory

| Field | Type | Required | Description |
|---|---|---|---|
| `containerTag` | string | yes | Scopes the operation |
| `id` | string | one of* | Memory ID |
| `content` | string | one of* | Exact content match, when you don't have the ID |
| `reason` | string | no | Recorded as `forgetReason` |

\* Provide either `id` or `content`.

```typescript
const res = await client.memories.forget({ id: "mem_abc123", containerTag: "user_123" });
// { id: "mem_abc123", forgotten: true }
```

### PATCH /v4/memories — update (new version)

Creates a new version rather than editing in place, so history is preserved.

| Field | Type | Required | Description |
|---|---|---|---|
| `containerTag` | string | yes | Scopes the operation |
| `newContent` | string | yes | Replacement content |
| `id` \| `content` | string | one of | Which memory to supersede |
| `metadata` | object | no | Metadata for the new version. Inherits the previous version's if omitted |
| `forgetAfter` | string \| null | no | ISO expiry. `null` clears an existing expiry; omit to inherit |
| `forgetReason` | string \| null | no | Cleared automatically when `forgetAfter` is set to `null` |
| `temporalContext` | object | no | `{ documentDate?, eventDate?[] }`. Existing value preserved if omitted |

```typescript
const res = await client.memories.updateMemory({
  id: "mem_abc123",
  containerTag: "user_123",
  newContent: "John now prefers light mode",
});
// { id: "mem_xyz789", memory: "...", version: 2, parentMemoryId: "mem_abc123", rootMemoryId: "mem_abc123", ... }
```

Prefer this over forget-then-add when a fact changed: the version chain keeps the correction traceable.

### POST /v4/memories/forget-matching — mass forget

Bulk forget in one call, two ways. Give a **`query`** and the service semantically searches the container, an LLM decides which memories are genuinely about your target, and those are soft-deleted — this is the "forget everything about X" path. Or give an explicit **`ids`** list to forget exactly those, with no search.

| Field | Type | Required | Description |
|---|---|---|---|
| `containerTag` | string | yes | Scopes the operation |
| `query` | string | one of* | What to forget — an instruction ("forget everything about Project Titan") or a bare topic ("Project Titan"). Max 2,000 chars |
| `ids` | string[] | one of* | Exact memory IDs, 1–500. Validated against `containerTag`, so unknown or out-of-scope IDs are ignored |
| `dryRun` | boolean | no | Preview without mutating. Defaults to `false` — **pass `true` first** |
| `threshold` | number | no | Similarity floor for candidates, 0–1. Lower casts a wider net. Defaults to `0.5` |
| `maxForget` | number | no | Safety cap for query mode, 1–500. Defaults to `100`. Ignored in ID mode |
| `reason` | string | no | Recorded as `forgetReason` on each memory |

\* Provide either `query` or a non-empty `ids`.

```bash
# 1) Preview
curl -X POST https://api.supermemory.ai/v4/memories/forget-matching \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "containerTag": "user_123", "query": "forget everything about Project Titan", "dryRun": true }'

# 2) Apply the exact set you reviewed
curl -X POST https://api.supermemory.ai/v4/memories/forget-matching \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "containerTag": "user_123", "ids": ["mem_abc123", "mem_def456"], "reason": "project cancelled" }'
```

```json
{
  "dryRun": true,
  "count": 2,
  "forgetBatchId": null,
  "summary": "Selected 2 memories about Project Titan",
  "candidates": [{ "id": "mem_abc123", "memory": "Project Titan ships in Q3", "score": 0.71 }]
}
```

| Field | Description |
|---|---|
| `dryRun` | Whether this was a preview or a real forget |
| `count` | How many memories were selected / forgotten |
| `forgetBatchId` | Tagged on every memory forgotten in this call for traceability; `null` on dry runs |
| `summary` | The agent's one-line account of what it did |
| `candidates` / `forgotten` | The affected memories — `candidates` on dry run, `forgotten` on apply |

**Always dry-run first.** This is bulk and destructive, and the match is semantic, so a broad query can select more than you intend. Applying with a `query` re-runs the match, which can drift from the preview if the container changed in between — to forget *precisely* what you reviewed, take the `id`s from the preview and send them back as `ids`. Identity is server-owned: the LLM only ever sees opaque handles for memories a search returned, so it cannot reach outside those results or outside `containerTag`.

### POST /v4/memories/list

Latest memory entries for one or more container tags, with version history and source documents.

| Field | Type | Required | Description |
|---|---|---|---|
| `containerTags` | string[] | yes | At least one tag |
| `filters` | object | no | Metadata filters |
| `limit` | number | no | Page size, 1–1100. Defaults to `10` |
| `page` | number | no | 1-based. Defaults to `1` |
| `sort` | `"createdAt"` \| `"updatedAt"` | no | Defaults to `"createdAt"` |
| `order` | `"asc"` \| `"desc"` | no | Defaults to `"desc"` |

Use this for audit and review UIs — it shows what the system actually believes, including superseded versions. `POST /v3/documents/list` is the document-level equivalent.

---

## Container tags

A container tag is a space: the isolation and grouping unit for memories. Tags are created implicitly on first write, so these endpoints are for inspection and configuration.

| Endpoint | Purpose |
|---|---|
| `GET /v3/container-tags/list` | Every tag in the org |
| `GET /v3/container-tags/{tag}` | One tag's configuration |
| `PATCH /v3/container-tags/{tag}` | Set `entityContext`, `profileBuckets`, `memoryFilesystemPaths`, `name` |
| `DELETE /v3/container-tags/{tag}` | Delete the tag and its content |
| `POST /v3/container-tags/merge` | Merge one tag into another (`{ from, to }`); returns a merge job |
| `GET /v3/container-tags/merge/{mergeId}` | Poll merge status |

```bash
curl -X PATCH https://api.supermemory.ai/v3/container-tags/user_alex \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "entityContext": "This tag belongs to a solo founder juggling sales, hiring, and product." }'
```

`entityContext` is per-tag (up to 1,500 chars, `null` to clear) and is folded into the same prompt as the org-level `filterPrompt` during extraction. Use it for who-this-space-is context; use `filterPrompt` for guidance that should apply everywhere.

Merging is the fix for the common "same person, two IDs" problem (anonymous session promoted to a signed-in user).

---

## Buckets

Buckets are custom topical categories for a profile — an axis alongside `static`/`dynamic`. Static vs dynamic splits facts by how long-lived they are; buckets group them by subject. A classifier assigns each memory to matching buckets at ingestion.

Reading is covered above (`POST /v4/profile` with `include`, `POST /v4/profile/buckets`). Writing goes through the settings and container-tag endpoints:

| Level | Endpoint | Semantics |
|---|---|---|
| Organization | `PATCH /v3/settings` with `profileBuckets` | The default set every tag inherits. **Replaces** the stored list — always send the full set |
| Space | `PATCH /v3/container-tags/{tag}` with `profileBuckets` | Add-only on top of org buckets. A tag keeps every org bucket; on key collision the org definition wins |
| Suggestions | `POST /v3/settings/suggest-buckets` | 3–6 AI-generated suggestions derived from your org's `filterPrompt`. Saves nothing — feed the results into `PATCH /v3/settings` |

```bash
curl -X PATCH https://api.supermemory.ai/v3/settings \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "profileBuckets": [
      { "key": "work", "description": "Professional role, employer, projects, and work-related decisions." },
      { "key": "health", "description": "Physical and mental wellbeing, habits, and health-related goals." }
    ]
  }'
```

Writing buckets requires an **admin or owner** role and a **full-access** API key — scoped keys get `403`. `suggest-buckets` needs a `filterPrompt` already set on the org, or it returns `400`.

| Rule | Detail |
|---|---|
| Key format | Lowercase alphanumeric, starts with a letter/digit, may contain `-`/`_`, 1–64 chars |
| Reserved keys | `static` and `dynamic` |
| Max buckets | 50 per array, counted separately for the org list and each space list |
| Duplicates | Rejected within a single request |
| Description | Optional, up to 2,000 chars |

If neither the org nor the space defines buckets, ingestion falls back to a single built-in `preferences` bucket, scoped tightly to explicit first-person statements. Bucket descriptions steer the classifier, so write them precisely: "Explicit first-person preferences only — exclude inferred traits" yields much cleaner buckets than "stuff the user likes".

---

## Filters

Metadata filters are accepted by `/v4/search`, `/v3/search`, `/v4/profile`, `/v4/memories/list`, and `/v3/documents/list`. Conditions must be wrapped in an `AND` or `OR` array — a bare `{ metadata: {...} }` object is not valid.

```typescript
const results = await client.search({
  q: "design document",
  containerTag: "user_123",
  filters: {
    AND: [
      { key: "category", value: "engineering" },
      { key: "priority", value: "high" },
    ],
  },
});
```

| Type | Example | Description |
|---|---|---|
| String equality | `{ key: "status", value: "published" }` | Exact match (default) |
| String contains | `{ filterType: "string_contains", key: "title", value: "react" }` | Substring match |
| Numeric | `{ filterType: "numeric", key: "priority", value: "5", numericOperator: ">=" }` | `>`, `<`, `>=`, `<=`, `=` |
| Array contains | `{ filterType: "array_contains", key: "tags", value: "important" }` | Membership in a string array |

`AND`/`OR` nest, and any condition accepts `negate: true` and `ignoreCase: true`. Numeric values are passed as strings.

---

## Error handling

| Status | Meaning |
|---|---|
| `200` / `201` | Success |
| `400` | Invalid request — bad body, missing required field, or unmet precondition (e.g. `suggest-buckets` with no `filterPrompt`) |
| `401` | Missing or invalid API key |
| `402` | Search quota or credits exhausted |
| `403` | Key or role lacks permission — usually a scoped key hitting an org-level write |
| `404` | Resource not found, or `containerTag` has no matching space |
| `429` | Rate limited. Honour `Retry-After` |
| `500` | Server error — safe to retry with backoff |

Errors return `{ "error": "message" }`. The SDKs raise typed errors instead:

```typescript
import { APIError, RateLimitError, AuthenticationError } from "supermemory";

try {
  await client.documents.add({ content: "...", containerTag: "user_123" });
} catch (error) {
  if (error instanceof AuthenticationError) console.error("Invalid API key");
  else if (error instanceof RateLimitError) console.error("Rate limited");
  else if (error instanceof APIError) console.error(error.status, error.message);
  else throw error;
}
```

Rate limits depend on your plan — check the [console](https://console.supermemory.ai). Both SDKs retry idempotent failures with backoff by default.

---

## Best practices

**Use one container tag format.** `user_${userId}` everywhere beats `user_123` in some places and `123` in others; there is no fuzzy matching across tags. If you do end up with two tags for one entity, merge them rather than re-ingesting.

**Use `customId` for idempotency.** Re-posting the same `customId` updates that document instead of creating a duplicate — the simplest defence against retries and replayed webhooks.

**Pick the right write path.** Extracted facts from prose or documents → `POST /v3/documents`. A chat thread → `POST /v4/conversations`. Facts you already have clean → `POST /v4/memories`.

**Pick the right read path.** Personalizing a prompt → `POST /v4/profile` (no query needed, pre-computed). Answering a specific question → `POST /v4/search`. RAG over documents → `/v4/search` with `searchMode: "hybrid"`.

**Correct, don't churn.** `PATCH /v4/memories` when a fact changed; `DELETE /v4/memories` when it should never have been stored; `forget-matching` with `dryRun` when a whole topic must go.

**Tune thresholds from real queries.** 0.3–0.5 favours recall, 0.5–0.7 is balanced, 0.7+ favours precision. Reach for `rerank` when precision matters more than latency, and `rewriteQuery` when queries are terse or pronoun-heavy.

**Mark real identity traits `isStatic`.** Name, hometown, profession. Not "currently working on the billing revamp" — that is dynamic and should be allowed to age.

---

## Support

- **Documentation**: [supermemory.ai/docs](https://supermemory.ai/docs)
- **Status**: [status.supermemory.ai](https://status.supermemory.ai)
- **Console**: [console.supermemory.ai](https://console.supermemory.ai)
