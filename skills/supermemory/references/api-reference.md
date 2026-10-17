# Supermemory API Reference

Complete REST API documentation for Supermemory.

## Base URL

```
https://api.supermemory.ai
```

Application routes are unversioned: there is no `/v5` path prefix. [`/v5/reference`](https://api.supermemory.ai/v5/reference) is the interactive v5 reference, not an API path.

## Authentication

All requests require authentication via Bearer token in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
```

Get your API key at [console.supermemory.ai](https://console.supermemory.ai).

## Namespaces and Parameter Placement

Every content route is scoped to one namespace in the path: `/ns/{namespace}/...`. A document belongs to exactly one namespace; never send several namespaces in one request.

- `GET` options go in the query string.
- `POST`, `PATCH`, and `PUT` options go in the JSON body (or as form fields on file uploads). List pagination (`page`, `limit`, `sort`, `order`) is the exception and stays in the query string.
- `DELETE` options such as `moveTo` go in the query string; bulk deletes send `ids` in the JSON body.

Options sent in the wrong place return `400`.

## Endpoints

### POST /ns/{namespace}/document

Add a document for processing and memory extraction.

**Endpoint:**
```
POST https://api.supermemory.ai/ns/{namespace}/document
```

**Headers:**
```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | The content to process: text or a URL. Upload files with `POST /ns/{namespace}/document/file` |
| `id` | string | No | Your stable document ID. Repeating it appends or diffs into the same document |
| `supportingContext` | string | No | Context guidance for memory extraction |
| `metadata` | object | No | Custom key-value pairs (strings, numbers, booleans, or string arrays) |
| `group` | object | No | Grouping values for the document |
| `date` | string | No | Document date |
| `taskType` | string | No | `"memory"` extracts long-term memories; `"superrag"` indexes without memory generation |
| `dreaming` | string | No | `"dynamic"` (default) groups related documents; `"instant"` processes each document on its own and bills one extra operation |

Ingest routes take no query parameters.

**Example Request:**

```bash
curl -X POST https://api.supermemory.ai/ns/user_123/document \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "https://example.com/article",
    "supportingContext": "Technical blog post about API design",
    "metadata": {
      "source": "blog",
      "category": "technical",
      "tags": ["api", "design"]
    }
  }'
```

**Response (200 OK):**

```json
{
  "id": "doc_abc123xyz",
  "status": "queued"
}
```

`status` is the document's processing state after the request: `queued` when new work was queued, otherwise the current state (for example `done` for an unchanged duplicate).

**Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "details": "Invalid or missing API key"
}
```

**Processing Statuses:**
- `unknown`: State not yet known
- `queued`: Document awaiting processing
- `extracting`: Content extraction in progress
- `chunking`: Breaking into semantic segments
- `embedding`: Generating vector embeddings
- `indexing`: Building relationships
- `done`: Processing complete, searchable
- `failed`: Processing failed

Related document routes:

| Route | Purpose |
|-------|---------|
| `POST /ns/{namespace}/document/batch` | Add 1–600 documents: `{"documents":[{"content":"...","id":"doc_1"}]}` |
| `POST /ns/{namespace}/document/file` | Upload a file as `multipart/form-data` (`metadata` and `group` are JSON-encoded strings) |
| `GET /ns/{namespace}/document/{id}?include=chunks,memories` | Read a document; lifecycle fields are under `system` |
| `PATCH /ns/{namespace}/document/{id}` | Replace content and/or update `supportingContext`, `metadata`, `group`, `date` |
| `DELETE /ns/{namespace}/document` | Delete 1–100 documents: `{"ids":["doc_1"]}` |
| `POST /ns/{namespace}/list/{type}` | List `documents`, `chunks`, or `memories` |

---

### POST /ns/{namespace}/search

Search one namespace using semantic understanding with typed filtering. Search has no query-string parameters.

**Endpoint:**
```
POST https://api.supermemory.ai/ns/{namespace}/search
```

**Headers:**
```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | The search query |
| `searchMode` | string | No | `"hybrid"` (default, memories + chunks), `"memories"`, or `"chunks"` |
| `limit` | number | No | Maximum results |
| `threshold` | number | No | Similarity threshold (0-1). 0 = more results, 1 = fewer, more accurate results. Default: `0.3` |
| `filter` | object | No | Typed filter with `and`/`or` groups (up to 5 nesting levels) |
| `include` | object | No | Booleans: `documents`, `related`, `forgotten` (each default `false`) |
| `rerank` | string | No | `"none"` (default), `"order"`, or `"aggregate"` |
| `rewriteQuery` | boolean | No | Retrieval-oriented query rewriting. Default: `false` |

**Filter Shape:**

```typescript
type Filter =
  | { field: string; operator: "eq" | "neq"; value: string; caseSensitive?: boolean }
  | { field: string; operator: "eq" | "neq"; value: number | boolean }
  | { field: string; operator: "gt" | "gte" | "lt" | "lte"; value: number }
  | { field: string; operator: "contains" | "notContains"; value: string; caseSensitive?: boolean }
  | { field: string; operator: "arrayContains" | "arrayNotContains"; value: string }
  | { operator: "and" | "or"; operands: Filter[] };
```

Fields may contain letters, numbers, `_`, `.`, and `-`. Groups allow up to 200 operands. The same `filter` works on profile and list routes.

**Example Request:**

```bash
curl -X POST https://api.supermemory.ai/ns/documentation/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I authenticate users?",
    "searchMode": "hybrid",
    "threshold": 0.5,
    "filter": {
      "operator": "and",
      "operands": [
        { "field": "type", "operator": "eq", "value": "documentation" },
        { "field": "category", "operator": "eq", "value": "security" },
        { "field": "rating", "operator": "gte", "value": 4.0 }
      ]
    }
  }'
```

**Response (200 OK):**

```json
{
  "results": [
    {
      "id": "chunk_456",
      "chunk": "Authentication can be done using JWT tokens...",
      "metadata": {
        "type": "documentation",
        "category": "security",
        "rating": 4.5
      },
      "system": { "createdAt": "...", "updatedAt": "..." }
    },
    {
      "id": "mem_789",
      "memory": "The API supports OAuth 2.0 for authorization",
      "metadata": {},
      "isLatest": true,
      "isInference": false,
      "system": { "createdAt": "...", "updatedAt": "..." }
    }
  ],
  "searchTime": 42
}
```

Each result carries `memory`, `chunk`, or both; branch on field presence. With `include.documents`, the source is under `result.included.document`; with `include.related`, related memories are under `result.included.related.{parents,children,siblings}`.

**Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "details": "Invalid or missing API key"
}
```

---

### POST /ns/{namespace}/profile

Get the maintained profile for a namespace. Profile takes no query; call search separately for query-ranked results.

**Endpoint:**
```
POST https://api.supermemory.ai/ns/{namespace}/profile
```

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Typed filter |
| `buckets` | string[] | No | Narrow the custom bucket section (up to 50 names). Omit to return every bucket |

**Example Request:**

```bash
curl -X POST https://api.supermemory.ai/ns/user_123/profile \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (200 OK):**

```json
{
  "profile": {
    "static": [{ "id": "mem_1", "memory": "The user works in design" }],
    "dynamic": [{ "id": "mem_2", "memory": "The user is preparing a launch" }],
    "buckets": { "work": [{ "id": "mem_3", "memory": "Prefers concise project updates" }] }
  }
}
```

`static`, `dynamic`, and `buckets` are always returned. Bucket definitions live at `GET/PUT/DELETE /ns/{namespace}/profile/buckets`.

---

### DELETE /ns/{namespace}/memories

Forget memories by exact ID (1–500 IDs).

```bash
curl -X DELETE https://api.supermemory.ai/ns/user_123/memories \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ids":["mem_1","mem_2"]}'
```

To find memories by meaning, call `DELETE /ns/{namespace}/memories/semantic` with `{"query":"...","dryRun":true}`, review the matched IDs, then submit them to the exact-ID route. Both return:

```json
{
  "count": 1,
  "matches": [{ "id": "mem_1", "memory": "Old address" }],
  "errors": [{ "id": "mem_2", "error": "Memory not found" }]
}
```

---

### Namespaces and Organization

| Route | Purpose |
|-------|---------|
| `GET /namespaces` | List namespaces with `documentCount` and `memoryCount` |
| `GET /ns/{namespace}` | Read a namespace's `supportingContext` |
| `PATCH /ns/{namespace}` | Set `supportingContext` (send `null` to clear) |
| `DELETE /ns/{namespace}` | Permanently delete a namespace and its content |
| `DELETE /ns/{namespace}?moveTo={target}` | Move content to another namespace, then remove the source (`202`, returns `operationId`) |
| `GET/PATCH /organization` | Read or set `organizationalContext` (PATCH needs an org admin) |

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 202 | Accepted | Async operation queued (for example a namespace move) |
| 400 | Bad Request | Invalid request parameters, or an option in the wrong place |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Caller lacks permission (for example a non-admin updating `/organization`) |
| 404 | Not Found | Resource not found in this namespace |
| 409 | Conflict | Document still processing, or a sync already running |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |

### Error Response Format

All errors follow this format:

```json
{
  "error": "Error Type",
  "details": "Detailed error message"
}
```

### Common Errors

**Invalid API Key:**
```json
{
  "error": "Unauthorized",
  "details": "Invalid or missing API key"
}
```

**Rate Limit Exceeded:**
```json
{
  "error": "Too Many Requests",
  "details": "Rate limit exceeded. Please try again later."
}
```

**Invalid Parameters:**
```json
{
  "error": "Bad Request",
  "details": "content field is required"
}
```

## Rate Limits

Rate limits are enforced to ensure system stability. When rate limited, the response includes:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
```

Check your plan details in the [console](https://console.supermemory.ai) for specific rate limit information.

## Best Practices

### 1. Use Stable IDs

Send your own `id` so repeated writes land in one document instead of creating duplicates:

```bash
curl -X POST https://api.supermemory.ai/ns/user_123/document \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Important document",
    "id": "doc_2026_02_21_001"
  }'
```

### 2. Proper Error Handling

Always check status codes and handle errors gracefully:

```javascript
const response = await fetch('https://api.supermemory.ai/ns/user_123/document', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ content: "..." })
});

if (!response.ok) {
  const error = await response.json();
  console.error(`Error ${response.status}:`, error.details);
  throw new Error(error.details);
}

const data = await response.json();
```

### 3. Use Namespaces Consistently

Maintain consistent naming for namespaces:

```bash
# Good
/ns/user_123/...
/ns/user_456/...

# Avoid inconsistency
/ns/user_123/...
/ns/123/...  # Different format
```

### 4. Rich Metadata

Add comprehensive metadata for better filtering:

```json
{
  "content": "Product review",
  "metadata": {
    "product": "iPhone 15",
    "rating": 4.5,
    "verified": true,
    "date": "2026-02-21",
    "tags": ["smartphone", "apple"]
  }
}
```

### 5. Set Search Defaults Explicitly

v5 defaults to `searchMode: "hybrid"` and `threshold: 0.3`. Set them explicitly and adjust based on results:

```json
{
  "query": "authentication methods",
  "searchMode": "memories",
  "threshold": 0.5
}
```

### 6. Monitor Processing Status

For large documents, check processing status:

```bash
# Add document
curl -X POST https://api.supermemory.ai/ns/docs/document \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "content": "https://example.com/large-report.pdf", "id": "report_2026" }'

# Returns: { "id": "report_2026", "status": "queued" }

# Later, read the document and check system.status
curl https://api.supermemory.ai/ns/docs/document/report_2026 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## SDK vs Direct API

**Use SDK when:**
- Building applications in TypeScript/Python
- Want automatic error handling and retries
- Need type safety and autocomplete
- Prefer higher-level abstractions

**Use Direct API when:**
- Working in other languages
- Need fine-grained control
- Building serverless functions
- Integrating with existing HTTP clients

## Complete cURL Examples

### Add Text Content

```bash
curl -X POST https://api.supermemory.ai/ns/user_123/document \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User mentioned they prefer TypeScript over JavaScript for type safety",
    "metadata": {
      "source": "chat",
      "timestamp": "2026-02-21T10:00:00Z"
    }
  }'
```

### Add URL

```bash
curl -X POST https://api.supermemory.ai/ns/knowledge_base/document \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "https://blog.example.com/best-practices",
    "supportingContext": "Software development best practices article",
    "metadata": {
      "type": "article",
      "category": "best-practices"
    }
  }'
```

### Search with Filters (Hybrid Mode for RAG)

```bash
curl -X POST https://api.supermemory.ai/ns/knowledge_base/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React performance optimization",
    "searchMode": "hybrid",
    "threshold": 0.6,
    "filter": {
      "operator": "and",
      "operands": [
        { "field": "type", "operator": "eq", "value": "tutorial" },
        { "field": "rating", "operator": "gte", "value": 4.0 }
      ]
    }
  }'
```

### Add Facts With Fast Memory Formation

There is no direct memory write in v5; memories come from documents. Use `dreaming: "instant"` when facts must appear quickly:

```bash
curl -X POST https://api.supermemory.ai/ns/user_789/document \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User name is Alice Johnson. Alice completed the React tutorial today.",
    "metadata": { "type": "profile" },
    "dreaming": "instant"
  }'
```

## Webhook Support

Coming soon: Webhooks for document processing status updates.

## Support

- **API Issues**: Check [status.supermemory.ai](https://status.supermemory.ai)
- **Documentation**: [supermemory.ai/docs](https://supermemory.ai/docs)
- **API Reference**: [api.supermemory.ai/v5/reference](https://api.supermemory.ai/v5/reference)
- **Console**: [console.supermemory.ai](https://console.supermemory.ai)
