# Search

This endpoint provides semantic search capabilities across your saved memories using state-of-the-art embeddings. It returns relevant content ranked by similarity.

```http
POST /api/search
```

## Request Body

```typescript
{
  // The search query to find relevant content
  query: string,

  // Maximum number of results to return (1-50, default: 10)
  limit?: number,

  // Minimum similarity threshold (0-1, default: 0)
  threshold?: number
}
```

### Field Descriptions

| Field       | Type   | Required | Description                                   |
| ----------- | ------ | -------- | --------------------------------------------- |
| `query`     | string | Yes      | Search query text (minimum 1 character)       |
| `limit`     | number | No       | Maximum number of results (1-50, default: 10) |
| `threshold` | number | No       | Minimum similarity score (0-1, default: 0)    |

## Response

The endpoint returns an array of search results, sorted by relevance:

```typescript
{
  results: Array<{
    // Document identifiers
    id: string;
    uuid: string;

    // Content fields
    content: string; // Full document content
    chunkContent: string; // Matching content chunk

    // Metadata
    createdAt: string; // ISO timestamp

    // Relevance score (0-1)
    similarity: number; // Rounded to 4 decimal places
  }>;
}
```

### Error Responses

#### 400 Bad Request

```json
{
  "error": "Search query cannot be empty"
}
```

#### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Search failed",
  "details": "Error details (in development mode)"
}
```

## Features

### Semantic Search

- Uses BAAI BGE base embeddings model
- Computes cosine similarity between query and content
- Returns similarity scores between 0 and 1
- Supports partial matching and semantic understanding

### Performance

- Results limited to specified threshold
- Efficient vector search using PostgreSQL
- Chunked content for better matching
- Optimized similarity calculations

### Content Processing

- Automatic query embedding
- Smart content chunking
- Relevance scoring
- Result deduplication

## Examples

### Basic Search

```json
{
  "query": "machine learning concepts"
}
```

### Advanced Search with Filters

```json
{
  "query": "python programming",
  "limit": 20,
  "threshold": 0.5
}
```

### Response Example

```json
{
  "results": [
    {
      "id": "doc-123",
      "uuid": "abc-456",
      "content": "Python is a versatile programming language...",
      "chunkContent": "...particularly useful for machine learning...",
      "createdAt": "2024-03-20T12:00:00Z",
      "similarity": 0.8754
    },
    {
      "id": "doc-124",
      "uuid": "def-789",
      "content": "Programming basics include...",
      "chunkContent": "...Python syntax is straightforward...",
      "createdAt": "2024-03-19T15:30:00Z",
      "similarity": 0.7123
    }
  ]
}
```

## Notes

1. Authentication is required
2. Results are sorted by similarity score (descending)
3. Similarity scores are normalized between 0 and 1
4. Content is automatically chunked for better matching
5. Performance optimizations include:
   - Vector indexing
   - Similarity thresholding
   - Result limiting
   - Score normalization
6. The API uses the BGE base embeddings model for semantic understanding
7. Supports both exact and semantic matching
8. Results include both full content and relevant chunks
