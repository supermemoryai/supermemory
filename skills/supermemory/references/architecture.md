# Supermemory Architecture

Deep dive into how Supermemory works under the hood.

## Core Concept: Living Knowledge Graph

Supermemory fundamentally differs from traditional document storage systems. Instead of maintaining static files in folders, it constructs **a living knowledge graph** where content becomes dynamically interconnected.

### Traditional vs. Supermemory Approach

**Traditional Document Storage:**
```
Folder/
├── document1.pdf (static file)
├── document2.pdf (static file)
└── notes.txt (static file)
```
- Files stored as-is
- No relationships between content
- Keyword-based search only
- No automatic updates

**Supermemory Knowledge Graph:**
```
Knowledge Graph
├── Memory: "User prefers TypeScript"
│   ├── Updates → Memory: "User prefers TypeScript with strict mode"
│   └── Extends → Memory: "User completed TypeScript tutorial"
├── Memory: "Project uses React 18"
│   └── Derives → Memory: "Project likely uses hooks and concurrent features"
```
- Content broken into semantic memories
- Rich relationships between memories
- Semantic understanding
- Automatic knowledge evolution

## Content Processing Pipeline

Every piece of content goes through a six-stage pipeline:

### 1. Queued
Document enters the processing queue. The system validates the content type and prepares for extraction.

**What happens:**
- Content type detection (PDF, image, video, URL, text)
- Validation of metadata and container tags
- Assignment to processing queue

### 2. Extracting
Content is extracted from various formats into raw text.

**Supported formats:**
- **Text**: Plain text, markdown, code
- **URLs**: Web pages, articles, blogs
- **Documents**: PDFs, Word docs, Google Docs
- **Images**: OCR for text extraction, image understanding
- **Videos**: Transcription, scene detection
- **Audio**: Speech-to-text conversion

**What happens:**
- Format-specific extraction (PDF parsing, OCR, transcription)
- Metadata extraction (title, author, date)
- Content normalization

**Example:**
```
Input:  PDF document (100 pages)
Output: Extracted text (~50,000 words)
Time:   1-2 minutes
```

### 3. Chunking
Content divides into meaningful semantic segments.

**Chunking strategy:**
- Not fixed-size (e.g., 500 words)
- Semantic boundaries (paragraphs, sections, concepts)
- Context preservation (overlap between chunks)
- Optimal size for embedding models

**Example:**
```
Input:  50,000 word article
Output: ~100-200 semantic chunks
Logic:  Each chunk represents a coherent idea/concept
```

**Why semantic chunking?**
- Better retrieval accuracy
- Preserves context and meaning
- Reduces irrelevant results
- Enables precise citation

### 4. Embedding
Vector embeddings are generated for similarity matching.

**Process:**
- Each chunk converted to high-dimensional vector (e.g., 1536 dimensions)
- Uses state-of-the-art embedding models
- Captures semantic meaning, not just keywords
- Enables similarity search

**Example:**
```javascript
Chunk: "TypeScript provides type safety"
Vector: [0.023, -0.145, 0.876, ..., 0.234] // 1536 dimensions

Chunk: "Static typing catches errors early"
Vector: [0.019, -0.139, 0.881, ..., 0.228] // Similar vector!
```

**Why embeddings?**
- Semantic search (meaning, not keywords)
- Language-agnostic (works across languages)
- Context understanding
- Relationship discovery

### 5. Indexing
Relationships are established between memories.

**Three relationship types:**

**Updates**: Track when new information supersedes old knowledge
```
Memory 1: "User prefers React 17"
Memory 2: "User now uses React 18"
Relationship: Memory 2 updates Memory 1 (isLatest = true)
```

**Extends**: Link enriching information that adds context
```
Memory 1: "User likes TypeScript"
Memory 2: "User completed advanced TypeScript course"
Relationship: Memory 2 extends Memory 1
```

**Derives**: Infer novel connections from pattern analysis
```
Memory 1: "User reads ML papers daily"
Memory 2: "User asks about neural networks"
Memory 3: "User works on AI projects"
Derived: "User is an ML engineer/researcher"
```

**Graph structure:**
```
    [Memory A]
    /    |    \
Updates Extends Derives
   /      |      \
[B]     [C]     [D]
```

### 6. Done
Processing complete. Content is now fully searchable and integrated into the knowledge graph.

**What you get:**
- Searchable memories
- Queryable via semantic search
- Integrated into user profiles
- Available for retrieval

**Typical processing times:**
- **Text**: Instant to 10 seconds
- **URLs**: 10-30 seconds
- **PDFs (100 pages)**: 1-2 minutes
- **Videos**: 5-10 minutes
- **Large documents**: Up to 15 minutes

## Memory Storage System

### Static vs. Dynamic Memories

**Static Memories** (`isStatic: true`):
- Permanent facts that don't change
- Examples: name, profession, birthday
- Not subject to temporal updates
- High priority in retrieval

**Dynamic Memories** (`isStatic: false`):
- Contextual, episodic information
- Examples: recent conversations, activities
- Can be updated or superseded
- Time-sensitive relevance

### Memory Versioning

Supermemory maintains version history through the `Updates` relationship:

```
Memory v1: "User prefers Vue" (isLatest: false)
    ↓ Updates
Memory v2: "User prefers React" (isLatest: false)
    ↓ Updates
Memory v3: "User prefers React with TypeScript" (isLatest: true)
```

When querying, you can choose:
- Latest version only (default)
- Full version history
- Specific version

## Retrieval Mechanism

### Semantic Search Process

When you perform a search:

**1. Query Embedding**
```javascript
Query: "How do I authenticate users?"
Vector: [0.124, -0.876, 0.234, ...]
```

**2. Similarity Calculation**
```javascript
// Cosine similarity between query and all chunk vectors
Chunk 1: similarity = 0.89  // "JWT authentication guide"
Chunk 2: similarity = 0.82  // "OAuth 2.0 tutorial"
Chunk 3: similarity = 0.45  // "User profile management"
Chunk 4: similarity = 0.12  // "Database schemas"
```

**3. Threshold Filtering**
```javascript
chunkThreshold: 0.5
Results: [Chunk 1, Chunk 2]  // Only >= 0.5
```

**4. Relationship Expansion**
```
Chunk 1: "JWT authentication guide"
    ↓ Extends
Chunk 5: "JWT refresh token best practices"
    ↓ Derives
Chunk 6: "Security considerations for SPAs"
```

**5. Result Ranking**
- Similarity score
- Recency (newer preferred)
- Static vs. dynamic priority
- Relationship strength
- Metadata matches

### Metadata Filtering

Combine semantic search with structured filtering:

```javascript
Query: "authentication methods"
Semantic: Find similar content
Metadata:
  - type = "tutorial"
  - rating >= 4.0
  - tags contains "security"

Results: Semantically similar + metadata match
```

## Container Tag Isolation

Container tags create isolated "spaces" within Supermemory:

```
┌─────────────────────────────────┐
│  user_123                       │
│  ├── Memory: "Prefers dark mode"│
│  └── Memory: "Uses TypeScript"  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  user_456                       │
│  ├── Memory: "Prefers light mode"│
│  └── Memory: "Uses Python"      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  org_acme                       │
│  ├── Memory: "Uses AWS"         │
│  └── Memory: "50 employees"     │
└─────────────────────────────────┘
```

**Benefits:**
- **Privacy**: User A can't access User B's memories
- **Multi-tenancy**: Support multiple organizations
- **Organization**: Separate personal/work/project contexts
- **Performance**: Faster search within smaller spaces

## User Profile Generation

User profiles are dynamically generated from memories:

**Static Profile** (from `isStatic: true` memories):
```
Name: John Doe
Role: Senior Software Engineer
Preferences: Dark mode, TypeScript, Vim keybindings
Timezone: UTC-8 (PST)
```

**Dynamic Context** (from recent memories):
```
Recent Activity:
- Working on React project (last 3 days)
- Asked about authentication (2 hours ago)
- Completed TypeScript tutorial (yesterday)
- Discussed performance optimization (last week)
```

**Combined Profile:**
```javascript
{
  "profile": "John Doe, Senior Software Engineer who prefers TypeScript and dark mode",
  "memories": [
    {
      "content": "Currently working on React authentication",
      "score": 0.95,
      "timestamp": "2 hours ago"
    },
    {
      "content": "Completed advanced TypeScript course",
      "score": 0.87,
      "timestamp": "yesterday"
    }
  ]
}
```

## Graph Evolution

The knowledge graph continuously evolves:

### Day 1
```
[Memory: User prefers React]
```

### Day 5
```
[Memory: User prefers React]
    ↓ Extends
[Memory: User completed React hooks tutorial]
```

### Day 30
```
[Memory: User prefers React]
    ↓ Extends
[Memory: User completed React hooks tutorial]
    ↓ Derives
[Memory: User is experienced with modern React patterns]
    ↓ Updates
[Memory: User now prefers Next.js for React projects]
```

## Performance Optimizations

### 1. Vector Indexing
- Uses HNSW (Hierarchical Navigable Small World) algorithm
- O(log n) search complexity
- Sub-millisecond similarity lookups
- Scales to millions of vectors

### 2. Caching
- Frequently accessed memories cached
- Profile responses cached (short TTL)
- Embedding results cached
- Reduces latency by 10-100x

### 3. Batch Processing
- Multiple documents processed in parallel
- Embedding generation batched
- Relationship indexing optimized
- Throughput: 1000s of documents/hour

### 4. Smart Chunking
- Dynamic chunk sizes based on content
- Overlap optimization for context
- Semantic boundary detection
- Reduces storage by 30-40%

## Performance Characteristics

Supermemory is designed for high performance and scale:

**Real-world metrics:**
- Search latency: <50ms (p95)
- Processing throughput: 10,000 documents/hour
- Storage efficiency: 10:1 compression ratio

## Comparison with Alternatives

### vs. Traditional RAG

**Traditional RAG:**
```
User query → Embed → Search chunks → Return top-k → LLM
```
- No relationships between chunks
- No memory versioning
- No user profiles
- Pure similarity search

**Supermemory:**
```
User query → Embed → Graph search → Relationship expansion →
Filter + rank → User profile enrichment → Return context → LLM
```
- Rich relationships (updates, extends, derives)
- Version history and temporal understanding
- Dynamic user profiles
- Semantic + structural search

### vs. Vector Databases

**Vector DB (Pinecone, Weaviate, etc.):**
- Raw vector storage and similarity search
- No built-in relationships
- No automatic chunking
- No user profile generation
- Requires manual pipeline construction

**Supermemory:**
- End-to-end solution (ingestion → storage → retrieval)
- Automatic relationship discovery
- Intelligent chunking
- Built-in user profiles
- Zero-configuration pipeline

### vs. In-Memory Conversation History

**In-Memory History:**
```
messages = [
  { role: "user", content: "..." },
  { role: "assistant", content: "..." }
]
```
- Limited by context window (8k-128k tokens)
- No semantic search
- No persistence across sessions
- Linear growth → expensive

**Supermemory:**
- Unlimited history
- Semantic retrieval (only relevant context)
- Persistent across sessions
- Constant cost per query

## Architecture Diagrams

### High-Level Architecture

```
┌──────────────┐
│   Client     │
│  (Your App)  │
└──────┬───────┘
       │ REST API
       ↓
┌──────────────────────────────────┐
│     Supermemory API Layer        │
│  ┌──────────┐  ┌──────────────┐ │
│  │ /documents│  │   /search    │ │
│  │ /memories │  │   /profile   │ │
│  └──────────┘  └──────────────┘ │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│    Processing Pipeline           │
│  Extract → Chunk → Embed →       │
│  Index → Build Relationships     │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│     Knowledge Graph Storage      │
│  ┌──────────┐  ┌──────────────┐ │
│  │  Vectors │  │ Relationships│ │
│  │ (HNSW)   │  │   (Graph)    │ │
│  └──────────┘  └──────────────┘ │
└──────────────────────────────────┘
```

### Data Flow: Add Document

```
[PDF Document]
    ↓
[API: POST /v3/documents]
    ↓
[Queue: Document ID returned, status: "queued"]
    ↓
[Extract: PDF → Text]
    ↓
[Chunk: Text → 100 chunks]
    ↓
[Embed: 100 chunks → 100 vectors]
    ↓
[Index: Build relationships]
    ↓
[Graph: Integrated into knowledge base]
    ↓
[Status: "done"]
```

### Data Flow: Search

```
[User Query: "authentication methods"]
    ↓
[API: POST /v4/search]
    ↓
[Embed: Query → Vector]
    ↓
[Search: Vector similarity in container]
    ↓
[Filter: Apply metadata filters]
    ↓
[Expand: Follow relationships]
    ↓
[Rank: Score by relevance]
    ↓
[Return: Top-k results with metadata]
```

## Scalability

Supermemory is designed for scale:

- **Users**: Millions of concurrent users
- **Documents**: Billions of documents
- **Memories**: Trillions of individual memories
- **Queries**: 100k+ QPS per region
- **Latency**: <50ms p95 globally

## Security & Privacy

- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Isolation**: Container tags enforce strict boundaries
- **Access Control**: API key-based authentication
- **Compliance**: SOC 2, GDPR compliant
- **Data Residency**: Regional storage options

## Summary

Supermemory's architecture enables:

1. **Intelligent Memory**: Beyond simple storage, understanding and relationships
2. **Semantic Search**: Meaning-based retrieval, not keyword matching
3. **Evolution**: Knowledge graph grows and improves over time
4. **Personalization**: Dynamic user profiles from accumulated memories
5. **Scale**: Enterprise-grade performance and reliability
6. **Simplicity**: Complex architecture, simple developer experience

The result: AI agents with perfect recall and true personalization.
