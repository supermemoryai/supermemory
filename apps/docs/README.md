# Supermemory docs

Holocron builds the public MDX documentation and OpenAPI reference into a Cloudflare Worker mounted at `/docs/`.

## Development

From the repository root, run `bun install`, then:

```sh
cd apps/docs
bun run dev:app
bun run check-types
bun run build
bunx wrangler dev --local --port 3003
```

The local site is at `http://localhost:3003/docs/`. Assets remain in the existing image, icon, logo, and video directories; preparation copies only public assets into the build input. Preparation downloads the public API specification and adds the existing API-page URLs from `scripts/api-paths.json`.

## Production setup

Deployment is disabled until the repository variable `DOCS_CLOUDFLARE_ENABLED` is `true`. PRs always validate the build; enabled production deployments run after pushes to `main` or a manual workflow run on `main`.

Configure these GitHub Actions values:

| Kind | Name | Purpose |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Deploy the docs Worker and its static assets. |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Select the Cloudflare account. |
| Variable | `DOCS_SITE_URL` | Direct deployed URL, including `/docs/`, such as `https://supermemory-docs.<account>.workers.dev/docs/`. |
| Secret | `SUPERMEMORY_DOCS_API_KEY` | Index the public docs in a dedicated Supermemory project. |
| Variable | `DOCS_CLOUDFLARE_ENABLED` | Set to `true` only after the Worker and indexing credentials are ready. |

Add that same Supermemory key to the Worker as `SUPERMEMORY_API_KEY`, without committing it:

```sh
bunx wrangler secret put SUPERMEMORY_API_KEY
```

The Worker uses its `AI` binding for answer generation and `CHAT_RATE_LIMITER` for an approximate per-IP limit of ten questions per minute per Cloudflare location. Workers AI usage is billed to the Cloudflare account.

### Cutover

First deploy and inspect the direct Workers URL while Mintlify remains live. Keep `https://supermemory.ai/docs/` as the canonical URL. Switch the existing `/docs/*` proxy or Cloudflare route to this Worker only after verification; forward the full path without stripping `/docs`. Preserve the rest of the main website. The Wrangler configuration does not change public DNS or routes automatically.

## Documentation indexing

```text
main push -> build -> deploy Worker -> fetch llms.txt and each .md export
                                       -> add new / replace changed pages
                                       -> wait for processing
                                       -> remove deleted pages
```

Only public exported documentation is indexed, including generated API pages. Source code, secrets, and PR previews are not indexed. `taskType: "superrag"` makes the material searchable without building user profiles. Unchanged content is skipped; deleted pages are removed only after the full inventory has synced successfully. If indexing fails, the deployed site remains available and the workflow fails; rerun it to reconcile the index.

Use a separate Supermemory project for documentation so visitor questions cannot retrieve other customer data. The indexing container and assistant both use `supermemory_docs`. The assistant retrieves document chunks, generates a plain-text answer with Workers AI, and returns source links. Questions are not stored as memories.

`/docs/mcp` keeps public documentation search available to coding agents through a stateless Streamable HTTP MCP server. Its `search_docs` tool uses the same index; the documentation resource exposes the complete Markdown export without an LLM call.

To validate exports without an API key or writes:

```sh
DOCS_SITE_URL=http://localhost:3003/docs/ \
DOCS_CANONICAL_URL=https://supermemory.ai/docs/ \
bun run index-docs --dry-run
```

`DOCS_CANONICAL_URL` separates the fetch origin from citation URLs, so indexing the direct Worker URL does not leak that hostname into answers. Syncs must run one at a time for a site and container; the production workflow serializes them.

## Compatibility boundaries

- The API reference is read-only; there is no Mintlify request playground.
- Nested navigation sections are represented as Holocron tabs. Existing authored paths, API-page paths, and redirects remain stable.
- Recursive filter schemas are expanded until a recursive boundary, which is labeled rather than expanded indefinitely. `/docs/openapi.json` serves the complete recursive specification.
- Four unsupported navigation image icons use Lucide equivalents; the original public images remain available.
- The built-in Holocron hosted assistant is disabled. “Ask AI” opens the custom Supermemory-backed documentation Q&A page.
