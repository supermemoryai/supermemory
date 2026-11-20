---
name: supermemory
description: Build with the Supermemory v5 API and SDKs (TypeScript `supermemory` 5.x, Python `supermemory` 5.x, `@supermemory/tools` 3.x). Use when an application needs persistent memory across sessions, per-user personalization, a maintained user profile, or semantic search over documents. Covers the namespace-scoped endpoints, exact SDK call shapes, search and ingestion options, typed filters, and the legacy names that must not be emitted.
---

# Supermemory v5

Supermemory stores documents, extracts memories from them, and serves three things back: ranked search results, a maintained profile per subject, and the source chunks. Every call is scoped to one **namespace**: a user id, a project id, or any boundary you want isolated.

This skill documents **v5**. The legacy v3 and v4 API is deprecated and shuts down on December 31, 2026. If you see `containerTag`, `customId`, `/v3/`, or `/v4/` in a codebase, it is on the legacy API; `npx supermemory@latest migrate` launches a coding agent that upgrades it.

## Versions this skill matches

| Client | Version | Install |
| --- | --- | --- |
| TypeScript SDK and CLI | `supermemory` 5.x | `npm i supermemory` |
| Python SDK | `supermemory` 5.x | `pip install -U supermemory` |
| Framework tools (Vercel AI SDK, OpenAI, Mastra, VoltAgent, Claude memory) | `@supermemory/tools` 3.x | `npm i @supermemory/tools supermemory` |
| Python framework wrappers (`supermemory-openai-sdk`, `supermemory-agent-framework`, pipecat, livekit, cartesia) | still on the legacy API | prefer the core Python SDK until they ship a v5 release |

## Core model

- **Namespace**: the isolation boundary. One document lives in exactly one namespace. Never send two namespaces in one request and never infer scope from a document id.
- **Document**: what you add. Text, a URL, or a file. Give it a stable `id` and repeating that `id` appends or diffs into the same document instead of creating a new one. Use it for conversations: one session id, one document.
- **Memory**: a fact extracted from documents. You never write memories directly; you add documents and the engine forms, updates, and versions them.
- **Profile**: the maintained picture of a namespace's subject. `static` facts, `dynamic` recent context, and optional named `buckets`.
- **Chunk**: a piece of source text. Search with `searchMode: "chunks"` for classic RAG over the raw content.
- **Processing**: `add` returns `{ id, status }` and work continues in the background. `system.status` tracks extraction and indexing. `system.dreamingStatus` tracks memory formation and can finish minutes later. With the default `dreaming: "dynamic"`, a new namespace can show zero memories and an empty profile for several minutes. Use `dreaming: "instant"` in quickstarts, tests, and anywhere the next step reads memories right away. `instant` bills one extra operation per document.

## Canonical API surface

Base URL `https://api.supermemory.ai`. Routes are unversioned; `/v5` is not a path prefix. Auth is `Authorization: Bearer sm_...` on every request.

| Method and path | Purpose |
| --- | --- |
| `POST /ns/{namespace}/document` | Add text or a URL |
| `POST /ns/{namespace}/document/batch` | Add 1 to 600 documents |
| `POST /ns/{namespace}/document/file` | Upload a file (multipart) |
| `GET /ns/{namespace}/document/{id}?include=chunks,memories` | Read a document and its derived data |
| `PATCH /ns/{namespace}/document/{id}` | Update content or metadata |
| `POST /ns/{namespace}/document/file/{id}`, `PATCH .../file/{id}` | Replace or partially update a file document |
| `DELETE /ns/{namespace}/document` with `{ "ids": [...] }` | Delete 1 to 100 documents |
| `POST /ns/{namespace}/search` | Search memories, chunks, or both |
| `POST /ns/{namespace}/profile` | Read the maintained profile |
| `GET`, `PUT`, `DELETE /ns/{namespace}/profile/buckets` | Manage named profile buckets |
| `POST /ns/{namespace}/list/{documents\|chunks\|memories}?page&limit&sort&order` | Paginated listing, optional `filter` in the body |
| `GET /ns/{namespace}/memories/{id}?include=related,documents` | Read one memory and its history |
| `DELETE /ns/{namespace}/memories` with `{ "ids": [...] }` | Forget exact memories |
| `DELETE /ns/{namespace}/memories/semantic` with `{ "query", "dryRun" }` | Find memories by meaning, preview first |
| `GET /namespaces`, `GET /ns/{namespace}`, `PATCH /ns/{namespace}`, `DELETE /ns/{namespace}?moveTo=` | Namespace list, settings, delete or move |
| `GET /connectors`, `/ns/{namespace}/connectors...` | OAuth and config connectors (Notion, Drive, web crawler, S3, ...) |
| `GET`, `PATCH /organization` | Organization-wide settings |

Where parameters go: `GET` options in the query string. `POST`, `PATCH`, `PUT` options in the JSON body, or form fields for file uploads. List pagination stays in the query string. Wrong placement returns `400`.

## SDK quickstart

The one rule for both SDKs: URL values first as positional arguments (namespace, then id when there is one), then one object with everything else.

```ts
import { Supermemory } from "supermemory"

const client = new Supermemory() // reads SUPERMEMORY_API_KEY

await client.add("user_alex", {
  content: "Alex prefers morning meetings and works in design.",
  id: "conv_2026_10_14",
  metadata: { source: "chat" },
  dreaming: "instant",
})

const { results } = await client.search("user_alex", { query: "when does Alex like to meet?", limit: 5 })
const { profile } = await client.profile("user_alex")
```

```python
from supermemory import Supermemory

client = Supermemory()  # reads SUPERMEMORY_API_KEY

client.add("user_alex", content="Alex prefers morning meetings.", id="conv_2026_10_14", dreaming="instant")
response = client.search("user_alex", query="when does Alex like to meet?", limit=5)
profile = client.profile("user_alex")
```

Method map (identical in Python with snake_case):

| Call | Endpoint |
| --- | --- |
| `client.add(namespace, { content, id?, metadata?, supportingContext?, group?, date?, taskType?, dreaming? })` | `POST /ns/{ns}/document` |
| `client.search(namespace, { query, searchMode?, limit?, threshold?, filter?, include?, rerank?, rewriteQuery? })` | `POST /ns/{ns}/search` |
| `client.profile(namespace, { filter?, buckets? })` | `POST /ns/{ns}/profile` |
| `client.list(namespace, "documents" \| "chunks" \| "memories", { page?, limit?, sort?, order?, filter? })` | `POST /ns/{ns}/list/{type}` |
| `client.documents.get(namespace, id, { include? })`, `.update`, `.delete(namespace, { ids })`, `.batchAdd`, `.uploadFile`, `.replaceWithFile`, `.updateFile` | `/ns/{ns}/document...` |
| `client.memories.forget(namespace, { ids })`, `.forgetMatching(namespace, { query, dryRun })` | `/ns/{ns}/memories...` |
| `client.profiles.getBuckets`, `.setBuckets`, `.deleteBuckets` | `/ns/{ns}/profile/buckets` |
| `client.namespaces.list`, `.get`, `.update`, `.delete(namespace, { moveTo? })` | `/namespaces`, `/ns/{ns}` |
| `client.connectors.listAll`, `.list`, `.create`, `.get`, `.update`, `.delete`, `.sync` | `/connectors`, `/ns/{ns}/connectors...` |
| `client.organization.get`, `.update` | `/organization` |

## Search options

| Option | Values | Default | Use |
| --- | --- | --- | --- |
| `searchMode` | `hybrid`, `memories`, `chunks` | `hybrid` | `memories` for learned facts, `chunks` for RAG over source text, `hybrid` for both in one ranked list |
| `threshold` | 0 to 1 | `0.3` | raise for precision, lower for recall |
| `limit` | integer | `10` | |
| `rerank` | `none`, `order`, `aggregate` | `none` | `order` reorders, `aggregate` merges overlapping results |
| `rewriteQuery` | boolean | `false` | expand vague or conversational queries |
| `include` | `{ documents, related, forgotten }` booleans | all `false` | attach the source document, related memory versions, or forgotten memories |
| `filter` | typed expression, see below | none | metadata filtering |

Each result carries `id`, `memory` or `chunk` (sometimes both), `similarity`, `metadata`, `isLatest`, `isInference`, `system` timestamps, and `included` when requested. Branch on field presence.

## Typed filters

One `filter` object, shared by search, profile, and list. No JSON strings.

```ts
filter: {
  operator: "and",
  operands: [
    { field: "source", operator: "eq", value: "slack" },
    { field: "priority", operator: "gte", value: 3 },
  ],
}
```

Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `notContains`, `arrayContains`, `arrayNotContains`, plus `and` / `or` with `operands`. Field names are literal: `customer.plan` is one key, not a path. Up to five nested levels and 200 operands per group.

## Patterns

**Chatbot or assistant.** Before answering: `profile(namespace)` for standing facts, `search(namespace, { query: userMessage })` for relevant memories. After the turn: `add(namespace, { content: turnText, id: sessionId })`. Reusing the session id keeps one conversation as one evolving document.

**RAG over a knowledge base.** Ingest with `taskType: "superrag"` when you want indexing without memory extraction. Query with `searchMode: "chunks"` and `include: { documents: true }` when the answer needs the source.

**Multi-tenant.** One namespace per end user, or per user and project (`user_123`, `user_123_project_abc`). Shared company knowledge goes in its own namespace; read it with a second search and merge by score.

**Forgetting.** Preview with `memories.forgetMatching(namespace, { query, dryRun: true })`, review `matches[].id`, then `memories.forget(namespace, { ids })`. Re-running the semantic request with `dryRun: false` can select a different set.

**Waiting for processing.** Poll `documents.get(namespace, id)` until `system.status === "done"`. Memory formation under `dreaming: "dynamic"` can finish minutes later; the REST read exposes it as `system.dreamingStatus`, which the 5.0.x SDK types do not declare yet. If the next step reads memories or the profile, ingest with `dreaming: "instant"`.

## Never emit

These are legacy or invented and fail or mislead on v5:

- `containerTag`, `containerTags`, `container_tag` anywhere. The namespace is the URL path or the first SDK argument.
- `customId` (now `id`), `entityContext` (now `supportingContext`), `filterByMetadata` (now `group`), `documentDate` (now `date`), `q` (now `query`), `filters` as a JSON string (now typed `filter`), `searchMode: "documents"` (now `"chunks"`), `rerank: true` (now `"order"` or `"aggregate"`).
- Paths with `/v3/`, `/v4/`, or `/v5/` in them, `/v1/search`, `GET /search`.
- Headers `x-api-key`, `x-supermemory-api-key`, `x-project-id`, `X-Workspace-Id`. Only `Authorization: Bearer`.
- SDK methods `client.search.execute`, `client.search.memories`, `client.documents.list`, `client.memories.list`, `client.memories.add`, `client.memories.updateMemory`, `client.conversations.add`, `client.connections.*`, `client.settings.*`, `client.containerTags.*`, `client.profile({ containerTag, q })`.
- A profile call with a query. Profile returns the maintained profile; run a separate search for ranked results.
- Invented options: `chunk_threshold`, `sort` on search, `include_content`, `include_full_docs`, `isStatic` on add.

## Integrations

- **`@supermemory/tools` 3.x**: `supermemoryTools(apiKey, { namespace })` for Vercel AI SDK, `withSupermemory(model, { namespace, id })` middleware for AI SDK, OpenAI, Mastra, and VoltAgent, `createClaudeMemoryTool(apiKey, { namespace })` for Claude. Import from subpaths such as `@supermemory/tools/ai-sdk`. `@supermemory/ai-sdk` is retired.
- **CLI**: `npx supermemory` ships in the npm package. `supermemory add`, `search`, `profile`, `forget`, `docs`, `namespaces`, `connectors`, `migrate`, `setup`, `plugin`. See the `supermemory-cli` skill.
- **MCP**: `https://mcp.supermemory.ai` for Claude, Cursor, and other MCP clients.
- **Self-hosted**: `supermemory local` runs the free single-binary server; point the SDK at it with `baseUrl`.

## Reference files

- `references/quickstart.md`: keys, install, first add, search, and profile in both SDKs, and how to wait for processing.
- `references/sdk-guide.md`: every SDK method with options, responses, errors, retries, and timeouts.
- `references/api-reference.md`: every REST endpoint with request and response shapes and cURL examples.
- `references/sdk-integrations.md`: `@supermemory/tools` and framework integration code.
- `references/use-cases.md`: complete examples for a chatbot, a task assistant, RAG, support, and multi-tenant apps.
- `references/architecture.md`: how documents become memories, versioning, and retrieval.

Live sources of truth: the [v5 API reference](https://api.supermemory.ai/v5/reference), the [docs](https://supermemory.ai/docs), the [v5 migration guide](https://supermemory.ai/docs/migration/api-v5), and the SDK READMEs on [GitHub](https://github.com/supermemoryai).
