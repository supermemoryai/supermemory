# Supermemory v5 API Reference

Every content route lives under one namespace. Routes are unversioned; `/v5/reference` is the interactive reference at `https://api.supermemory.ai/v5/reference`, not a path prefix. The live spec is `https://api.supermemory.ai/v5/openapi`.

## Base URL and authentication

```
https://api.supermemory.ai
```

Self-hosted: your instance URL, for example `http://localhost:6767`.

Every request sends a bearer API key. No other auth header exists.

```
Authorization: Bearer sm_...
```

## Where parameters go

| Request | Options go in |
| --- | --- |
| `GET` | Query string (`include`, `page`, `limit`, `provider`, ...) |
| `POST`, `PATCH`, `PUT` | JSON body, or multipart form fields on file routes |
| `POST /ns/{namespace}/list/{type}` | Pagination (`page`, `limit`, `sort`, `order`) in the query string, `filter` and `include` in the body |
| `DELETE /ns/{namespace}` | `moveTo` in the query string |
| `DELETE /ns/{namespace}/document`, `DELETE /ns/{namespace}/memories` | `ids` in the JSON body |
| `DELETE /ns/{namespace}/connectors/{id}` | `deleteDocuments` in the query string |

Options sent in the wrong place return `400`. Ingest and search routes take no query parameters.

## Documents

### POST /ns/{namespace}/document

Add text or a URL. Reusing an existing `id` appends or diffs the new content into that document and keeps its history.

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `content` | string | yes | | Plain text or a URL to supported rich content |
| `id` | string, max 255 | no | generated | Caller-defined document ID |
| `supportingContext` | string, max 1500 | no | | Guides memory extraction for this document |
| `metadata` | object | no | `{}` | Attached to the document and everything derived from it |
| `group` | object | no | | Metadata values that isolate related context within the namespace |
| `date` | ISO 8601 string | no | now | When the source content is from |
| `taskType` | `memory`, `superrag` | no | `memory` | `superrag` indexes for retrieval without forming memories |
| `dreaming` | `dynamic`, `instant` | no | `dynamic` | `instant` processes the document alone right away and bills one extra operation |

```json
{"content":"Alex prefers morning meetings.","id":"conv_1","metadata":{"source":"chat"},"dreaming":"instant"}
```

Response `200`: `{ "id": "doc_...", "status": "queued" }`. `status` is the document's processing state after this request: `queued` when new work was queued, otherwise its current state (for example `done` for an unchanged duplicate).

Errors: `400`, `401`, `402` insufficient credits, `403` namespace write access denied, `409` namespace merge or file path conflict.

### POST /ns/{namespace}/document/batch

Add 1 to 600 documents in one request.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `documents` | array of `{ content, id?, supportingContext?, metadata?, group?, date? }` | yes | Per-document fields, same meaning as the single add |
| `taskType` | `memory`, `superrag` | no | Applies to every item |
| `dreaming` | `dynamic`, `instant` | no | Applies to every item |

```json
{"documents":[{"content":"first","id":"doc_1"},{"content":"second","id":"doc_2"}],"dreaming":"instant"}
```

Response `200`:

```json
{"results":[{"id":"doc_1","status":"queued"},{"id":"doc_2","status":"error","error":"...","details":"..."}],"count":1,"failed":1}
```

Accepted documents come first in request order, then failed ones. Match results by `id`, or by `url` for a failed item that had no ID. Per-item `status` is a processing state or `error`. One batch can mix successes and failures.

### POST /ns/{namespace}/document/file

Upload a file as `multipart/form-data`.

| Part | Type | Required | Meaning |
| --- | --- | --- | --- |
| `file` | binary | yes | File contents |
| `supportingContext` | string, max 1500 | no | Extraction guidance |
| `metadata` | JSON-encoded string | no | Document metadata |
| `group` | JSON-encoded string | no | Isolation group |
| `date` | ISO 8601 string | no | Source date |
| `taskType` | `memory`, `superrag` | no | Pipeline |
| `dreaming` | `dynamic`, `instant` | no | Processing mode |
| `fileType` | `text`, `pdf`, `image`, `video`, `audio` | no | Only when inference is insufficient |
| `mimeType` | string | no | Only when upload metadata is insufficient |

Response `200`: `{ id, status }`, same as a JSON add. The file is acknowledged once durably accepted; extraction continues in the background, so poll the document.

### GET /ns/{namespace}/document/{id}

Read a document by Supermemory ID or caller-defined ID. `id` resolves only inside this namespace.

| Query | Values | Meaning |
| --- | --- | --- |
| `include` | comma-separated `chunks`, `memories` | Attach child resources |

Response `200`:

```json
{"id":"doc_1","title":null,"type":"text","summary":null,"content":"...","metadata":{"source":"chat"},
 "system":{"status":"done","dreamingStatus":"dreaming","createdAt":"...","updatedAt":"..."},
 "chunks":[{"id":"...","position":0,"content":"...","type":"text","metadata":{},"system":{}}],
 "memories":[{"id":"mem_1","memory":"...","metadata":{},"isStatic":false,"isInference":false,"isLatest":true,"isForgotten":false,"version":1,"system":{}}]}
```

`chunks` and `memories` are present only when requested; a requested key with no results is `[]`. Errors: `404` when the document is not in this namespace.

### PATCH /ns/{namespace}/document/{id}

Update a text or URL document in place. Body is any non-empty subset of `content`, `supportingContext`, `metadata`, `group`, `date`, plus optional `taskType` and `dreaming` (those two alone do not count as a change). Supplied `content` replaces the canonical source and is reprocessed; omitted fields stay unchanged.

```json
{"content":"corrected source","metadata":{"revision":2}}
```

Response `200`: `{ id, status }`. Errors: `404` not found in this namespace, `409` while a conflicting operation is still processing.

### POST /ns/{namespace}/document/file/{id}

Replace a file-backed document. Same multipart parts as upload; `file` is required. Content and caller metadata are overwritten, omitted supporting fields are cleared, then the document is reprocessed. Response `200`: `{ id, status }`.

### PATCH /ns/{namespace}/document/file/{id}

Partially update a file-backed document. Same parts, all optional. Include `file` to replace the source while keeping omitted fields; omit it for metadata-, group-, context-, or date-only changes. Response `200`: `{ id, status }`.

### DELETE /ns/{namespace}/document

Delete 1 to 100 documents by Supermemory or caller-defined ID. Each ID is handled independently.

```json
{"ids":["doc_1","external_id_2"]}
```

Response `200`: `{ "count": 1, "errors": [{"id": "external_id_2", "error": "..."}] }`. HTTP success can include partial failures, so read both fields.

## Search

### POST /ns/{namespace}/search

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `query` | string | yes | | Natural-language question or phrase |
| `searchMode` | `hybrid`, `memories`, `chunks` | no | `hybrid` | `memories` returns learned facts, `chunks` returns source passages, `hybrid` ranks both together |
| `limit` | integer 1 to 100 | no | `10` | Maximum results |
| `threshold` | number 0 to 1 | no | `0.3` | Minimum relevance; raise for precision, lower for recall |
| `filter` | filter expression | no | | Metadata filter, see Typed filters |
| `include` | `{ documents?, related?, forgotten? }` booleans | no | all `false` | Attach the source document, related memories, or let forgotten memories appear |
| `rerank` | `none`, `order`, `aggregate` | no | `none` | `order` reorders results, `aggregate` also merges overlapping context |
| `rewriteQuery` | boolean | no | `false` | Expand underspecified queries before retrieval, adds latency |

```json
{"query":"when does Alex like to meet?","searchMode":"memories","limit":5,"threshold":0.5}
```

Response `200`:

```json
{
  "results": [
    {
      "id": "mem_1",
      "memory": "Alex prefers morning meetings",
      "metadata": {},
      "similarity": 0.91,
      "isLatest": true,
      "isInference": false,
      "system": {"createdAt": "...", "updatedAt": "..."},
      "included": {
        "document": {"id": "doc_1", "title": null, "type": "text", "summary": null, "metadata": {}, "system": {}},
        "related": {"parents": [], "children": [], "siblings": []}
      }
    }
  ],
  "searchTime": 42
}
```

A result carries `memory` (memory results) or `chunk` (chunk results), sometimes both in hybrid mode. Branch on field presence. `included` appears only when requested. Related entries are `{ id, relation, version, memory, metadata, system }` with `relation` one of `updates`, `extends`, `derives`; they come only from this namespace and must match `filter`.

Errors: `402` when search quota or credits are exhausted, `403` when the key cannot access this namespace.

## Profile and buckets

### POST /ns/{namespace}/profile

Returns the maintained profile. No query, no threshold. Send `{}` for the full profile.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `filter` | filter expression | no | Build the profile from matching memories only |
| `buckets` | array of names, max 50 | no | Narrow the `buckets` section; omit to return every effective bucket |

Response `200`:

```json
{
  "profile": {
    "static": [{"id": "mem_1", "memory": "The user works in design"}],
    "dynamic": [{"id": "mem_2", "memory": "The user is preparing a launch"}],
    "buckets": {"work": [{"id": "mem_3", "memory": "Prefers concise project updates"}]}
  }
}
```

`static` and `dynamic` are always present. An `id` prefixed `aggregated_` is a summary synthesized from several memories. Send `Accept: text/markdown` to receive the profile as markdown instead.

### GET /ns/{namespace}/profile/buckets

Response `200`: `{ "buckets": { "work": "Professional preferences and ongoing work" } }`. Combines organization-wide buckets with namespace-owned ones.

### PUT /ns/{namespace}/profile/buckets

```json
{"buckets":{"work":"Professional preferences and ongoing work"}}
```

One to 50 name-to-description entries. Existing namespace buckets are updated, new names are added, omitted ones stay. Response `200`: the effective bucket map. `409` when a name belongs to an organization-level bucket.

### DELETE /ns/{namespace}/profile/buckets

```json
{"buckets":["work"]}
```

One to 50 names. Unknown names are ignored, organization-level buckets return `409`. Response `200`: the effective bucket map.

## Lists

### POST /ns/{namespace}/list/{type}

`type` is `documents`, `chunks`, or `memories`.

| Query | Values | Default |
| --- | --- | --- |
| `page` | integer from 1 | `1` |
| `limit` | 1 to 100 | `10` |
| `sort` | `createdAt`, `updatedAt`, `position` (chunks only) | `createdAt` |
| `order` | `asc`, `desc` | `desc` |

| Body field | Type | Meaning |
| --- | --- | --- |
| `filter` | filter expression | Metadata filter |
| `include` | `{ forgotten?: boolean }` | Memories only. `true` lists forgotten and expired memories with `isForgotten: true` |

```
POST /ns/user_1/list/documents?page=1&limit=50&sort=createdAt&order=desc
{}
```

Response `200` always has all four keys; only the selected array is populated.

```json
{
  "documents": [{"id": "doc_1", "title": null, "type": "text", "summary": null, "metadata": {}, "url": null, "system": {"status": "done", "dreamingStatus": "done", "createdAt": "...", "updatedAt": "..."}}],
  "chunks": [],
  "memories": [],
  "pagination": {"currentPage": 1, "limit": 50, "totalItems": 1, "totalPages": 1}
}
```

Chunk items add `position`, `content`, and `documentId`. Memory items are `{ id, memory, metadata, isStatic, isInference, isLatest, isForgotten, version, system }`. There is no separate processing list; read `system.status` and `system.dreamingStatus` on each document.

## Memories

### GET /ns/{namespace}/memories/{id}

| Query | Values | Default | Meaning |
| --- | --- | --- | --- |
| `include` | comma-separated `related`, `documents` | | `related` adds version history and connected memories, `documents` adds the source document |
| `relatedLimit` | 1 to 100 | `10` | Cap for each of parents, children, siblings |

Response `200`: `{ id, memory, metadata, isStatic, isInference, isLatest, isForgotten, version, system: { createdAt, updatedAt }, included? }`. `included.related` has `parents` (earlier versions), `children` (newer versions), `siblings` (connected by `extends` or `derives`); with both includes each related memory also carries `document`. A forgotten memory is still returned with `isForgotten: true`. A memory from another namespace is `404`.

### DELETE /ns/{namespace}/memories

Forget 1 to 500 memories by exact ID. Forgotten memories leave normal recall but keep their history.

```json
{"ids":["mem_1","mem_2"]}
```

### DELETE /ns/{namespace}/memories/semantic

Select memories by meaning.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `query` | string, max 2000 | yes | What should be forgotten |
| `dryRun` | boolean | yes | `true` previews without changing anything |

```json
{"query":"outdated home address","dryRun":true}
```

Both forget routes return the same envelope:

```json
{"count":1,"matches":[{"id":"mem_1","memory":"Old address"}],"errors":[{"id":"mem_2","error":"Memory not found"}]}
```

`count` equals `matches.length`. For a reviewable workflow: semantic request with `dryRun: true`, review `matches[].id`, then the exact-ID route. Re-running semantic forgetting with `dryRun: false` can select a different set if memories changed.

There is no route that writes memories directly. Ingest documents and update the source document when facts change.

## Namespaces

### GET /namespaces

`GET /ns` is an alias; prefer `/namespaces`. Query `page` (default `1`) and `limit` (1 to 100, default `10`). Newest first.

```json
{
  "namespaces": [{"id": "ns_...", "namespace": "user_1", "documentCount": 12, "memoryCount": 40, "description": null, "system": {"createdAt": "...", "updatedAt": "..."}}],
  "pagination": {"currentPage": 1, "limit": 10, "totalItems": 1, "totalPages": 1}
}
```

### GET /ns/{namespace}

Response `200`: `{ "namespace": "user_1", "supportingContext": null, "system": { "createdAt", "updatedAt" } }`. `404` when the namespace does not exist.

### PATCH /ns/{namespace}

```json
{"supportingContext":"Research project for distributed systems"}
```

`supportingContext` is a string up to 1500 characters or `null` to clear it. An empty body is `400`. Response `200`: the settings object.

### DELETE /ns/{namespace}

| Query | Meaning |
| --- | --- |
| `moveTo` | Destination namespace that receives the content first. Must differ from the source |

Without `moveTo`: synchronous, `200` with `{ "status": "deleted", "namespace", "deletedDocumentsCount", "deletedMemoriesCount" }`. With `moveTo`: `202` with `{ "status": "queued", "operationId", "namespace", "moveTo" }`, and the move completes asynchronously. Branch on `status`. One source per request; `409` while the namespace is busy.

## Connectors

Providers: `notion`, `google-drive`, `onedrive`, `gmail`, `github` use OAuth. `web-crawler`, `s3`, `granola` take config and start syncing immediately.

### POST /ns/{namespace}/connectors

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `provider` | one of the providers above | yes | |
| `redirectUrl` | URI | no | Where the user returns after authorizing (OAuth providers) |
| `documentLimit` | integer 1 to 10000 | no | Maximum documents imported |
| `config` | object | by provider | `google-drive`: `{ syncScope?: "selected" \| "full" }`. `s3`: `{ bucket, region, accessKeyId, secretAccessKey, endpoint?, prefix? }`. `web-crawler`: `{ startUrl, crawlDepth? }` (depth defaults to 3). `granola`: `{ apiKey }` |

```json
{"provider":"notion","redirectUrl":"https://app.example.com/connected"}
```

Response `201`: `{ "id": "conn_...", "authorization": { "url": "...", "expiresAt": "..." } }`. `authorization` is `null` for config providers. Send the user to `authorization.url`; the connector stays `pending_authorization` and is not listed until they finish. The URL expires after one hour. Errors: `402` plan does not include the provider, `503` provider unavailable.

### GET /ns/{namespace}/connectors and GET /connectors

List connectors in one namespace, or across every namespace the key can read. Query `provider`, `page`, `limit` (1 to 100). Response `{ connectors: [...], pagination }`.

### GET /ns/{namespace}/connectors/{id}

| Query | Meaning |
| --- | --- |
| `include` | comma-separated `syncs` (10 most recent runs with failed items), `picker` (one-time hosted picker link, needs admin write access) |
| `returnUrl` | Where the hosted picker sends the user when done |

Response `200`: `{ id, provider, namespace, account, capabilities: { selectable, webhooks }, config, selection, documentLimit, documentCount, latestRun, system: { status, createdAt, lastSuccessfulSyncAt }, syncs?, picker? }`. Each sync run is `{ id, trigger, itemsProcessed, itemsFailed, failures, error, errorCode, system }`.

`system.status` is `pending_authorization` or `active`. `trigger` is `event`, `cron`, or `manual`. Credentials are never returned.

### PATCH /ns/{namespace}/connectors/{id}

```json
{"selection":{"repos":["R_1","R_2"]},"documentLimit":500}
```

`selection` replaces the current one and starts a sync. GitHub takes `repos`, Gmail takes `labels`, Google Drive takes `files` and `folders`, each up to 500 IDs. `400` when the connector does not support selection. Response `200`: the connector.

### POST /ns/{namespace}/connectors/{id}/sync

No body. Response `202`: `{ "id", "status": "queued" }`. `409` while a sync is already running.

### DELETE /ns/{namespace}/connectors/{id}

Query `deleteDocuments` (default `true`) also removes the documents it imported. Response `200`: `{ "id", "deleted": true }`.

## Organization

### GET /organization

Response `200`: `{ "organizationalContext": "Acme builds security tools for enterprises", "namespaceCount": 42 }`.

### PATCH /organization

```json
{"organizationalContext":"Acme builds security tools for enterprises"}
```

`organizationalContext` is required: a string that replaces the existing context, or `null` to clear it. Empty strings are `400`. Requires an organization admin (`403` otherwise). Response `200`: same shape as GET.

## Feedback

### POST /feedback

Report a bug, feature request, or docs problem to the Supermemory team. Auth is optional when the request has a usable client IP.

| Field | Required | Meaning |
| --- | --- | --- |
| `type` | yes | `bug`, `feature_request`, `docs`, `other` |
| `title` | yes | One line, max 120 |
| `description` | yes | Max 5000 |
| `endpoint`, `requestId`, `expected`, `actual`, `client`, `contactEmail` | no | Context for the engineer |

Response `202`: `{ "id", "remaining" }` where `remaining` is submissions left until 00:00 UTC. `429` carries `Retry-After` in seconds.

## Processing status

`system.status` on documents: `unknown`, `queued`, `extracting`, `chunking`, `embedding`, `indexing`, `done`, `failed`.

`system.dreamingStatus` tracks memory formation separately: `dreaming` while memories for the latest content are queued, generating, or waiting for a retry, `done` once generated or when none were needed. Under `dreaming: "dynamic"`, `status` can reach `done` minutes before `dreamingStatus` does. Wait on `dreamingStatus` before reading memories or the profile, or ingest with `dreaming: "instant"`.

## Typed filters

One optional `filter` object, shared by search, profile, and list.

```ts
type Filter =
  | { field: string; operator: "eq" | "neq"; value: string; caseSensitive?: boolean }
  | { field: string; operator: "eq" | "neq"; value: number | boolean }
  | { field: string; operator: "gt" | "gte" | "lt" | "lte"; value: number }
  | { field: string; operator: "contains" | "notContains"; value: string; caseSensitive?: boolean }
  | { field: string; operator: "arrayContains" | "arrayNotContains"; value: string }
  | { operator: "and" | "or"; operands: Filter[] }
```

```json
{"operator":"and","operands":[{"field":"source","operator":"eq","value":"slack"},{"field":"priority","operator":"gte","value":3}]}
```

Field names match `^[a-zA-Z0-9_.-]+$` and are literal: `customer.plan` is one key, not a path into nested metadata. `caseSensitive` defaults to `true`. Up to five nesting levels and 1 to 200 operands per `and` / `or`. Numbers stay JSON numbers, never strings.

## Errors

| Status | Meaning |
| --- | --- |
| `400` | Invalid request, including options sent in the wrong place |
| `401` | Missing or invalid API key |
| `402` | Insufficient credits, quota, or plan does not include the feature |
| `403` | Key cannot access this endpoint or namespace, or write access required |
| `404` | Document, memory, namespace, or connector not found in this namespace |
| `409` | Conflict: processing in progress, namespace busy, sync already running, or organization-level bucket |
| `429` | Daily limit reached (feedback only), with `Retry-After` |
| `500`, `502`, `503` | Server error, feedback delivery failed, provider or feature unavailable |

Most errors return:

```json
{"error":"Invalid request parameters","details":"Query must be at least 1 character long"}
```

Schema validation failures return:

```json
{"success":false,"error":[{"message":"Required","path":["query"]}],"data":{}}
```

Successful bulk operations can still carry per-item failures in `errors` (document delete, memory forget) or `results` (batch add). Always read them.

## cURL examples

Add a document:

```bash
curl -X POST "https://api.supermemory.ai/ns/user_1/document" \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"Alex prefers morning meetings.","id":"conv_1","metadata":{"source":"chat"},"dreaming":"instant"}'
```

Search memories:

```bash
curl -X POST "https://api.supermemory.ai/ns/user_1/search" \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"when does Alex like to meet?","searchMode":"memories","limit":5}'
```

Search chunks with a filter and the source document:

```bash
curl -X POST "https://api.supermemory.ai/ns/user_1/search" \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"launch plan","searchMode":"chunks","include":{"documents":true},"filter":{"field":"source","operator":"eq","value":"slack"}}'
```

Profile:

```bash
curl -X POST "https://api.supermemory.ai/ns/user_1/profile" \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

List documents:

```bash
curl -X POST "https://api.supermemory.ai/ns/user_1/list/documents?page=1&limit=50&sort=createdAt&order=desc" \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Forget: preview by meaning, then apply the reviewed IDs:

```bash
curl -X DELETE "https://api.supermemory.ai/ns/user_1/memories/semantic" \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"outdated home address","dryRun":true}'

curl -X DELETE "https://api.supermemory.ai/ns/user_1/memories" \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ids":["mem_1"]}'
```

Upload a file:

```bash
curl -X POST "https://api.supermemory.ai/ns/user_1/document/file" \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -F "file=@notes.pdf" \
  -F 'metadata={"source":"upload"}' \
  -F "dreaming=instant"
```

Move a namespace's content, then remove it:

```bash
curl -X DELETE "https://api.supermemory.ai/ns/project_alpha?moveTo=project_archive" \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY"
```
