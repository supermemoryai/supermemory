# Supermemory for Dify

A Dify tool plugin that gives agents and workflows long-term memory through [Supermemory](https://supermemory.ai).

Supermemory is a hosted memory API for AI agents. It stores content, extracts memories from it, keeps a per-user profile, and returns relevant context on search.

- Source repository: https://github.com/supermemoryai/supermemory/tree/main/packages/dify-plugin
- Supermemory docs: https://supermemory.ai/docs
- Contact: support@supermemory.com

## Tools

| Tool | What it does |
| --- | --- |
| Add Memory | Stores text or a URL in a namespace. Supermemory extracts memories from it in the background. |
| Search Memories | Returns memories and source passages relevant to a query. |
| Get Profile | Returns the profile Supermemory maintains for a namespace. |
| Forget Memories | Removes specific memories from recall by ID. |

Every tool takes a **namespace**. A namespace is any string that isolates one set of memories, usually a user ID or a project ID. Use the same namespace when you add and when you search.

## Setup

1. Create an API key in the [Supermemory console](https://console.supermemory.ai). Keys start with `sm_`.
2. In Dify, install the Supermemory plugin from the Marketplace, then open the Supermemory tool provider and authorize it.
3. Paste the key into **Supermemory API key** and save. Dify checks the key with one read-only request.

### Connection requirements

The plugin makes outbound HTTPS requests to `api.supermemory.ai` and to no other host. A self-hosted Dify instance must allow that connection from the plugin runtime. No inbound endpoint or webhook is needed.

## Usage

### Add Memory

| Parameter | Required | Description |
| --- | --- | --- |
| `namespace` | yes | User ID, project ID or any string that isolates the memories. |
| `content` | yes | Text to remember, or a URL to supported content. |
| `document_id` | no | Stable caller-defined ID. Adding again with the same ID appends to that document, so reuse one ID per conversation or session. |
| `metadata` | no | JSON object with string, number or boolean values, for example `{"source": "dify", "priority": 2}`. |
| `dreaming` | no | `dynamic` (default) or `instant`. See the note below. |

Adding is asynchronous. With the default `dynamic` mode, memories can take a few minutes to appear in search. `instant` skips the batching, so a new memory is usually searchable within about a minute. Instant mode bills one extra operation per document.

Returns the document `id` and its processing `status`.

### Search Memories

| Parameter | Required | Description |
| --- | --- | --- |
| `namespace` | yes | The namespace to search. |
| `query` | yes | Question, topic or phrase to search for. |
| `limit` | no | Maximum number of results, 1 to 100. Default 10. |
| `search_mode` | no | `hybrid` (default) combines memories with source chunks, `memories` returns learned context, `chunks` returns source passages. |
| `threshold` | no | Minimum relevance score, 0 to 1. Default 0.3. |

Returns `results`, each with an `id`, the `memory` or `chunk` text, `metadata` and a `similarity` score.

### Get Profile

| Parameter | Required | Description |
| --- | --- | --- |
| `namespace` | yes | The namespace whose profile to read. |

Returns `profile.static` (durable facts), `profile.dynamic` (recent context) and `profile.buckets` (custom sections). Each entry has an `id` and a `memory`.

### Forget Memories

| Parameter | Required | Description |
| --- | --- | --- |
| `namespace` | yes | The namespace that contains the memories. |
| `memory_ids` | yes | Memory IDs as a comma-separated list or a JSON array. |

Returns the number of memories matched, the matched memories and any per-ID errors.

### Outputs

Each tool returns a `text` output that an LLM node or an agent can read directly, and a `json` output with the Supermemory API response for use in later workflow nodes.

## Example workflow

A chatflow that remembers each user across conversations:

1. **Start** node. The conversation exposes `sys.user_id` and `sys.query`.
2. **Search Memories** tool node. Set `namespace` to `sys.user_id` and `query` to `sys.query`.
3. **LLM** node. Put the `text` output of Search Memories in the system prompt as context, then answer `sys.query`.
4. **Add Memory** tool node. Set `namespace` to `sys.user_id`, set `content` to the user message and the LLM answer, and set `document_id` to `sys.conversation_id` so the whole conversation is one document.
5. **Answer** node. Return the LLM output.

To greet a returning user with what is already known, add a **Get Profile** node with `namespace` set to `sys.user_id` before the LLM node.

In an Agent app, enable the four tools and tell the agent in its instructions which namespace to use, for example the current user ID.

## Development

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt pytest
.venv/bin/python -m pytest
```

The tests mock the Supermemory client and make no network calls.

To debug against a Dify instance, copy `.env.example` to `.env`, fill in the remote server address and debug key from the Dify **Plugins** page, and run `.venv/bin/python -m main`.

## Privacy

See [PRIVACY.md](PRIVACY.md).
