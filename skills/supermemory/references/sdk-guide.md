# Supermemory SDK Guide (v5)

Covers the TypeScript SDK (`supermemory` 5.x on npm) and the Python SDK (`supermemory` 5.x on PyPI). Both are generated from the same v5 OpenAPI spec, so method names and options match; Python uses snake_case.

## Install

```bash
npm i supermemory          # TypeScript, Node 18+, Bun, Deno, browsers, edge
pip install -U supermemory # Python 3.10+
```

## Client

```ts
import { Supermemory } from "supermemory"

const client = new Supermemory()                       // reads SUPERMEMORY_API_KEY
const custom = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY,
  baseUrl: "http://localhost:6767",                   // self-hosted or supermemory local
  timeoutInSeconds: 120,                               // default 60
  maxRetries: 3,                                       // default 2
  headers: { "x-request-source": "billing-worker" },
  logging: { level: "debug" },                         // optional request logging
})
```

```python
from supermemory import Supermemory, AsyncSupermemory

client = Supermemory()  # reads SUPERMEMORY_API_KEY, SUPERMEMORY_BASE_URL, SUPERMEMORY_CUSTOM_HEADERS
custom = Supermemory(
    api_key="sm_...",
    base_url="http://localhost:6767",
    timeout=20.0,            # seconds, default 60 (5 to connect)
    max_retries=5,           # default 2
    default_headers={"X-App": "my-app"},
)
async_client = AsyncSupermemory()
```

Retries: connection errors, 408, 429 and 5xx are retried twice with exponential backoff, honoring `Retry-After`.

## The one rule

URL values come first as positional arguments: the namespace, then the id when the route has one. Everything else (query parameters and the JSON body together) goes in one object in TypeScript or as keyword arguments in Python.

```ts
await client.add("user_alex", { content: "...", dreaming: "instant" })
await client.documents.get("user_alex", "doc-1", { include: ["chunks"] })
await client.organization.update({ organizationalContext: "..." })   // no URL values
```

```python
client.add("user_alex", content="...", dreaming="instant")
client.documents.get("user_alex", "doc-1", include=["chunks"])
client.organization.update(organizational_context="...")
```

A namespace is any string matching `^[a-zA-Z0-9_:-]+$`, up to 100 characters. One call touches exactly one namespace.

## Method map

| TypeScript | Python | Endpoint |
| --- | --- | --- |
| `client.add(ns, {...})` | `client.add(ns, content=...)` | `POST /ns/{ns}/document` |
| `client.search(ns, {...})` | `client.search(ns, query=...)` | `POST /ns/{ns}/search` |
| `client.profile(ns, {...})` | `client.profile(ns, ...)` | `POST /ns/{ns}/profile` |
| `client.profileMarkdown(ns, {...})` | not in Python | same, `Accept: text/markdown` |
| `client.list(ns, type, {...})` | `client.list(ns, type, ...)` | `POST /ns/{ns}/list/{type}` |
| `client.documents.get / update / delete / batchAdd / uploadFile / replaceWithFile / updateFile` | `client.documents.get / update / delete / batch_add / upload_file / replace_with_file / update_file` | `/ns/{ns}/document...` |
| `client.memories.forget / forgetMatching / get` | `client.memories.forget / forget_matching / get` | `/ns/{ns}/memories...` |
| `client.profiles.getBuckets / setBuckets / deleteBuckets` | `client.profiles.get_buckets / set_buckets / delete_buckets` | `/ns/{ns}/profile/buckets` |
| `client.namespaces.list / get / update / delete` | same | `/namespaces`, `/ns/{ns}` |
| `client.connectors.listAll / list / create / get / update / delete / sync` | `client.connectors.list_all / list / create / get / update / delete / sync` | `/connectors`, `/ns/{ns}/connectors...` |
| `client.organization.get / update` | same | `/organization` |

## Add documents

### `add`

```ts
const { id, status } = await client.add("user_alex", {
  content: "Alex prefers morning meetings.",   // text or a URL
  id: "pref-1",                                 // optional caller id; reuse it to append to the same document
  metadata: { source: "chat", priority: 3 },
  supportingContext: "Notes from the onboarding call", // guides extraction, max 1500 chars
  group: { thread: "t_42" },                    // metadata values that isolate related context
  date: "2026-10-01T09:00:00Z",                 // when the source content is from
  taskType: "memory",                           // "memory" (default) or "superrag"
  dreaming: "instant",                          // "dynamic" (default) or "instant"
})
```

```python
ref = client.add(
    "user_alex",
    content="Alex prefers morning meetings.",
    id="pref-1",
    metadata={"source": "chat", "priority": 3},
    supporting_context="Notes from the onboarding call",
    group={"thread": "t_42"},
    date="2026-10-01T09:00:00Z",
    task_type="memory",
    dreaming="instant",
)
```

Response: `{ id, status }`. `status` is one of `unknown`, `queued`, `extracting`, `chunking`, `embedding`, `indexing`, `done`, `failed`. `queued` means new work started; a duplicate can come back as `done` immediately.

- `taskType: "memory"` extracts memories. `"superrag"` indexes the source for chunk search without forming memories.
- `dreaming: "dynamic"` groups related documents, so memories can take minutes to appear. `"instant"` forms memories per document right away and bills one extra operation.

### `documents.batchAdd`

```ts
const { results, count, failed } = await client.documents.batchAdd("user_alex", {
  documents: [
    { content: "first", id: "doc_1", metadata: { source: "import" } },
    { content: "https://example.com/post", id: "doc_2" },
  ],
  dreaming: "instant",   // taskType and dreaming apply to every item
})
```

```python
batch = client.documents.batch_add(
    "user_alex",
    documents=[{"content": "first", "id": "doc_1"}, {"content": "second", "id": "doc_2"}],
    dreaming="instant",
)
```

1 to 600 documents per call. `results` lists accepted items first in request order, then failed ones; match by `id`. `count` is accepted, `failed` is failed, and one batch can hold both.

### `documents.uploadFile`

Multipart upload. `metadata` and `group` are JSON strings here, not objects.

```ts
import { openAsBlob } from "node:fs"

await client.documents.uploadFile("user_alex", { file: await openAsBlob("notes.pdf") })
await client.documents.uploadFile("user_alex", {
  file: new File(["# Notes"], "notes.md"),      // File, Blob, Node stream, or Uint8Array
  metadata: JSON.stringify({ source: "upload" }),
  fileType: "text",                              // text | pdf | image | video | audio, only if inference fails
  mimeType: "text/markdown",
})
```

```python
with open("notes.pdf", "rb") as f:
    client.documents.upload_file("user_alex", file=f, metadata='{"source": "upload"}')
```

Returns `{ id, status }`. Extraction continues in the background; poll the document.

## Read, update, delete documents

### `documents.get`

```ts
const doc = await client.documents.get("user_alex", "pref-1", { include: ["chunks", "memories"] })
doc.system.status          // processing state
// The REST read also returns system.dreamingStatus; the 5.0.x SDK types do not declare it yet
doc.chunks                 // present only when requested; [] when requested and empty
doc.memories
```

```python
doc = client.documents.get("user_alex", "pref-1", include=["chunks", "memories"])
```

Fields: `id`, `title`, `type`, `summary`, `content`, `metadata`, `system { status, dreamingStatus, createdAt, updatedAt }`, plus `chunks` and `memories` when included. Under `dreaming: "dynamic"`, `status` can be `done` minutes before `dreamingStatus` is, so wait on `dreamingStatus` before reading memories or the profile.

### `documents.update`

Same options as `add` except `id` is positional. Sending `content` appends or diffs into the document.

```ts
await client.documents.update("user_alex", "pref-1", { metadata: { reviewed: true } })
```

```python
client.documents.update("user_alex", "pref-1", metadata={"reviewed": True})
```

### `documents.replaceWithFile` and `documents.updateFile`

```ts
await client.documents.replaceWithFile("user_alex", "pref-1", { file })        // POST, file required
await client.documents.updateFile("user_alex", "pref-1", { metadata: JSON.stringify({ v: 2 }) }) // PATCH, file optional
```

```python
client.documents.replace_with_file("user_alex", "pref-1", file=f)
client.documents.update_file("user_alex", "pref-1", metadata='{"v": 2}')
```

### `documents.delete`

```ts
const { count, errors } = await client.documents.delete("user_alex", { ids: ["pref-1", "doc_2"] })
```

```python
result = client.documents.delete("user_alex", ids=["pref-1", "doc_2"])
```

1 to 100 Supermemory or caller-defined ids. HTTP 200 can still carry per-id `errors`; successful deletions are not rolled back.

## Search

```ts
const { results, searchTime } = await client.search("user_alex", {
  query: "when does Alex like to meet?",
  searchMode: "hybrid",          // hybrid (default) | memories | chunks
  limit: 10,                     // default 10
  threshold: 0.3,                // 0 to 1, default 0.3
  rerank: "none",                // none (default) | order | aggregate
  rewriteQuery: false,           // default false, adds about 400ms
  include: { documents: false, related: false, forgotten: false },
  filter: { field: "source", operator: "eq", value: "chat" },
})
```

```python
response = client.search(
    "user_alex",
    query="when does Alex like to meet?",
    search_mode="hybrid",
    limit=10,
    threshold=0.3,
    rerank="none",
    rewrite_query=False,
    include={"documents": False, "related": False, "forgotten": False},
    filter={"field": "source", "operator": "eq", "value": "chat"},
)
```

| Option | Values | Default | Notes |
| --- | --- | --- | --- |
| `searchMode` | `hybrid`, `memories`, `chunks` | `hybrid` | `memories` returns learned facts, `chunks` returns source passages |
| `limit` | integer | `10` | |
| `threshold` | 0 to 1 | `0.3` | raise for precision, lower for recall |
| `rerank` | `none`, `order`, `aggregate` | `none` | `order` reorders, `aggregate` also merges overlapping context |
| `rewriteQuery` | boolean | `false` | expands conversational or vague queries |
| `include.documents` | boolean | `false` | attach the source document to each result |
| `include.related` | boolean | `false` | attach parent, child and sibling memories, same namespace and filter only |
| `include.forgotten` | boolean | `false` | let forgotten and expired memories appear |
| `filter` | filter expression | none | see Filters |

### Reading results

Each item in `results` has `id`, `similarity` (0 to 1), `metadata`, `isLatest`, `isInference`, `system { createdAt, updatedAt }`, and one of:

- `memory`: a learned fact (memory results)
- `chunk`: a source passage (chunk results)

Branch on which field is present. When requested, `included.document` holds the source document and `included.related.{parents, children, siblings}` holds related memories, each with its `id`.

```ts
for (const r of results) {
  if (r.memory) console.log("memory", r.memory, r.similarity)
  else if (r.chunk) console.log("chunk", r.chunk, r.included?.document?.id)
}
```

## Profile

```ts
const { profile } = await client.profile("user_alex")
profile.static    // [{ id, memory }] durable facts
profile.dynamic   // [{ id, memory }] recent or evolving context
profile.buckets   // { [name]: [{ id, memory }] }

const narrowed = await client.profile("user_alex", {
  buckets: ["work"],                                              // up to 50 names; omit for every bucket
  filter: { field: "region", operator: "eq", value: "us-west" },
})

const markdown = await client.profileMarkdown("user_alex")       // string, same options
```

```python
profile = client.profile("user_alex").profile
profile.static, profile.dynamic, profile.buckets
narrowed = client.profile("user_alex", buckets=["work"])
```

Profile takes no query. For ranked results run `search` alongside it. Ids prefixed `aggregated_` are summaries synthesized from several memories.

### Buckets

Named profile sections. The namespace owns its buckets; organization buckets appear in reads but cannot be changed here.

```ts
const { buckets } = await client.profiles.getBuckets("user_alex")        // { work: "Professional preferences..." }
await client.profiles.setBuckets("user_alex", { buckets: { work: "Professional preferences and ongoing work" } }) // 1 to 50, upsert
await client.profiles.deleteBuckets("user_alex", { buckets: ["work"] })
```

```python
client.profiles.get_buckets("user_alex")
client.profiles.set_buckets("user_alex", buckets={"work": "Professional preferences and ongoing work"})
client.profiles.delete_buckets("user_alex", buckets=["work"])
```

## List

```ts
const { documents, pagination } = await client.list("user_alex", "documents", {
  page: 1,              // default 1
  limit: 50,            // default 10, max 100
  sort: "createdAt",    // createdAt (default) | updatedAt | position
  order: "desc",        // desc (default) | asc
  filter: { field: "source", operator: "eq", value: "chat" },
})
const { chunks } = await client.list("user_alex", "chunks")
const { memories } = await client.list("user_alex", "memories", { include: { forgotten: true } })
```

```python
page = client.list("user_alex", "documents", page=1, limit=50, sort="createdAt", order="desc")
for document in page.documents or []:
    print(document.id, document.title, document.system.status)
print(page.pagination.total_pages)
```

The response always has `documents`, `chunks`, `memories` and `pagination { currentPage, limit, totalItems, totalPages }`; only the requested type is populated. Document items carry `system.status` and `system.dreamingStatus`, so this replaces any "processing list". Chunk items carry `documentId` and `position`. Memory items carry `isStatic`, `isInference`, `isLatest`, `isForgotten`, `version`. Forgotten memories are hidden unless `include.forgotten` is true.

## Memories

Memories are formed from documents. There is no method to write one directly; add or update the source document instead.

### `memories.get`

```ts
const memory = await client.memories.get("user_alex", "mem_1", { include: ["related", "documents"], relatedLimit: 10 })
memory.version, memory.isLatest, memory.isForgotten, memory.included?.related?.parents
```

```python
memory = client.memories.get("user_alex", "mem_1", include=["related", "documents"], related_limit=10)
```

`relatedLimit` defaults to 10, max 100. A memory from another namespace returns 404.

### Forgetting

Preview semantically, review, then forget exact ids. Re-running the semantic call without `dryRun` can select a different set if memories changed in between.

```ts
const preview = await client.memories.forgetMatching("user_alex", { query: "outdated home address", dryRun: true })
const { count, matches, errors } = await client.memories.forget("user_alex", {
  ids: preview.matches.map((m) => m.id),   // 1 to 500 ids
})
```

```python
preview = client.memories.forget_matching("user_alex", query="outdated home address", dry_run=True)
client.memories.forget("user_alex", ids=[m.id for m in preview.matches])
```

Both return `{ count, matches, errors }`. `count` equals `matches.length`. `dryRun` is required on `forgetMatching`; `false` forgets whatever matches at execution time.

## Filters

One typed object, used by `search`, `profile` and `list`. Never a JSON string.

```ts
type Filter =
  | { field: string; operator: "eq" | "neq"; value: string; caseSensitive?: boolean }
  | { field: string; operator: "eq" | "neq"; value: number | boolean }
  | { field: string; operator: "gt" | "gte" | "lt" | "lte"; value: number }
  | { field: string; operator: "contains" | "notContains"; value: string; caseSensitive?: boolean }
  | { field: string; operator: "arrayContains" | "arrayNotContains"; value: string }
  | { operator: "and" | "or"; operands: Filter[] }
```

```python
filter = {
    "operator": "and",
    "operands": [
        {"field": "source", "operator": "eq", "value": "slack"},
        {"field": "priority", "operator": "gte", "value": 3},
    ],
}
client.search("user_alex", query="launch plans", filter=filter)
```

`caseSensitive` defaults to `true`. Field names are literal: `customer.plan` is one key, not a path. Up to five nested levels and 200 operands per group. Invalid shapes return 400.

## Namespaces

```ts
const { namespaces, pagination } = await client.namespaces.list({ page: 1, limit: 10 })   // newest first, limit up to 100
// each: { id, namespace, documentCount, memoryCount, description, system }

const one = await client.namespaces.get("project_alpha")   // { namespace, supportingContext, system }
await client.namespaces.update("project_alpha", { supportingContext: "Research project for distributed systems" }) // null clears it

await client.namespaces.delete("project_alpha")
// { status: "deleted", namespace, deletedDocumentsCount, deletedMemoriesCount }

await client.namespaces.delete("project_alpha", { moveTo: "project_archive" })
// 202 { status: "queued", operationId, namespace, moveTo }; the move continues asynchronously
```

```python
client.namespaces.list(page=1, limit=10)
client.namespaces.get("project_alpha")
client.namespaces.update("project_alpha", supporting_context="Research project for distributed systems")
client.namespaces.delete("project_alpha")
client.namespaces.delete("project_alpha", move_to="project_archive")
```

Namespaces are created implicitly by the first `add`. `moveTo` moves one source into one destination per call; branch on `status` (`deleted` or `queued`).

## Connectors

Providers: `notion`, `google-drive`, `onedrive`, `gmail`, `github`, `web-crawler`, `s3`, `granola`.

```ts
const { id, authorization } = await client.connectors.create("user_alex", {
  provider: "notion",
  redirectUrl: "https://app.example.com/connected",   // where the user lands after OAuth
  documentLimit: 500,
})
// authorization is null for config providers (web-crawler, s3, granola), which start syncing immediately

const { connectors } = await client.connectors.list("user_alex", { provider: "notion", page: 1, limit: 10 })
const all = await client.connectors.listAll({ page: 1, limit: 10 })          // every namespace
const connector = await client.connectors.get("user_alex", id, { include: ["syncs", "picker"], returnUrl: "https://app.example.com" })
await client.connectors.update("user_alex", id, { selection: { repos: ["org/repo"] }, documentLimit: 1000 })
await client.connectors.sync("user_alex", id)                                // 202 { id, status: "queued" }; 409 if a sync is running
await client.connectors.delete("user_alex", id, { deleteDocuments: false })  // { id, deleted }
```

```python
setup = client.connectors.create("user_alex", request={"provider": "notion", "redirect_url": "https://app.example.com/connected"})
client.connectors.list("user_alex", provider="notion")
client.connectors.list_all()
client.connectors.get("user_alex", setup.id, include=["syncs"])
client.connectors.update("user_alex", setup.id, document_limit=1000)
client.connectors.sync("user_alex", setup.id)
client.connectors.delete("user_alex", setup.id, delete_documents=False)
```

A connector object has `id`, `provider`, `namespace`, `account`, `capabilities`, `config`, `selection`, `documentLimit`, `documentCount`, `latestRun`, `system`, plus `authorization` while pending, `syncs` and `picker` when included.

## Organization

```ts
const { organizationalContext, namespaceCount } = await client.organization.get()
await client.organization.update({ organizationalContext: "Acme builds billing software for dental clinics." }) // null clears it
```

```python
client.organization.get()
client.organization.update(organizational_context="Acme builds billing software for dental clinics.")
```

## Errors

TypeScript: every non-2xx throws a typed error for the status. All extend `SupermemoryError`, which carries `statusCode`, `body` and `rawResponse`.

| Status | Class |
| --- | --- |
| 400 | `BadRequestError` |
| 401 | `UnauthorizedError` |
| 402 | `PaymentRequiredError` |
| 403 | `ForbiddenError` |
| 404 | `NotFoundError` |
| 409 | `ConflictError` |
| 500 | `InternalServerError` |
| 503 | `ServiceUnavailableError` |
| other | `SupermemoryError` with `statusCode` |
| timeout | `SupermemoryTimeoutError` |
| connection failure | `SupermemoryError` without `statusCode` |

```ts
import { Supermemory, NotFoundError, SupermemoryError, SupermemoryTimeoutError } from "supermemory"

try {
  await client.documents.get("user_alex", "missing")
} catch (err) {
  if (err instanceof NotFoundError) console.log("no such document", err.body)
  else if (err instanceof SupermemoryTimeoutError) console.log("timed out")
  else if (err instanceof SupermemoryError) console.log(err.statusCode, err.body)
  else throw err
}
```

Python: non-2xx raises a subclass of `supermemory.APIStatusError` with `status_code`, `body`, `message`, `request`, `response`. Network failures raise `APIConnectionError`, timeouts `APITimeoutError`.

| Status | Exception |
| --- | --- |
| 400 | `BadRequestError` |
| 401 | `AuthenticationError` |
| 403 | `PermissionDeniedError` |
| 404 | `NotFoundError` |
| 409 | `ConflictError` |
| 422 | `UnprocessableEntityError` |
| 429 | `RateLimitError` |
| >=500 | `InternalServerError` |

```python
import supermemory

try:
    client.documents.get("user_alex", "missing-id")
except supermemory.NotFoundError:
    ...
except supermemory.RateLimitError as e:
    print(e.response.headers.get("retry-after"))
except supermemory.APIStatusError as e:
    print(e.status_code, e.body)
except supermemory.APIConnectionError:
    ...
```

## Per-call options

```ts
await client.search("user_alex", { query: "meetings" }, { maxRetries: 0, timeoutInSeconds: 5, abortSignal, headers: { "X-Trace": "1" }, queryParams: {} })
```

```python
import httpx

client.with_options(max_retries=0, timeout=httpx.Timeout(5.0)).search("user_alex", query="...")
client.search("user_alex", query="...", extra_headers={"X-Trace": "1"}, timeout=5)

response = client.with_raw_response.search("user_alex", query="...")   # headers, then response.parse()
```

Response models in Python have `.to_dict()` and `.to_json()`; types import from `supermemory.types` (for example `SearchResponse`). TypeScript exports request and response types from the package root (`SearchResponse`, `Document`, `Connector`).

## Async Python

```python
import asyncio
from supermemory import AsyncSupermemory

client = AsyncSupermemory()

async def main() -> None:
    profile, results = await asyncio.gather(
        client.profile("user_alex"),
        client.search("user_alex", query="upcoming meetings"),
    )

asyncio.run(main())
```

Install `supermemory[aiohttp]` to use aiohttp as the transport. To read several namespaces, fan out one call per namespace and merge the results; no call accepts more than one namespace.

## Legacy names you will see in old code

Pre-5.0 SDKs targeted the v3/v4 API, which shuts down on December 31, 2026. `npx supermemory@latest migrate` upgrades a project with a coding agent. Translation table:

| Legacy (TS 4.x / Python 3.x) | v5 |
| --- | --- |
| `client.add({ content, containerTag, customId })` | `client.add(namespace, { content, id })` |
| `client.search.execute({ q, containerTags })`, `search.documents` | `client.search(namespace, { query, searchMode: "chunks" })` |
| `client.search.memories({ q, containerTag })` | `client.search(namespace, { query, searchMode: "memories" })` |
| `client.profile({ containerTag, q })` | `client.profile(namespace)` plus a separate `client.search` |
| `client.documents.list({ containerTags })`, `client.memories.list(...)` | `client.list(namespace, "documents" \| "memories")` |
| `client.documents.get(id)`, `.update(id, ...)`, `.delete(id)`, `.deleteBulk({ ids })` | `client.documents.get(namespace, id)`, `.update(namespace, id, ...)`, `.delete(namespace, { ids })` |
| `client.documents.chunks(id)`, `.listProcessing()`, `.fileUrl()` | `documents.get(namespace, id, { include: ["chunks"] })`, `list(namespace, "documents")` and read `system.status`, no replacement |
| `client.conversations.add({ containerTag, messages })` | `client.add(namespace, { content, id: sessionId })` |
| `client.memories.add(...)`, `.updateMemory(...)` | removed; add or update the source document |
| `client.memories.forget({ id })`, `.forgetMatching({ query })` | `memories.forget(namespace, { ids })`, `memories.forgetMatching(namespace, { query, dryRun })` |
| `client.connections.*` | `client.connectors.*` (`create`, `list`, `listAll`, `get`, `update`, `delete`, `sync`) |
| `client.containerTags.*`, `containerTags.merge` | `client.namespaces.*`, `namespaces.delete(source, { moveTo })` |
| `client.settings.get / update`, `settings.reset`, `settings.suggestBuckets` | `client.organization.get / update`, no replacement, no replacement |
| `containerTag` / `containerTags` / `container_tag` | the namespace argument |
| `customId` / `custom_id` | `id` |
| `entityContext` | `supportingContext` |
| `filterByMetadata` | `group` |
| `documentDate` | `date` |
| `q` | `query` |
| `filters` (JSON string) | `filter` (typed object) |
| `searchMode: "documents"` | `searchMode: "chunks"` |
| `rerank: true`, `aggregate: true` | `rerank: "order"`, `rerank: "aggregate"` |
| `include.relatedMemories`, `include.forgottenMemories`, `include.summaries` | `include.related`, `include.forgotten`, `include.documents` |
| `baseURL`, `timeout` (ms), `defaultHeaders` (TS) | `baseUrl`, `timeoutInSeconds`, `headers` |
| `APIError`, `AuthenticationError`, `RateLimitError` (TS) | `SupermemoryError`, `UnauthorizedError`, `SupermemoryError` with `statusCode` 429 |

Defaults changed too: search threshold `0.6` became `0.3`, and the default mode `memories` became `hybrid`. Set both explicitly while comparing old and new behavior.
