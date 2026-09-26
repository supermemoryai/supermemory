# Local AI Article Studio — Design

Date: 2026-07-28

## Summary

Build a personal, laptop-local web application that turns a topic queue and an
editorial knowledge library into researched article drafts. A deterministic
coordinator runs a team of specialized AI agents, saves every durable artifact
to MongoDB, and presents the resulting article and private research evidence for
human review. No article is published without explicit approval.

The application, MongoDB, Supermemory, scheduling, and all article data run
locally. OpenRouter is the only required remote service. Gemini 3.5 Flash Lite
is the default model for both article agents and self-hosted Supermemory's
model-backed extraction steps. Supermemory uses local embeddings.

Obsidian is not part of the system. The application owns the knowledge library,
editorial workflow, and approval experience.

## Goals

- Generate one or many articles from explicit instructions.
- Automatically prepare one daily draft from a manual topic queue, falling back
  to an AI-proposed topic when the queue is empty.
- Keep company profiles, editorial rules, style guides, writing samples, and
  approved articles in a searchable knowledge library.
- Use Supermemory to retrieve relevant style and company context and detect
  semantically similar existing articles.
- Research current information on the web and retain evidence for private review.
- Run specialized AI roles with validated, inspectable inputs and outputs.
- Support editing, requested revisions, immutable version history, and explicit
  approval in the web application.
- Recover safely from model errors, process restarts, and laptop sleep.
- Preserve a clean extension point for later website publishing.

## Non-goals

- Multi-user accounts, teams, billing, or tenant isolation.
- Cloud deployment or remote access.
- Automatic publishing in the first version.
- Obsidian import, synchronization, or export.
- Training or fine-tuning a model.
- Treating temporary web research as permanent knowledge automatically.
- Allowing autonomous agents to communicate or loop without coordinator limits.

## Primary Design Decisions

| Concern | Decision |
| --- | --- |
| User model | One local user |
| Application | New local Next.js application in the monorepo |
| Source of truth | MongoDB database `article_studio` |
| Semantic memory | Self-hosted Supermemory at `http://localhost:6767` |
| Embeddings | Supermemory's local embedding model |
| Remote AI | OpenRouter only |
| Default model | `google/gemini-3.5-flash-lite` |
| Orchestration | Deterministic workflow coordinator |
| Web research | OpenRouter web-search server tool behind an adapter |
| Publication | Manual approval only; publishing deferred |
| Visual documentation | Markdown diagrams and comparisons |

## Repository Placement

Article Studio remains isolated from the hosted Supermemory product:

```text
apps/
├── article-studio/          # Next.js UI and local API, port 3010
└── article-studio-worker/   # Long-running Bun scheduler and workflow worker

packages/
└── article-studio-core/     # Domain, persistence, agents, orchestration, adapters
```

The existing `apps/web` is not reused because it is coupled to hosted
authentication, billing, analytics, and Cloudflare deployment. The new web
application uses the Node.js runtime for MongoDB access and does not inherit
OpenNext/Cloudflare configuration.

The new workspaces declare compatible dependencies explicitly. They standardize
on AI SDK 6 and Zod 4 internally rather than depending on the monorepo's older
root versions or the hosted API validation package. The UI application reuses
the app-neutral primitives and theme tokens in `packages/ui`, `packages/lib`,
and `packages/hooks`. Existing app-specific editor code may be extracted into a
focused shared component, but the new app never imports source directly from
another application.

## Local Configuration

The Article Studio processes read local environment variables:

```env
ARTICLE_STUDIO_PORT=3010
ARTICLE_STUDIO_TIMEZONE=Asia/Kolkata
MONGODB_URI=mongodb://127.0.0.1:27017/?retryWrites=false
MONGODB_DATABASE=article_studio
SUPERMEMORY_BASE_URL=http://127.0.0.1:6767
SUPERMEMORY_API_KEY=<local-key-printed-by-supermemory>
OPENROUTER_API_KEY=<local-secret>
OPENROUTER_MODEL=google/gemini-3.5-flash-lite
```

Self-hosted Supermemory is configured to use the same OpenRouter account for its
model-backed extraction while retaining local embeddings:

```env
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=<same-openrouter-secret>
OPENAI_MODEL=google/gemini-3.5-flash-lite
SUPERMEMORY_EMBEDDING_PROVIDER=local
```

Secrets stay in ignored local environment files or the operating-system
environment. MongoDB stores only redacted configuration status and non-secret
workflow snapshots.

## System Architecture

```text
┌────────────────────────── Laptop ──────────────────────────────┐
│                                                               │
│  Browser                                                      │
│     │                                                         │
│     ▼                                                         │
│  Local Next.js web app                                        │
│     ├── API layer                                             │
│     ├── knowledge and editorial UI                            │
│     ├── deterministic workflow coordinator                    │
│     └── local scheduler/worker                                │
│            │                    │                             │
│            ▼                    ▼                             │
│  MongoDB 8.2.12         Supermemory local                     │
│  article_studio         http://localhost:6767                 │
│  exact records          semantic retrieval + local embeddings │
│            │                    │                             │
└────────────┼────────────────────┼─────────────────────────────┘
             │                    │ relevant context
             └────────────────────┴───────────┐
                                              ▼
                                  OpenRouter API
                                  Gemini 3.5 Flash Lite
                                  + web research
```

The browser never connects directly to MongoDB, Supermemory, or OpenRouter.
Server-side modules own those connections and expose validated application APIs.

## Component Boundaries

### Web application

Owns the browser experience, API routes, input validation, article editing,
review actions, and health displays. It never contains workflow logic inside UI
components.

### Workflow coordinator

Owns the state machine. It selects the next runnable step, creates an agent run,
validates the agent artifact, persists it, and advances the workflow. Agents do
not select other agents or mutate workflow state directly.

### Worker and scheduler

Runs generation outside request/response lifetimes. It polls for runnable work,
claims one workflow using an expiring lease, records a heartbeat, and executes
one step at a time. On startup it evaluates missed daily schedules and enqueues
at most one catch-up draft for each missed schedule window.

Only one workflow runs concurrently by default. Each article in a multi-article
request has its own workflow, allowing independent retry and review.

The worker is a separate long-running Bun application. It does not run inside
Next.js route handlers, development hot-reload processes, or browser requests.

### MongoDB repositories

Provide typed persistence interfaces. Application and agent modules do not issue
ad hoc MongoDB queries. Atomic single-document operations provide state changes,
leases, counters, and idempotency on the standalone MongoDB deployment.

### Supermemory gateway

Indexes selected knowledge and approved articles, retrieves relevant context,
and performs similarity searches. MongoDB remains the canonical store. Every
indexed item uses the MongoDB identifier as its stable Supermemory `customId`.
Because ingestion is asynchronous, the gateway records ingestion state and
polls for readiness before a workflow depends on newly changed knowledge.

### Model gateway

Uses the Vercel AI SDK and the OpenRouter provider for normal structured agent
generation. Model choice is configuration, not agent business logic.

### Research provider

Provides a narrow `search` capability that returns normalized source records.
The first implementation uses OpenRouter's `openrouter:web_search` server tool
with an explicit result cap. It calls OpenRouter's REST API directly because the
server tool is an OpenRouter-specific beta capability; normal agent generation
continues through Vercel AI SDK. The adapter boundary permits later replacement
without leaking provider-specific response annotations into domain code.

### Publisher adapter

Defines the future contract for publishing approved articles. Version one ships
with no external publisher and contains no automatic publish path.

## Knowledge Model

The application provides forms and editors for these knowledge types:

- Company profile
- Style guide
- Editorial rule
- Writing sample
- Approved article
- Permanent reference

Each knowledge item has a title, Markdown body, type, optional company
association, tags, status, content hash, MongoDB timestamps, and Supermemory
synchronization state.

Supermemory indexes active company profiles, style guides, editorial rules,
writing samples, permanent references, and approved article versions. It does
not index rejected or unapproved drafts as positive examples.

Temporary research remains scoped to its article because web facts can become
stale. A reviewer may explicitly promote a research item into the permanent
knowledge library.

Before an article is outlined, the Memory Librarian retrieves:

```text
global editorial rules
+ selected company profile
+ matching style guidance
+ relevant approved articles and writing samples
+ semantically similar topics/articles for duplication detection
```

Retrieved context is bounded and recorded with the workflow so a draft can be
audited without depending on later memory changes.

## MongoDB Design

Runtime configuration:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/?retryWrites=false
MONGODB_DATABASE=article_studio
```

MongoDB remains bound to localhost. The current no-authentication configuration
is accepted only while the application is local and single-user. The supplied
MongoDB 8.2.12 container and its persistent `mongodb_data` volume are used as
provided. Startup performs a version and capability check rather than assuming
transactions, change streams, or retryable writes are available.

Documents use UUID strings consistently across MongoDB and Supermemory, BSON
dates, a `schema_version`, and explicit schema enums. Each workflow snapshots
its effective schedule, prompt, model, and research settings so later settings
changes cannot alter an in-flight run.

### Collections

| Collection | Responsibility |
| --- | --- |
| `knowledge_items` | Bounded knowledge content, canonical key, revision, and sync state |
| `topics` | Candidate topic, dedupe key, provenance, score, and lifecycle |
| `articles` | Identity plus mutable current/approved version pointers |
| `article_versions` | Immutable content snapshot, parent, stage, and content hash |
| `workflow_runs` | Authoritative state machine, settings snapshot, lease, fence, and retry |
| `agent_runs` | One structured agent attempt with hashes, usage, cost, and errors |
| `research_sources` | Normalized URL plus only the retrieved evidence excerpts used |
| `settings` | Versioned global schedule, generation, model, and feature settings |

### Important indexes

- `knowledge_items`: unique canonical key; status and updated time; tags.
- `topics`: partial unique dedupe key for proposed/queued/in-progress topics;
  compound queue index on status, descending priority, and creation time.
- `articles`: unique topic identifier; unique slug; status and updated time;
  company and status.
- `article_versions`: unique article and version number; workflow and created
  time; content hash.
- `workflow_runs`: unique request/idempotency key; state, next-attempt time, and
  creation time; lease expiry; unique partial index on a present `active_slot`.
- `agent_runs`: unique workflow, step, and attempt; workflow and start time.
- `research_sources`: unique workflow and source key; canonical URL and fetch
  time.

Large agent and research artifacts remain outside `articles` so version history
cannot grow one document without bound. Full fetched web pages are never stored.
If diagnostic transcripts approach MongoDB's document limit, they are written to
a bounded local artifact store and MongoDB retains only their hash and path.

`workflow_runs` is the authoritative aggregate. Cross-collection records are
idempotent, repairable projections because the standalone database cannot
atomically update multiple documents. Article versions are insert-only by
application policy, carry a content hash, and are never updated in place.

## Article and Workflow State

Article states:

```text
draft
  → ready_for_review
      ├── changes_requested → draft
      └── approved
```

`archived` is available from any non-running editorial state. Future publishing
states will be added after `approved`; they are not simulated in version one.

Workflow states:

```text
queued
  → running
      ├── retry_wait → running
      ├── needs_attention
      ├── canceled
      └── awaiting_approval
            └── finalizing
                  └── completed
```

Only actively executing/finalizing work carries
`active_slot: "article-generation"`. A unique partial index enforces the
single-worker limit even across processes. Waiting, retrying, and
`awaiting_approval` workflows release the slot so one pending review cannot
block later drafts.

Topic states are `proposed`, `queued`, `in_progress`, `used`, and `rejected`.
Only accepted `queued` topics can start a scheduled workflow.

## Agent Team and Artifacts

| Agent | Responsibility | Required artifact |
| --- | --- | --- |
| Topic Strategist | Select queued topic or propose a non-duplicate candidate | Topic proposal and rationale |
| Memory Librarian | Retrieve company, style, examples, and similarity evidence | Bounded context pack |
| Web Researcher | Find current, credible sources and claims | Research brief and source cards |
| Outline Architect | Design the article argument and section sequence | Structured outline |
| Article Writer | Write the complete initial or revised draft | Markdown article draft |
| Fact Checker | Map factual claims to evidence and flag unsupported claims | Claim-evidence report |
| Style and Brand Editor | Align voice, structure, terminology, and positioning | Revised draft and change log |
| SEO Reviewer | Suggest title, description, slug, keywords, and readability edits | SEO metadata and issue list |

All artifacts are schema-validated with Zod. Agents receive only their required
inputs. They return artifacts to the coordinator and never call one another.

Gemini 3.5 Flash Lite is the default for every role. Settings retain a per-role
model field so roles can be reassigned later without changing the coordinator.
Every agent run records its actual model, token usage, estimated cost, duration,
attempt number, and terminal status.

## Generation Flows

### Manual generation

The user supplies a topic or instructions, company, article count, desired
length, and optional schedule date. The application creates one independent
topic, article shell, and workflow per requested article. If multiple articles
share a broad instruction, the Topic Strategist must produce distinct angles
before any research begins.

### Daily generation

```text
Daily scheduler
  → claim highest-priority due queued topic
  → if none exists, ask Topic Strategist for a proposal
  → reject candidates too similar to existing work
  → create article and workflow
  → run editorial pipeline
  → place article in review inbox
```

Automatic generation means automatic drafting only. Approval always requires a
user action in the review UI.

### Editorial pipeline

```text
Topic Strategist
  → Memory Librarian
  → Web Researcher
  → Outline Architect
  → Article Writer
  → Fact Checker
  → Style and Brand Editor
  → SEO Reviewer
  → ready_for_review
```

The Fact Checker can request at most two Writer revision cycles. A Style Editor
revision is fact-checked again if it changes factual claims. The coordinator
enforces all loop limits.

### Approval

Approval must match both `awaiting_approval` and the exact candidate version,
which prevents approval of a stale draft. The decision has its own idempotency
key. It moves the authoritative workflow to `finalizing`; the worker creates or
repairs the approved version pointer, enqueues idempotent Supermemory indexing,
and then marks the workflow complete. The final approved text remains in the
app. Research sources stay private and are excluded from exported article
content.

## Web Research

The Researcher uses the OpenRouter server-side web-search tool through the
`ResearchProvider` abstraction. Initial limits are:

- Up to three search actions per article.
- Up to five results per search action.
- Up to fifteen total results.
- Normalized URL deduplication.
- Retrieval timestamps on every source.

Each source card stores URL, title, publisher/domain, retrieved time, relevant
evidence excerpt, and the claims it supports. The research brief distinguishes
source-backed facts from model synthesis.

Sources appear only in the review workspace. The final Markdown article contains
no automatic inline citations or source list.

## User Interface

Primary navigation:

```text
Dashboard
├── Create articles
├── Topic queue
├── Review inbox
├── Article library
├── Knowledge library
└── Settings
```

### Dashboard

Shows today's scheduled article, current workflow, failures requiring attention,
pending review count, recent approvals, and MongoDB/Supermemory/OpenRouter health.

### Create articles

Captures topic or instructions, company, number of articles, target length, and
optional scheduled date. A submission preview makes the number of workflows and
estimated generation scope explicit.

### Topic queue

Supports adding, reordering, pausing, accepting, and rejecting topics. Manual
queued topics take priority over AI proposals.

### Review inbox

Lists articles ready for review and highlights unsupported claims, duplication
warnings, and failed quality checks.

### Review workspace

```text
┌───────────────────────────────────────────────────────────────┐
│ Article title                 Status: Ready for review        │
├─────────────────────────────────────┬─────────────────────────┤
│                                     │ Sources                 │
│ Editable Markdown article           │ Agent reports           │
│                                     │ Similarity check        │
│                                     │ Version history         │
│                                     │ Cost and token usage    │
├─────────────────────────────────────┴─────────────────────────┤
│ Request changes   Regenerate section   Approve article        │
└───────────────────────────────────────────────────────────────┘
```

Requesting changes captures reviewer instructions and creates a new immutable
version after revision. Regenerating a section preserves the previous version.

### Article library

Supports filtering, searching, viewing version history, archiving, and exporting
approved content as Markdown or JSON.

### Knowledge library

Supports creating, editing, activating, and archiving company profiles, style
guides, rules, samples, and references. It shows Supermemory synchronization
status without exposing raw vector details.

### Settings

Contains schedule, generation defaults, model selection, research limits,
Supermemory connection health, MongoDB connection health, and a disabled future
publishing section. API secrets remain in local environment configuration and
are never returned to the browser or stored in article records.

## Error Handling and Recovery

- A workflow lease has an owner, incrementing epoch/fence, heartbeat, and expiry.
- Claiming work uses an atomic conditional update and database-side time.
- Expired leases become runnable after restart.
- Every workflow commit matches the workflow revision, lease owner, and lease
  epoch so a late worker cannot attach output after losing its lease.
- Each logical operation and attempt has a deterministic idempotency key.
- Each step reserves its attempt in `workflow_runs`, writes its artifact
  idempotently, and then attaches the artifact with a fenced update.
- Startup reconciliation completes missing projection updates and identifies
  unattached artifacts after a crash.
- Transient external failures receive two retries with bounded backoff.
- Retry time and deterministic jitter are persisted; correctness never depends
  on an in-memory timer.
- Invalid model output receives one schema-repair attempt.
- Exhausted retries move the workflow to `needs_attention`.
- A human can retry the failed step or cancel the workflow.
- The coordinator never repeats a completed step unless the user explicitly
  requests regeneration.
- Daily catch-up scheduling cannot create duplicate drafts.
- Supermemory synchronization failures do not discard approved articles; they
  remain visible as an actionable sync error.
- Unapproved content cannot reach the publisher adapter.
- Approval conditionally matches the current candidate version and records a
  decision id, preventing stale or repeated approval.
- Remote model and search calls are at-least-once: a crash after the provider
  responds but before persistence may repeat cost, but fencing prevents duplicate
  workflow advancement.

## Cost and Resource Controls

- One concurrent workflow by default.
- Search and revision-loop caps are enforced server-side.
- Context packs have per-category and overall size limits.
- Agent token use and estimated cost are persisted and shown in the review UI.
- Manual multi-article requests display their count before enqueueing.
- The worker can be paused without losing queued work.
- Model assignment is configurable per role, while Gemini 3.5 Flash Lite remains
  the initial default everywhere.

## Security and Privacy

- MongoDB, the web app, and Supermemory bind to localhost.
- Durable workflow and version writes use acknowledged journaled writes.
- Only the app server holds OpenRouter and Supermemory credentials.
- Secrets are loaded from local environment configuration and never logged.
- Source excerpts and relevant memory context are sent to OpenRouter during
  generation; the application is local-first, not fully offline.
- HTML from research sources is treated as untrusted input and converted to
  plain evidence text before model use or UI rendering.
- Any future non-local deployment requires authentication, MongoDB credentials,
  CSRF protection, hardened secret storage, and an explicit security review.

## Testing Strategy

### Unit tests

- Agent input and output schemas.
- Topic normalization and similarity thresholds.
- State transitions and approval guards.
- Retry, lease-expiry, and idempotency behavior.
- Context-pack limits and source normalization.
- Token and estimated-cost calculations.

### Integration tests

- MongoDB repositories against a disposable test database.
- Supermemory gateway with a mock server matching the local API.
- Model gateway with recorded or mocked OpenRouter responses.
- Research provider normalization and source annotations.
- Worker recovery after an interrupted step.

### End-to-end tests

- Manual single-article generation.
- Multi-article request producing distinct workflows.
- Daily queued-topic selection.
- AI topic fallback when the queue is empty.
- Failure, `needs_attention`, and retry.
- Request changes, section regeneration, and immutable versions.
- Approval and Supermemory indexing.
- Proof that unapproved content cannot invoke publishing.

## Health and Operations

The dashboard reports:

- MongoDB ping and database name.
- Supermemory API reachability.
- OpenRouter configuration status without revealing the key.
- Worker heartbeat and paused/running state.
- Oldest queued workflow and any expired leases.

The `mongodb_data` Docker volume provides persistence but is not a backup.
Version one documents a local `mongodump`/`mongorestore` procedure for recovery.
Startup also applies idempotent schema/index migrations and runs workflow
reconciliation before the worker claims new jobs.

## Future Publishing Extension

The future `PublisherAdapter` accepts only an approved immutable article version
plus explicit publishing metadata. It returns an external identifier, URL, and
publication timestamp. Adding a website publisher must not alter the generation
pipeline or allow approval bypass.

Potential future article states are:

```text
approved
  → scheduled_for_publish
  → publishing
      ├── published
      └── publish_failed
```

## Acceptance Criteria

- The local app can create, edit, and search knowledge items.
- Active knowledge synchronizes idempotently to local Supermemory.
- A manual request can generate one or multiple independent article workflows.
- A daily scheduler can choose a queued topic or create a non-duplicate proposal.
- All eight agent roles create schema-valid, inspectable artifacts.
- Web research produces private source cards linked to factual claims.
- Failed or interrupted workflows resume without duplicating completed work.
- The review UI supports editing, requesting changes, version comparison, and
  explicit approval.
- Approved articles are indexed into Supermemory and exportable as Markdown/JSON.
- Drafts and research sources remain private.
- No unapproved article can enter a publishing path.
- MongoDB, Supermemory, and worker health are visible locally.
