# Supermemory API Reference

Complete REST API documentation for Supermemory.

## Base URL

```
https://api.supermemory.ai
```

## Authentication

All requests require authentication via Bearer token in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
```

Get your API key at [console.supermemory.ai](https://console.supermemory.ai).

## Endpoints

### POST /v3/documents

Add a document for processing and memory extraction.

**Endpoint:**
```
POST https://api.supermemory.ai/v3/documents
```

**Headers:**
```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | The content to process. Can be a URL, text, PDF path, image, or video |
| `containerTag` | string | No | Identifier for organizing documents (max 100 chars, alphanumeric with hyphens/underscores) |
| `entityContext` | string | No | Context guidance for memory extraction (max 1500 chars) |
| `customId` | string | No | Your custom identifier (max 100 chars, alphanumeric with hyphens/underscores) |
| `metadata` | object | No | Custom key-value pairs (strings, numbers, booleans, or string arrays) |

**Example Request:**

```bash
curl -X POST https://api.supermemory.ai/v3/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "https://example.com/article",
    "containerTag": "user_123",
    "entityContext": "Technical blog post about API design",
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

**Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "details": "Invalid or missing API key"
}
```

**Response (500 Internal Server Error):**

```json
{
  "error": "Internal Server Error",
  "details": "Failed to process document"
}
```

**Processing Statuses:**
- `queued`: Document awaiting processing
- `extracting`: Content extraction in progress
- `chunking`: Breaking into semantic segments
- `embedding`: Generating vector embeddings
- `indexing`: Building relationships
- `done`: Processing complete, searchable

---

### POST /v4/search

Search memories using semantic understanding with advanced filtering.

**Endpoint:**
```
POST https://api.supermemory.ai/v4/search
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
| `containerTags` | string[] | No | Filter by container tags |
| `chunkThreshold` | number | No | Threshold for chunk selection (0-1). 0 = least sensitive (more results), 1 = most sensitive (fewer, accurate results). Default: 0 |
| `searchMode` | string | No | Search mode: "semantic" (default) or "hybrid" (semantic + keyword). Use "hybrid" for RAG applications for better accuracy |
| `docId` | string | No | Search within specific document (max 255 chars) |
| `filters` | object | No | Advanced filtering with AND/OR logic (up to 5 nesting levels) |

**Filter Types:**

```typescript
{
  "filters": {
    // Metadata filtering
    "metadata": {
      "key": "value"
    },

    // Numeric comparisons
    "numeric": {
      "field": { "$gte": 4.0 }  // >, <, >=, <=, =
    },

    // Array contains
    "array_contains": {
      "tags": "value"
    },

    // String contains
    "string_contains": {
      "content": "substring"
    },

    // Logical operators
    "$and": [{ /* filters */ }],
    "$or": [{ /* filters */ }]
  }
}
```

**Example Request:**

```bash
curl -X POST https://api.supermemory.ai/v4/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I authenticate users?",
    "searchMode": "hybrid",
    "chunkThreshold": 0.5,
    "filters": {
      "metadata": {
        "type": "documentation",
        "category": "security"
      },
      "numeric": {
        "rating": { "$gte": 4.0 }
      }
    }
  }'
```

**Response (200 OK):**

```json
{
  "results": [
    {
      "content": "Authentication can be done using JWT tokens...",
      "score": 0.89,
      "docId": "doc_123",
      "metadata": {
        "type": "documentation",
        "category": "security",
        "rating": 4.5
      },
      "chunkId": "chunk_456"
    },
    {
      "content": "OAuth 2.0 is a standard protocol for authorization...",
      "score": 0.82,
      "docId": "doc_789",
      "metadata": {
        "type": "documentation",
        "category": "security",
        "rating": 5.0
      },
      "chunkId": "chunk_789"
    }
  ],
  "total": 2
}
```

**Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "details": "Invalid or missing API key"
}
```

---

### POST /v4/memories

Create memories directly, bypassing document ingestion. Generates embeddings and makes them immediately searchable.

**Endpoint:**
```
POST https://api.supermemory.ai/v4/memories
```

**Headers:**
```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `memories` | array | Yes | Array of 1-100 memory objects |
| `memories[].content` | string | Yes | Memory text (1-10,000 chars). Preferably entity-centric (e.g., "John prefers dark mode") |
| `memories[].isStatic` | boolean | No | Marks permanent traits like name or profession. Default: false |
| `memories[].metadata` | object | No | Custom key-value pairs (strings, numbers, booleans, or string arrays) |
| `containerTag` | string | Yes | Identifier for the space/container these memories belong to |

**Example Request:**

```bash
curl -X POST https://api.supermemory.ai/v4/memories \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "containerTag": "user_123",
    "memories": [
      {
        "content": "User prefers dark mode",
        "isStatic": true,
        "metadata": {
          "category": "preferences",
          "source": "settings"
        }
      },
      {
        "content": "User mentioned working on a React project yesterday",
        "isStatic": false,
        "metadata": {
          "category": "activity",
          "timestamp": "2026-02-20T15:30:00Z"
        }
      }
    ]
  }'
```

**Response (201 Created):**

```json
{
  "documentId": "doc_abc123",
  "memories": [
    {
      "id": "mem_xyz789",
      "memory": "User prefers dark mode",
      "isStatic": true,
      "createdAt": "2026-02-21T10:00:00Z"
    },
    {
      "id": "mem_def456",
      "memory": "User mentioned working on a React project yesterday",
      "isStatic": false,
      "createdAt": "2026-02-21T10:00:00Z"
    }
  ]
}
```

**Response (400 Bad Request):**

```json
{
  "error": "Bad Request",
  "details": "Invalid request parameters: memories array must contain 1-100 items"
}
```

**Response (404 Not Found):**

```json
{
  "error": "Not Found",
  "details": "Space not found for given containerTag"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 404 | Not Found | Resource not found |
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

### 1. Use Idempotent IDs

Use `customId` for idempotency to prevent duplicate processing:

```bash
curl -X POST https://api.supermemory.ai/v3/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Important document",
    "customId": "doc_2026_02_21_001",
    "containerTag": "user_123"
  }'
```

### 2. Proper Error Handling

Always check status codes and handle errors gracefully:

```javascript
const response = await fetch('https://api.supermemory.ai/v3/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ content: "...", containerTag: "user_123" })
});

if (!response.ok) {
  const error = await response.json();
  console.error(`Error ${response.status}:`, error.details);
  throw new Error(error.details);
}

const data = await response.json();
```

### 3. Use Container Tags Consistently

Maintain consistent naming for container tags:

```bash
# Good
containerTag: "user_123"
containerTag: "user_456"

# Avoid inconsistency
containerTag: "user_123"
containerTag: "123"  # Different format
```

### 4. Rich Metadata

Add comprehensive metadata for better filtering:

```json
{
  "content": "Product review",
  "containerTag": "reviews",
  "metadata": {
    "product": "iPhone 15",
    "rating": 4.5,
    "verified": true,
    "date": "2026-02-21",
    "tags": ["smartphone", "apple"]
  }
}
```

### 5. Optimize Search Thresholds

Start with default (0) and adjust based on results:

```json
{
  "query": "authentication methods",
  "chunkThreshold": 0.5  // Balanced precision/recall
}
```

### 6. Monitor Processing Status

For large documents, check processing status:

```bash
# Add document
curl -X POST https://api.supermemory.ai/v3/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{ "content": "large-document.pdf", "containerTag": "docs" }'

# Returns: { "id": "doc_123", "status": "queued" }

# Later, list documents to check status
curl -X GET https://api.supermemory.ai/v3/documents?containerTag=docs \
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
curl -X POST https://api.supermemory.ai/v3/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User mentioned they prefer TypeScript over JavaScript for type safety",
    "containerTag": "user_123",
    "metadata": {
      "source": "chat",
      "timestamp": "2026-02-21T10:00:00Z"
    }
  }'
```

### Add URL

```bash
curl -X POST https://api.supermemory.ai/v3/documents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "https://blog.example.com/best-practices",
    "containerTag": "knowledge_base",
    "entityContext": "Software development best practices article",
    "metadata": {
      "type": "article",
      "category": "best-practices"
    }
  }'
```

### Search with Filters (Hybrid Mode for RAG)

```bash
curl -X POST https://api.supermemory.ai/v4/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React performance optimization",
    "searchMode": "hybrid",
    "chunkThreshold": 0.6,
    "filters": {
      "$and": [
        {
          "metadata": {
            "type": "tutorial"
          }
        },
        {
          "numeric": {
            "rating": { "$gte": 4.0 }
          }
        }
      ]
    }
  }'
```

### Create Direct Memories

```bash
curl -X POST https://api.supermemory.ai/v4/memories \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "containerTag": "user_789",
    "memories": [
      {
        "content": "User name is Alice Johnson",
        "isStatic": true,
        "metadata": { "type": "profile" }
      },
      {
        "content": "Alice completed the React tutorial today",
        "isStatic": false,
        "metadata": { "type": "activity", "date": "2026-02-21" }
      }
    ]
  }'
```

## Webhook Support

Coming soon: Webhooks for document processing status updates.

## Support

- **API Issues**: Check [status.supermemory.ai](https://status.supermemory.ai)
- **Documentation**: [supermemory.ai/docs](https://supermemory.ai/docs)
- **Console**: [console.supermemory.ai](https://console.supermemory.ai)
