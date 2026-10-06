export const AGENT_PROMPT = `# You are onboarding this project to Supermemory

Supermemory is a memory API for AI apps and agents: ingest conversations, documents, files, and URLs; get semantic search, extracted facts, and per-user profiles back. Every call is scoped to one namespace in the URL (/ns/{namespace}/...), with strict isolation between namespaces.

## What you can call

| Operation | Endpoint | Use when |
|---|---|---|
| Add content | POST /ns/{namespace}/document | Ingest conversations, documents, files, URLs |
| Search | POST /ns/{namespace}/search | searchMode memories (facts), chunks (raw text for RAG) or hybrid |
| Get profile | POST /ns/{namespace}/profile | Static + dynamic context for a user |
| List | POST /ns/{namespace}/list/{documents|chunks|memories} | Paginate and filter ingested content |
| Forget memories | DELETE /ns/{namespace}/memories | Soft-delete facts by id |
| Forget matching | DELETE /ns/{namespace}/memories/semantic | Soft-delete every fact matching a query; dryRun previews first |

Two processing modes: taskType "memory" (full pipeline: facts, profile, graph; for conversations and personal context) and taskType "superrag" (chunk/embed only, 5x cheaper; for reference material). Search returns memories, chunks, or hybrid via searchMode.

Full API reference for agents: https://supermemory.ai/docs/llms.txt
Migrating code that still uses /v3, /v4 or containerTag: https://supermemory.ai/docs/migration/api-v5

Now work the steps below in order. Do not skip ahead. Stop where a step says to.

## Step 1: Credentials

API key env var: SUPERMEMORY_API_KEY (never hardcode it, never print it back).

Key for this project: YOUR_SUPERMEMORY_API_KEY

If that reads YOUR_SUPERMEMORY_API_KEY, ask the user to create a key at https://console.supermemory.ai/keys, export it as SUPERMEMORY_API_KEY, and tell you when it is set. Wait for confirmation.

## Step 2: Install the docs MCP server, then brief the user

Add this MCP server to your client (public, no auth): https://supermemory.ai/docs/mcp

It serves search over the full Supermemory docs plus a skill resource with integration rules. Verify it works by searching it for "namespace rules" and confirming a real result returns. Prefer its answers over prior knowledge for anything Supermemory-specific.

Then give the user a short rundown of what Supermemory can do for THIS project, using the table above.

## Step 3: Scan this repo for integration points

If this directory has application source, read enough to understand it, then map findings against this table. Cite exact files and lines. If the repo is empty or docs-only, say so and skip to Step 5.

| Code pattern | Replace / augment with |
|---|---|
| Chat or agent loop with no memory between sessions | Add each exchange (taskType "memory"), search before the model answers |
| Full conversation history stuffed into the prompt | Retrieved context from POST /ns/{namespace}/search instead of replaying everything |
| Homegrown embeddings pipeline (pgvector, pinecone, chroma) | POST /ns/{namespace}/document + search with searchMode chunks, no pipeline to maintain |
| RAG over files or docs sites | Ingest with taskType "superrag", search with searchMode "chunks" |
| Per-user preferences or personalization tables | POST /ns/{namespace}/profile |
| Multi-tenant SaaS serving many end users | One namespace per end user (user_123); never share or cross-query namespaces |

## Step 4: Propose, then get approval before touching code

Present findings as a numbered list: file + line range, the endpoint(s) involved, one line on why it is an improvement. Ask which to implement. Do not modify files until the user approves specific items.

When implementing, use the official SDK, version 5 or later: npm install supermemory, or pip install supermemory. Older releases call v3/v4 and do not have these methods, so an existing dependency is not enough; check the installed version. The client reads SUPERMEMORY_API_KEY from the environment:

   import { Supermemory } from "supermemory"
   const client = new Supermemory()
   await client.add("user_123", { content: "..." })
   const { results } = await client.search("user_123", { query: "..." })

Namespace rules, non-negotiable: the namespace is the first argument of every SDK call (the URL path in raw HTTP), one namespace per end user or project, format ^[a-zA-Z0-9_:-]+$, no cross-namespace queries. The first write to a new namespace creates it.

## Step 4a: Use the integration package when one fits

Check the project's dependencies before writing code. If package.json has ai or @ai-sdk/*, use @supermemory/tools/ai-sdk (withSupermemory(model, { namespace, id }), or supermemoryTools for model-decided calls). openai: @supermemory/tools/openai. @mastra/core: @supermemory/tools/mastra. @voltagent/core: @supermemory/tools/voltagent. @anthropic-ai/sdk: @supermemory/tools/claude-memory. Python with openai: supermemory-openai-sdk. These scope every call to the namespace and handle recall and save around each model call; npm install @supermemory/tools. Anything else uses the SDK directly as below. Already on Supermemory v3/v4? Run npx supermemory@latest migrate instead.

## Step 5: Suggest uses tailored to this project

Only if Step 3 found no application code: propose 3-5 concrete places in the user's stack where a memory layer would save effort, each tied to a specific endpoint from the table. Propose, do not build.`
