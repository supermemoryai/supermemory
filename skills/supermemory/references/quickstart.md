# Quickstart

Get from zero to a working add, search, and profile in both SDKs. Every call is scoped to one namespace, passed first.

## Step 1: Get an API key

Create a key in the [console](https://console.supermemory.ai). Keys start with `sm_`.

## Step 2: Install the SDK

```bash
npm i supermemory          # TypeScript, also ships the CLI (npx supermemory)
pip install -U supermemory # Python
```

Both packages must be 5.x. Earlier versions call the deprecated v3/v4 API.

## Step 3: Set the key

```bash
export SUPERMEMORY_API_KEY="sm_..."
```

Both clients read it by default.

```ts
import { Supermemory } from "supermemory"

const client = new Supermemory() // or new Supermemory({ apiKey })
```

```python
from supermemory import Supermemory

client = Supermemory()  # or Supermemory(api_key="...")
```

## Step 4: Add your first document

Give the document a stable `id`. Repeating the same `id` later appends or diffs into that document instead of creating a new one. Use `dreaming: "instant"` so memories form within about a minute; the default `dynamic` batches extraction and can take several minutes on a fresh namespace.

```ts
const { id, status } = await client.add("user_alex", {
  content: "Alex prefers morning meetings and works in design.",
  id: "conv_2026_10_14",
  metadata: { source: "chat" },
  dreaming: "instant",
})
```

```python
result = client.add(
    "user_alex",
    content="Alex prefers morning meetings and works in design.",
    id="conv_2026_10_14",
    metadata={"source": "chat"},
    dreaming="instant",
)
```

The response is `{ id, status }`. `status` is `queued` when new work started, or the document's current state for an unchanged duplicate.

## Step 5: Wait for processing

Processing is asynchronous. `system.status` tracks extraction and indexing. The REST response also carries `system.dreamingStatus`, which tracks memory formation and can finish minutes later under `dreaming: "dynamic"`. The 5.0.x SDK types do not declare that field yet, so SDK code polls `system.status` and uses `dreaming: "instant"` whenever the next step reads memories or the profile.

```ts
async function waitForDocument(namespace: string, id: string) {
  for (;;) {
    const doc = await client.documents.get(namespace, id)
    if (doc.system.status === "failed") throw new Error(`document ${id} failed`)
    if (doc.system.status === "done") return doc
    await new Promise((r) => setTimeout(r, 1000))
  }
}

await waitForDocument("user_alex", "conv_2026_10_14")
```

```python
import time

def wait_for_document(namespace: str, id: str):
    while True:
        doc = client.documents.get(namespace, id)
        if doc.system.status == "failed":
            raise RuntimeError(f"document {id} failed")
        if doc.system.status == "done":
            return doc
        time.sleep(1)

wait_for_document("user_alex", "conv_2026_10_14")
```

`system.status` values: `unknown`, `queued`, `extracting`, `chunking`, `embedding`, `indexing`, `done`, `failed`.

## Step 6: Search

One call, three modes. Omitting `searchMode` gives `hybrid`.

```ts
// Learned facts only
const memories = await client.search("user_alex", {
  query: "when does Alex like to meet?",
  searchMode: "memories",
  limit: 5,
})

// Source text only, classic RAG
const chunks = await client.search("user_alex", {
  query: "meeting preferences",
  searchMode: "chunks",
  include: { documents: true },
})

// Both in one ranked list
const hybrid = await client.search("user_alex", { query: "meeting preferences" })

for (const r of hybrid.results) {
  console.log(r.memory ?? r.chunk, r.score)
}
```

```python
memories = client.search("user_alex", query="when does Alex like to meet?", search_mode="memories", limit=5)
chunks = client.search("user_alex", query="meeting preferences", search_mode="chunks", include={"documents": True})
hybrid = client.search("user_alex", query="meeting preferences")

for r in hybrid.results:
    print(r.memory or r.chunk, r.score)
```

Each result carries `memory` or `chunk` (sometimes both), `score`, `system` timestamps, and `included` when requested. Branch on field presence. The response also has `searchTime` in milliseconds.

## Step 7: Read the profile

The profile is maintained for you. It takes no query; run a search when you need ranked results.

```ts
const { profile } = await client.profile("user_alex")
profile.static   // [{ id, memory }] standing facts
profile.dynamic  // [{ id, memory }] recent context
profile.buckets  // { [name]: [{ id, memory }] } custom buckets, if any
```

```python
response = client.profile("user_alex")
response.profile.static
response.profile.dynamic
response.profile.buckets
```

## Core workflow pattern

For a chatbot or assistant, every turn looks like this:

```ts
async function respond(userId: string, sessionId: string, userMessage: string) {
  const [{ profile }, { results }] = await Promise.all([
    client.profile(userId),
    client.search(userId, { query: userMessage, limit: 5 }),
  ])

  const context = [
    ...profile.static.map((m) => m.memory),
    ...profile.dynamic.map((m) => m.memory),
    ...results.map((r) => r.memory ?? r.chunk),
  ].join("\n")

  const reply = await callYourModel(context, userMessage)

  // Same session id, same document: the conversation keeps updating one document
  await client.add(userId, { content: `User: ${userMessage}\nAssistant: ${reply}`, id: sessionId })
  return reply
}
```

```python
def respond(user_id: str, session_id: str, user_message: str) -> str:
    profile = client.profile(user_id).profile
    results = client.search(user_id, query=user_message, limit=5).results

    context = "\n".join(
        [m.memory for m in profile.static]
        + [m.memory for m in profile.dynamic]
        + [r.memory or r.chunk for r in results]
    )
    reply = call_your_model(context, user_message)

    client.add(user_id, content=f"User: {user_message}\nAssistant: {reply}", id=session_id)
    return reply
```

## Understanding namespaces

A namespace is the isolation boundary. A document lives in exactly one.

- One namespace per end user (`user_123`) is the default choice.
- Use a compound name for per-project memory (`user_123_project_abc`).
- Put shared company knowledge in its own namespace (`org_acme_kb`). Read it with a second search and merge by `score`.
- Never pass two namespaces to one call and never guess the namespace from a document or memory id. A memory from another namespace returns `404`.

Existing namespaces: `client.namespaces.list()` returns `{ namespaces, pagination }`.

## Threshold

`threshold` is the minimum relevance score, 0 to 1. The default is `0.3`.

| Goal | Threshold |
| --- | --- |
| Broad recall, let the model filter | `0.1` to `0.3` |
| Balanced | `0.3` |
| Only strong matches | `0.5` to `0.7` |

Set it explicitly when comparing results across environments.

## Common patterns

### Metadata and typed filters

Metadata is any JSON object on the document. Filter with one typed `filter` object. The same shape works in `search`, `profile`, and `list`.

```ts
await client.add("user_alex", { content: "Q3 launch moves to October.", metadata: { source: "slack", priority: 3 } })

const { results } = await client.search("user_alex", {
  query: "launch date",
  filter: {
    operator: "and",
    operands: [
      { field: "source", operator: "eq", value: "slack" },
      { field: "priority", operator: "gte", value: 3 },
    ],
  },
})
```

```python
client.search(
    "user_alex",
    query="launch date",
    filter={
        "operator": "and",
        "operands": [
            {"field": "source", "operator": "eq", "value": "slack"},
            {"field": "priority", "operator": "gte", "value": 3},
        ],
    },
)
```

Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `notContains`, `arrayContains`, `arrayNotContains`, and `and` / `or` with `operands`.

### Upload a file

Files go through a multipart endpoint, so `metadata` is a JSON string there.

```ts
import { openAsBlob } from "node:fs"

await client.documents.uploadFile("user_alex", {
  file: await openAsBlob("notes.pdf"),
  metadata: JSON.stringify({ source: "upload" }),
})
```

```python
with open("notes.pdf", "rb") as f:
    client.documents.upload_file("user_alex", file=f)
```

Poll the returned `id` as in Step 5. PDFs and videos take longer than text.

### Add a URL

Pass the URL as `content`. The page is fetched and processed like any other document.

```ts
await client.add("user_alex", { content: "https://example.com/post", id: "post_1" })
```

```python
client.add("user_alex", content="https://example.com/post", id="post_1")
```

### List what is stored

```ts
const { documents, pagination } = await client.list("user_alex", "documents", { limit: 20, sort: "createdAt", order: "desc" })
const { memories } = await client.list("user_alex", "memories")
```

```python
page = client.list("user_alex", "documents", limit=20, sort="createdAt", order="desc")
memories = client.list("user_alex", "memories").memories
```

### Forget memories

Preview by meaning with `dryRun: true`, review the ids, then forget those exact ids. Running the semantic request again with `dryRun: false` can pick a different set if memories changed.

```ts
const preview = await client.memories.forgetMatching("user_alex", { query: "old home address", dryRun: true })
await client.memories.forget("user_alex", { ids: preview.matches.map((m) => m.id) })
```

```python
preview = client.memories.forget_matching("user_alex", query="old home address", dry_run=True)
client.memories.forget("user_alex", ids=[m.id for m in preview.matches])
```

Both return `{ count, matches, errors }`. Check `errors` even on HTTP success.

### Delete documents

```ts
const { count, errors } = await client.documents.delete("user_alex", { ids: ["conv_2026_10_14"] })
```

```python
client.documents.delete("user_alex", ids=["conv_2026_10_14"])
```

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Search returns nothing right after `add` | Default `dreaming: "dynamic"` batches memory extraction | Add with `dreaming: "instant"`, or wait a few minutes; `GET /ns/{ns}/document/{id}` shows `system.dreamingStatus` |
| Profile is empty on a new namespace | Same as above | Same as above |
| `400` on a request | An option is in the wrong place, or a legacy field was sent | `GET` options go in the query string, `POST` options in the body. Remove legacy field names, see "Never emit" in SKILL.md |
| `401` | Wrong or missing key | Check `SUPERMEMORY_API_KEY`, header is `Authorization: Bearer sm_...` |
| `404` on a memory or document | It belongs to another namespace | Use the namespace the content was added to |
| TypeScript method does not exist | Pre-5 SDK installed | `npm i supermemory@5`, see the method map in `sdk-guide.md` |

## Next steps

- `sdk-guide.md`: every method, option, response, error, and client setting.
- `api-reference.md`: the REST endpoints with cURL.
- `sdk-integrations.md`: Vercel AI SDK, OpenAI, Mastra, and other framework code.
- `use-cases.md`: complete chatbot, task assistant, RAG, support, and multi-tenant examples.
- `architecture.md`: how documents become memories and how retrieval ranks them.
