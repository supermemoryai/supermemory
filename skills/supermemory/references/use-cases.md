# Supermemory Use Cases

Complete examples for common patterns, written against the v5 SDKs: `supermemory` 5.x on npm and PyPI. Every call takes the namespace first, then one object (TypeScript) or keyword arguments (Python).

## Table of Contents

1. [Personalized Chatbot](#1-personalized-chatbot)
2. [Long-Term Task Assistant](#2-long-term-task-assistant)
3. [Document Knowledge Base](#3-document-knowledge-base)
4. [Customer Support AI](#4-customer-support-ai)
5. [Code Review Assistant](#5-code-review-assistant)
6. [Learning Companion](#6-learning-companion)
7. [Multi-Tenant SaaS Application](#7-multi-tenant-saas-application)
8. [Research Assistant](#8-research-assistant)
9. [Common Patterns](#common-patterns-across-use-cases)

Shared setup for the TypeScript examples:

```typescript
import { Supermemory } from "supermemory"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

const memory = new Supermemory() // reads SUPERMEMORY_API_KEY
```

---

## 1. Personalized Chatbot

A chatbot that remembers preferences and past conversations per user.

### TypeScript

```typescript
async function chat(userId: string, sessionId: string, message: string) {
  // Standing facts and recent context
  const { profile } = await memory.profile(userId)
  // Memories relevant to this message
  const { results } = await memory.search(userId, { query: message, searchMode: "memories", limit: 5 })

  const staticFacts = profile.static.map((m) => `- ${m.memory}`).join("\n")
  const dynamicFacts = profile.dynamic.map((m) => `- ${m.memory}`).join("\n")
  const relevant = results.map((r) => `- ${r.memory ?? r.chunk}`).join("\n")

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You are a helpful assistant with memory of this user.

User profile:
${staticFacts}

Recent context:
${dynamicFacts}

Relevant to this message:
${relevant}`,
    prompt: message,
  })

  // One session id keeps the whole conversation in one evolving document
  await memory.add(userId, {
    content: `User: ${message}\nAssistant: ${text}`,
    id: sessionId,
    metadata: { type: "conversation" },
  })

  return text
}

await chat("user_123", "session_2026_10_14", "What did I tell you about my preferences?")
```

### Python

```python
from supermemory import Supermemory
from openai import OpenAI

memory = Supermemory()
openai_client = OpenAI()


def chat(user_id: str, session_id: str, message: str) -> str:
    profile = memory.profile(user_id).profile
    results = memory.search(user_id, query=message, search_mode="memories", limit=5).results

    static_facts = "\n".join(f"- {m.memory}" for m in profile.static)
    dynamic_facts = "\n".join(f"- {m.memory}" for m in profile.dynamic)
    relevant = "\n".join(f"- {r.memory or r.chunk}" for r in results)

    system_prompt = f"""You are a helpful assistant with memory of this user.

User profile:
{static_facts}

Recent context:
{dynamic_facts}

Relevant to this message:
{relevant}"""

    completion = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
    )
    text = completion.choices[0].message.content

    # Same session id, same document
    memory.add(
        user_id,
        content=f"User: {message}\nAssistant: {text}",
        id=session_id,
        metadata={"type": "conversation"},
    )
    return text
```

With the default `dreaming: "dynamic"`, memories from a new conversation appear after a few minutes. Pass `dreaming: "instant"` on `add` when the next turn must see them right away.

---

## 2. Long-Term Task Assistant

Tracks projects and tasks over weeks. Each task is one document keyed by its id, so status changes update the same document.

```typescript
interface Task {
  id: string
  title: string
  status: "todo" | "in_progress" | "done"
  priority: "low" | "medium" | "high"
}

const tasksNamespace = (userId: string) => `${userId}_tasks`

async function upsertTask(userId: string, task: Task) {
  // Repeating the id appends the change into the existing task document
  await memory.add(tasksNamespace(userId), {
    content: `Task: ${task.title}. Status: ${task.status}. Priority: ${task.priority}.`,
    id: task.id,
    metadata: { status: task.status, priority: task.priority },
    dreaming: "instant",
  })
}

async function taskAssistant(userId: string, query: string) {
  const { profile } = await memory.profile(tasksNamespace(userId))
  const { results } = await memory.search(tasksNamespace(userId), {
    query,
    searchMode: "memories",
    limit: 10,
  })

  const context = [...profile.dynamic.map((m) => m.memory), ...results.map((r) => r.memory ?? r.chunk)]

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You are a task assistant with memory of the user's projects.\n\nKnown tasks and context:\n${context.map((c) => `- ${c}`).join("\n")}`,
    prompt: query,
  })
  return text
}

async function highPriorityOpen(userId: string) {
  // Typed filter on the metadata you stored
  return memory.list(tasksNamespace(userId), "documents", {
    filter: {
      operator: "and",
      operands: [
        { field: "priority", operator: "eq", value: "high" },
        { field: "status", operator: "neq", value: "done" },
      ],
    },
  })
}

await upsertTask("user_123", { id: "task_1", title: "Implement authentication", status: "in_progress", priority: "high" })
await taskAssistant("user_123", "What are my high priority tasks?")
await upsertTask("user_123", { id: "task_1", title: "Implement authentication", status: "done", priority: "high" })
await taskAssistant("user_123", "What did I finish today?")
```

---

## 3. Document Knowledge Base

Semantic search over documentation, manuals, and articles. This is RAG: index with `taskType: "superrag"` so no memories are extracted, then search chunks.

```typescript
const DOCS = "documentation"

async function indexDocumentation() {
  const pages = [
    { url: "https://docs.example.com/getting-started", category: "onboarding" },
    { url: "https://docs.example.com/api-reference", category: "api" },
    { url: "https://docs.example.com/security", category: "security" },
  ]

  // A URL as content is fetched and extracted server side
  const { results, failed } = await memory.documents.batchAdd(DOCS, {
    documents: pages.map((p) => ({ content: p.url, id: p.url, metadata: { category: p.category } })),
    taskType: "superrag",
  })
  if (failed > 0) console.warn(results.filter((r) => r.status === "error"))
}

async function searchDocs(query: string, category?: string) {
  const { results } = await memory.search(DOCS, {
    query,
    searchMode: "chunks",
    limit: 10,
    include: { documents: true },
    filter: category ? { field: "category", operator: "eq", value: category } : undefined,
  })
  return results.map((r) => ({
    text: r.chunk ?? r.memory,
    similarity: r.similarity,
    source: r.included?.document,
  }))
}

async function askDocumentation(question: string) {
  const hits = (await searchDocs(question)).slice(0, 5)
  const context = hits.map((h) => h.text).join("\n\n---\n\n")

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `Answer using only the context below. If the answer is not there, say so.\n\n${context}`,
    prompt: question,
  })
  return { answer: text, sources: hits }
}

await indexDocumentation()
const { answer, sources } = await askDocumentation("How do I authenticate API requests?")
```

Wait for `system.status === "done"` on each document before the first search. `documents.get(DOCS, id)` returns it.

---

## 4. Customer Support AI

One namespace per customer. Tickets are documents keyed by ticket id; resolutions append to the same ticket.

```typescript
interface Customer { id: string; name: string; email: string; plan: "free" | "pro" | "enterprise" }
interface Ticket { id: string; customerId: string; subject: string; description: string }

async function createCustomer(c: Customer) {
  await memory.add(c.id, {
    content: `Customer ${c.name} (${c.email}) is on the ${c.plan} plan.`,
    id: "profile",
    metadata: { type: "profile", plan: c.plan },
    dreaming: "instant",
  })
}

async function createTicket(t: Ticket) {
  await memory.add(t.customerId, {
    content: `Ticket ${t.id}: ${t.subject}\n${t.description}`,
    id: t.id,
    metadata: { type: "ticket", status: "open" },
  })
}

async function resolveTicket(customerId: string, ticketId: string, resolution: string) {
  // Same id, so the resolution becomes part of the ticket's history
  await memory.add(customerId, {
    content: `Ticket ${ticketId} resolved: ${resolution}`,
    id: ticketId,
    metadata: { type: "ticket", status: "resolved" },
  })
}

async function supportAssistant(customerId: string, query: string) {
  const { profile } = await memory.profile(customerId)
  const { results } = await memory.search(customerId, {
    query,
    filter: { field: "type", operator: "eq", value: "ticket" },
    limit: 5,
  })

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You are a support assistant with this customer's history.

Customer:
${profile.static.map((m) => `- ${m.memory}`).join("\n")}

Recent activity:
${profile.dynamic.map((m) => `- ${m.memory}`).join("\n")}

Related tickets:
${results.map((r) => `- ${r.memory ?? r.chunk}`).join("\n")}`,
    prompt: query,
  })
  return text
}

async function openTickets(customerId: string) {
  return memory.list(customerId, "documents", {
    filter: {
      operator: "and",
      operands: [
        { field: "type", operator: "eq", value: "ticket" },
        { field: "status", operator: "eq", value: "open" },
      ],
    },
  })
}

await createCustomer({ id: "cust_123", name: "Alice Johnson", email: "alice@example.com", plan: "pro" })
await createTicket({ id: "ticket_001", customerId: "cust_123", subject: "Cannot export data", description: "Error when exporting CSV" })
await supportAssistant("cust_123", "Customer is asking about data export again")
await resolveTicket("cust_123", "ticket_001", "Updated to the latest version")
```

---

## 5. Code Review Assistant

Two namespaces per project: the codebase as source chunks, and past reviews as memories.

```typescript
import * as fs from "node:fs"
import * as path from "node:path"

const codeNs = (projectId: string) => `${projectId}_codebase`
const reviewNs = (projectId: string) => `${projectId}_reviews`

async function indexCodebase(projectId: string, directory: string) {
  const files = getAllFiles(directory, [".ts", ".tsx", ".js", ".jsx"])
  const documents = files.map((file) => {
    const relativePath = path.relative(directory, file)
    return {
      content: `File: ${relativePath}\n\n${fs.readFileSync(file, "utf-8")}`,
      id: relativePath,
      metadata: { language: path.extname(file).slice(1), path: relativePath },
    }
  })
  // Source code is reference material, not memories
  for (let i = 0; i < documents.length; i += 600) {
    await memory.documents.batchAdd(codeNs(projectId), { documents: documents.slice(i, i + 600), taskType: "superrag" })
  }
}

async function indexPR(projectId: string, prNumber: number, diff: string, comments: string[]) {
  await memory.add(reviewNs(projectId), {
    content: `PR #${prNumber}\n\nDiff:\n${diff}\n\nReview comments:\n${comments.join("\n")}`,
    id: `pr_${prNumber}`,
    metadata: { number: prNumber },
  })
}

async function reviewCode(projectId: string, code: string, fileName: string) {
  const [{ results: similarCode }, { results: pastReviews }] = await Promise.all([
    memory.search(codeNs(projectId), { query: code, searchMode: "chunks", limit: 5 }),
    memory.search(reviewNs(projectId), { query: `review feedback for ${fileName}`, searchMode: "memories", limit: 5 }),
  ])

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You review code for this project.

Similar code in the repo:
${similarCode.map((r) => r.chunk ?? r.memory).join("\n\n---\n\n")}

Past review feedback:
${pastReviews.map((r) => r.memory ?? r.chunk).join("\n")}`,
    prompt: `Review this code from ${fileName}:\n\n${code}`,
  })
  return text
}

function getAllFiles(dir: string, extensions: string[]): string[] {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && extensions.includes(path.extname(e.name)))
    .map((e) => path.join(e.parentPath, e.name))
}
```

---

## 6. Learning Companion

A tutor that adapts to a student's history. Sessions carry `understanding` metadata so weak and strong topics can be pulled with filters.

```typescript
interface LearningSession {
  studentId: string
  topic: string
  content: string
  understanding: "low" | "medium" | "high"
  questions: string[]
}

async function recordLearningSession(s: LearningSession) {
  await memory.add(s.studentId, {
    content: `Topic: ${s.topic}\nUnderstanding: ${s.understanding}\nCovered: ${s.content}\nQuestions: ${s.questions.join(", ") || "none"}`,
    metadata: { type: "learning_session", topic: s.topic, understanding: s.understanding },
    dreaming: "instant",
  })
}

async function topicsByUnderstanding(studentId: string, level: "low" | "high") {
  const { documents } = await memory.list(studentId, "documents", {
    filter: {
      operator: "and",
      operands: [
        { field: "type", operator: "eq", value: "learning_session" },
        { field: "understanding", operator: "eq", value: level },
      ],
    },
  })
  return [...new Set(documents.map((d) => String(d.metadata?.topic)))]
}

async function adaptiveTutor(studentId: string, question: string) {
  const [{ profile }, weak, strong] = await Promise.all([
    memory.profile(studentId),
    topicsByUnderstanding(studentId, "low"),
    topicsByUnderstanding(studentId, "high"),
  ])

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You are a tutor who knows this student.

Student:
${profile.static.map((m) => `- ${m.memory}`).join("\n")}

Struggles with: ${weak.join(", ") || "nothing recorded yet"}
Strong in: ${strong.join(", ") || "nothing recorded yet"}

Recent learning:
${profile.dynamic.slice(0, 5).map((m) => `- ${m.memory}`).join("\n")}

Match the difficulty to the student. Explain new ideas with analogies to topics they already know.`,
    prompt: question,
  })
  return text
}

await recordLearningSession({ studentId: "student_456", topic: "React Hooks", content: "useState and useEffect basics", understanding: "medium", questions: ["When should I use useEffect?"] })
await recordLearningSession({ studentId: "student_456", topic: "TypeScript", content: "Type annotations and interfaces", understanding: "high", questions: [] })
await adaptiveTutor("student_456", "Explain useMemo to me")
```

---

## 7. Multi-Tenant SaaS Application

Isolate data per organization and per user, with a shared organization namespace. A v5 request reads one namespace, so a search that spans user and shared data is two searches merged by similarity.

```typescript
function namespaces(orgId: string, userId: string) {
  return {
    user: `org_${orgId}_user_${userId}`,
    shared: `org_${orgId}_shared`,
  }
}

async function addOrgKnowledge(orgId: string, content: string) {
  await memory.add(namespaces(orgId, "").shared, { content, metadata: { visibility: "organization" } })
}

async function addUserData(orgId: string, userId: string, content: string) {
  await memory.add(namespaces(orgId, userId).user, { content, metadata: { visibility: "private" } })
}

async function search(orgId: string, userId: string, query: string, includeShared = true) {
  const ns = namespaces(orgId, userId)
  const targets = includeShared ? [ns.user, ns.shared] : [ns.user]

  // One request per namespace, then one ranked list
  const responses = await Promise.all(targets.map((n) => memory.search(n, { query, limit: 10 })))
  return responses
    .flatMap((r, i) => r.results.map((result) => ({ ...result, namespace: targets[i] })))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)
}

await addOrgKnowledge("acme", "Company policy: remote work allowed")
await addOrgKnowledge("other", "Company policy: office only")
await addUserData("acme", "alice", "Alice prefers dark mode")
await addUserData("acme", "bob", "Bob prefers light mode")

await search("acme", "alice", "work policy") // acme shared + alice, never bob or other
await search("acme", "bob", "preferences") // bob's own preference only
```

Give each namespace context once so extraction knows what it is looking at:

```typescript
await memory.namespaces.update("org_acme_shared", { supportingContext: "Company-wide policies and documentation for Acme" })
```

Deleting a tenant removes everything in its namespaces:

```typescript
await memory.namespaces.delete("org_acme_user_alice")
```

---

## 8. Research Assistant

Papers and notes in one namespace per researcher. Memories link related content across documents, so a note about two papers connects them.

```typescript
interface Paper { title: string; authors: string[]; abstract: string; url: string; year: number }

const researchNs = (userId: string) => `${userId}_research`

async function addPaper(userId: string, paper: Paper) {
  await memory.add(researchNs(userId), {
    content: `Title: ${paper.title}\nAuthors: ${paper.authors.join(", ")}\nYear: ${paper.year}\nAbstract: ${paper.abstract}\nURL: ${paper.url}`,
    id: paper.url,
    metadata: { type: "paper", year: paper.year, title: paper.title },
  })
}

async function addResearchNote(userId: string, note: string, relatedPapers: string[]) {
  await memory.add(researchNs(userId), {
    content: note,
    metadata: { type: "note", relatedPapers },
  })
}

async function findRelatedResearch(userId: string, topic: string) {
  const { results } = await memory.search(researchNs(userId), {
    query: topic,
    limit: 20,
    include: { documents: true, related: true },
  })
  const papers = results.filter((r) => r.included?.document?.metadata?.type === "paper")
  const notes = results.filter((r) => r.included?.document?.metadata?.type === "note")
  return { papers, notes }
}

async function synthesizeInsights(userId: string, question: string) {
  const related = await findRelatedResearch(userId, question)
  const context = [
    "=== Papers ===",
    ...related.papers.map((p) => p.memory ?? p.chunk),
    "=== Notes ===",
    ...related.notes.map((n) => n.memory ?? n.chunk),
  ].join("\n\n")

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You synthesize insights across papers and notes.\n\n${context}`,
    prompt: question,
  })
  return text
}

// Forget a retracted finding: preview, review, then forget the exact ids
async function forgetFinding(userId: string, description: string) {
  const preview = await memory.memories.forgetMatching(researchNs(userId), { query: description, dryRun: true })
  console.log(preview.matches.map((m) => `${m.id}: ${m.memory}`))
  await memory.memories.forget(researchNs(userId), { ids: preview.matches.map((m) => m.id) })
}

await addPaper("researcher_123", { title: "Attention Is All You Need", authors: ["Vaswani et al."], year: 2017, abstract: "A network architecture based on attention...", url: "https://arxiv.org/abs/1706.03762" })
await addPaper("researcher_123", { title: "BERT", authors: ["Devlin et al."], year: 2018, abstract: "Bidirectional pre-training of transformers...", url: "https://arxiv.org/abs/1810.04805" })
await addResearchNote("researcher_123", "BERT builds on the Transformer from Attention Is All You Need", ["https://arxiv.org/abs/1706.03762", "https://arxiv.org/abs/1810.04805"])
await synthesizeInsights("researcher_123", "How did transformers evolve from 2017 to 2018?")
```

---

## Common Patterns Across Use Cases

### Pattern 1: Retrieve before generating

```typescript
const [{ profile }, { results }] = await Promise.all([
  memory.profile(userId),
  memory.search(userId, { query: userMessage, limit: 5 }),
])

const { text } = await generateText({
  model: openai("gpt-4o"),
  system: `Profile:\n${profile.static.map((m) => m.memory).join("\n")}\n\nRecent:\n${profile.dynamic.map((m) => m.memory).join("\n")}\n\nRelevant:\n${results.map((r) => r.memory ?? r.chunk).join("\n")}`,
  prompt: userMessage,
})
```

Profile and search are separate calls. Profile takes no query.

### Pattern 2: Store after the interaction, keyed by session

```typescript
await memory.add(userId, {
  content: `User: ${input}\nAssistant: ${output}`,
  id: sessionId,
  metadata: { type: "conversation" },
})
```

### Pattern 3: Metadata now, typed filters later

```typescript
await memory.add(userId, {
  content: data,
  metadata: { type: "conversation", category: "support", priority: "high", tags: ["billing", "urgent"] },
})

const { results } = await memory.search(userId, {
  query: "billing issues",
  filter: {
    operator: "and",
    operands: [
      { field: "priority", operator: "eq", value: "high" },
      { field: "tags", operator: "arrayContains", value: "billing" },
    ],
  },
})
```

The same `filter` shape works in `list` and `profile`.

### Pattern 4: Namespace hierarchy by naming

```typescript
const ns = {
  org: `org_${orgId}`,
  team: `org_${orgId}_team_${teamId}`,
  user: `org_${orgId}_team_${teamId}_user_${userId}`,
}

// Each level is its own search; merge by similarity when you need more than one
const [orgWide, teamSpecific] = await Promise.all([
  memory.search(ns.org, { query: "company policies", limit: 10 }),
  memory.search(ns.team, { query: "team resources", limit: 10 }),
])
```

Namespaces are flat identifiers. The hierarchy lives in your naming scheme, not in the API.

### Pattern 5: Wait for processing when the next step reads memories

```typescript
async function waitForMemories(namespace: string, id: string) {
  for (;;) {
    const doc = await memory.documents.get(namespace, id)
    if (doc.system.status === "failed") throw new Error(`document ${id} failed`)
    if (doc.system.status === "done") return doc
    await new Promise((r) => setTimeout(r, 2000))
  }
}
```

`system.status` covers extraction and indexing. Memory formation under `dreaming: "dynamic"` can finish minutes later; the REST document read exposes it as `system.dreamingStatus`, not yet in the 5.0.x SDK types. Ingest with `dreaming: "instant"` when the next step reads memories, and skip the wait in tests and quickstarts.

## Next Steps

Start with [quickstart.md](quickstart.md), then [sdk-guide.md](sdk-guide.md) for every method and option.
