# Supermemory Architecture Diagram

## High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SERVICES                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │Google Drive │ │   Notion    │ │  OneDrive   │ │   Exa AI    │ │   Resend    │   │
│  │   (OAuth)   │ │   (OAuth)   │ │   (OAuth)   │ │ (Scraping)  │ │  (Email)    │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
│         │               │               │               │               │           │
│         └───────────────┴───────────────┼───────────────┴───────────────┘           │
│                                         ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                         Cloudflare Infrastructure                             │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐   │   │
│  │  │    AI     │ │Hyperdrive │ │     KV    │ │    R2     │ │  Workflows    │   │   │
│  │  │(Embedding)│ │(DB Proxy) │ │  (Cache)  │ │ (Storage) │ │ (Scheduled)   │   │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND API LAYER                                       │
│                        (https://api.supermemory.ai/v3)                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │   /documents    │  │    /search      │  │  /connections   │  │  /projects   │   │
│  │ CRUD memories   │  │ Semantic search │  │ OAuth integs    │  │ Workspaces   │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────────┘   │
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │   /settings     │  │   /analytics    │  │    /api/auth    │  │  /mcp/*      │   │
│  │ User config     │  │ Usage stats     │  │ Better Auth     │  │ Token valid  │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────────┘   │
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                       IngestContentWorkflow                                   │  │
│  │   Extract → Summarize → Tag → Chunk → Embed → Index                          │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌─────────────────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │              PostgreSQL (Drizzle)           │  │      Sentry + PostHog       │  │
│  │  Documents │ Chunks │ Connections │ Users   │  │      Monitoring & Analytics │  │
│  └─────────────────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
        ┌───────────┴──────┐   ┌────────┴────────┐   ┌──────┴───────┐
        │ Bearer Token     │   │ Bearer Token    │   │ API Key      │
        │ (Better Auth)    │   │ (Better Auth)   │   │ (sm_*)       │
        ▼                  │   ▼                 │   ▼              │
┌───────────────────┐      │   │      ┌──────────────────────────┐  │
│                   │      │   │      │                          │  │
│    WEB APP        │      │   │      │     MCP SERVER           │  │
│   (Next.js)       │      │   │      │    (Hono + DO)           │  │
│                   │      │   │      │                          │  │
│ ┌───────────────┐ │      │   │      │ ┌──────────────────────┐ │  │
│ │  Dashboard    │ │      │   │      │ │    MCP Tools         │ │  │
│ │  Chat UI      │ │      │   │      │ │  • memory()          │ │  │
│ │  Settings     │ │      │   │      │ │  • recall()          │ │  │
│ │  Memory Graph │ │      │   │      │ │  • context()         │ │  │
│ │  Projects     │ │      │   │      │ └──────────────────────┘ │  │
│ └───────────────┘ │      │   │      │                          │  │
│                   │      │   │      │ ┌──────────────────────┐ │  │
│ State: Zustand    │      │   │      │ │ Durable Objects      │ │  │
│ Cache: React Query│      │   │      │ │ (Session State)      │ │  │
│ Local: IndexedDB  │      │   │      │ └──────────────────────┘ │  │
└───────────────────┘      │   │      └──────────────────────────┘  │
        │                  │   │                  │                 │
        │                  │   │                  │                 │
        │                  │   │                  ▼                 │
        │                  │   │      ┌──────────────────────────┐  │
        │                  │   │      │    AI TOOLS              │  │
        │                  │   │      │  • Claude Desktop        │  │
        │                  │   │      │  • Cursor                │  │
        │                  │   │      │  • Other MCP Clients     │  │
        │                  │   │      └──────────────────────────┘  │
        │                  │   │                                    │
        ▼                  ▼   ▼                                    │
┌─────────────────────────────────────────────────────────────────┐ │
│                        CLIENT APPLICATIONS                       │ │
├──────────────────┬──────────────────┬───────────────────────────┤ │
│                  │                  │                           │ │
│  ┌────────────┐  │  ┌────────────┐  │  ┌─────────────────────┐  │ │
│  │  Browser   │  │  │  Raycast   │  │  │   Memory Graph      │  │ │
│  │ Extension  │  │  │ Extension  │  │  │   Playground        │  │ │
│  │            │  │  │            │  │  │                     │  │ │
│  │ • Chrome   │  │  │ • Add mem  │  │  │ • D3.js Force Sim   │  │ │
│  │ • Firefox  │  │  │ • Search   │  │  │ • Interactive       │  │ │
│  │ • Twitter  │  │  │            │  │  │ • Visualization     │  │ │
│  │   Import   │  │  │            │  │  │                     │  │ │
│  └────────────┘  │  └────────────┘  │  └─────────────────────┘  │ │
│                  │                  │                           │ │
└──────────────────┴──────────────────┴───────────────────────────┘ │
                                                                    │
                                                                    │
┌───────────────────────────────────────────────────────────────────┘
│
│  ┌──────────────────────────────────────────────────────────────────────────────┐
│  │                           SHARED PACKAGES                                     │
│  ├──────────────────────────────────────────────────────────────────────────────┤
│  │                                                                              │
│  │  packages/lib/          packages/ui/           packages/validation/          │
│  │  ├── api.ts             ├── components/        ├── schemas.ts               │
│  │  ├── auth.ts            ├── Button             └── Document, Chunk,         │
│  │  ├── types.ts           ├── Dialog                 Connection types         │
│  │  └── queries.ts         └── ...Radix                                        │
│  │                                                                              │
│  │  packages/tools/        packages/ai-sdk/       packages/memory-graph/        │
│  │  ├── openai.ts          └── Supermemory        └── React D3 Graph           │
│  │  ├── claude.ts              SDK Wrapper            Visualization            │
│  │  └── vercel.ts                                                              │
│  │                                                                              │
│  │  packages/hooks/        openai-sdk-python/     pipecat-sdk-python/           │
│  │  └── React Hooks        └── Python OpenAI      └── Python Pipecat           │
│  │                             Integration            Voice Integration         │
│  │                                                                              │
│  └──────────────────────────────────────────────────────────────────────────────┘
```

## Content Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INPUT SOURCES                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│   │  Text   │  │  URLs   │  │  PDFs   │  │ Google  │  │ Notion  │  │OneDrive │ │
│   │ (paste) │  │(scrape) │  │(upload) │  │  Drive  │  │  Pages  │  │  Files  │ │
│   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘ │
│        │            │            │            │            │            │       │
│        └────────────┴────────────┴─────┬──────┴────────────┴────────────┘       │
│                                        │                                        │
└────────────────────────────────────────┼────────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PROCESSING PIPELINE                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │   QUEUED    │ → │ EXTRACTING  │ → │  CHUNKING   │ → │  EMBEDDING  │     │
│   │             │    │             │    │             │    │             │     │
│   │ Document    │    │ Content     │    │ Semantic    │    │ Cloudflare  │     │
│   │ created     │    │ extraction  │    │ splitting   │    │ AI vectors  │     │
│   └─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                                                   │            │
│                      ┌────────────────────────────────────────────┘            │
│                      ▼                                                          │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                        │
│   │    DONE     │ ← │  INDEXING   │ ← │ SUMMARIZE   │                        │
│   │             │    │             │    │   + TAG     │                        │
│   │ Ready for   │    │ Vector DB   │    │ AI-powered  │                        │
│   │ search      │    │ storage     │    │ metadata    │                        │
│   └─────────────┘    └─────────────┘    └─────────────┘                        │
│                                                                                 │
│   Status: unknown → queued → extracting → chunking → embedding → indexing → done│
│                                                                         ↘       │
│                                                                        failed   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION METHODS                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   WEB APP / BROWSER EXTENSION                 MCP SERVER                        │
│   ─────────────────────────────               ──────────                        │
│                                                                                 │
│   ┌─────────────────────────┐                 ┌─────────────────────────┐      │
│   │      Better Auth        │                 │     Two Auth Types       │      │
│   │                         │                 │                          │      │
│   │  • Username/Password    │                 │  1. API Key (sm_*)       │      │
│   │  • Magic Link           │                 │     └→ /v3/mcp/          │      │
│   │  • Email OTP            │                 │        validate-key      │      │
│   │  • OAuth (Google, etc.) │                 │                          │      │
│   │  • Organization mgmt    │                 │  2. OAuth Bearer Token   │      │
│   │                         │                 │     └→ /v3/mcp/          │      │
│   └───────────┬─────────────┘                 │        validate-token    │      │
│               │                               └────────────┬─────────────┘      │
│               ▼                                            │                    │
│   ┌─────────────────────────┐                              │                    │
│   │   Session Cookie /      │                              │                    │
│   │   Bearer Token          │                              │                    │
│   └───────────┬─────────────┘                              │                    │
│               │                                            │                    │
│               └──────────────────┬─────────────────────────┘                    │
│                                  ▼                                              │
│                      ┌─────────────────────────┐                                │
│                      │   API Authorization     │                                │
│                      │   Header: Bearer xxx    │                                │
│                      │   or X-API-Key: sm_xxx  │                                │
│                      └─────────────────────────┘                                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Adding a Memory

```
┌──────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  User    │────▶│  Client   │────▶│    API    │────▶│  Backend  │
│          │     │  (Web/    │     │           │     │           │
│          │     │  Ext/MCP) │     │ POST /doc │     │           │
└──────────┘     └───────────┘     └─────┬─────┘     └─────┬─────┘
                                         │                 │
                                         │                 ▼
                                         │      ┌───────────────────┐
                                         │      │  Content Extract  │
                                         │      │  (Exa AI if URL)  │
                                         │      └─────────┬─────────┘
                                         │                │
                                         │                ▼
                                         │      ┌───────────────────┐
                                         │      │ Create Document   │
                                         │      │ (status: queued)  │
                                         │      └─────────┬─────────┘
                                         │                │
                                         │                ▼
                                         │      ┌───────────────────┐
                                         │      │ Cloudflare        │
                                         │      │ Workflow          │
                                         │      │ (async process)   │
                                         │      └─────────┬─────────┘
                                         │                │
                                         │                ▼
                                         │      ┌───────────────────┐
                                         │      │ Chunk + Embed +   │
                                         │      │ Index             │
                                         │      └─────────┬─────────┘
                                         │                │
                                         │                ▼
                                         │      ┌───────────────────┐
                                         │      │ Document Ready    │
                                         │      │ (status: done)    │
                                         │      └───────────────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │  Search Available   │
                              │  POST /search       │
                              └─────────────────────┘
```

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js, React, Tailwind CSS, Radix UI |
| **State Management** | Zustand, React Query, IndexedDB |
| **Backend Runtime** | Cloudflare Workers |
| **API Framework** | Hono |
| **Database** | PostgreSQL + Drizzle ORM |
| **Authentication** | Better Auth |
| **AI/ML** | Cloudflare AI (Embeddings), LLMs |
| **Storage** | Cloudflare R2, KV |
| **Scheduled Jobs** | Cloudflare Workflows |
| **Monitoring** | Sentry, PostHog |
| **Package Manager** | Bun |
| **Monorepo** | Turbo |
| **Validation** | Zod |

## Repository Structure

```
supermemory/
├── apps/
│   ├── web/                    # Next.js web application
│   ├── mcp/                    # MCP server for AI tools
│   ├── browser-extension/      # Chrome/Firefox extension
│   ├── raycast-extension/      # Raycast launcher
│   ├── memory-graph-playground/# Graph visualization demo
│   └── docs/                   # Documentation (Mintlify)
│
├── packages/
│   ├── lib/                    # Shared utilities
│   ├── ui/                     # Shadcn component library
│   ├── validation/             # Zod schemas
│   ├── hooks/                  # React hooks
│   ├── tools/                  # AI SDK integrations
│   ├── ai-sdk/                 # Supermemory AI SDK
│   ├── memory-graph/           # Graph visualization
│   ├── openai-sdk-python/      # Python OpenAI SDK
│   └── pipecat-sdk-python/     # Python Pipecat SDK
│
├── turbo.json                  # Turbo config
├── package.json                # Root package
└── biome.json                  # Linting config
```
