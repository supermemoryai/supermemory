# Supermemory docs

Holocron builds the public MDX documentation and OpenAPI reference into a Cloudflare Worker mounted at `/docs/`.

## Development

Use Bun 1.4.2 or newer; older releases fail when applying the compatibility patch's nested files. From the repository root, run `bun install`, then:

```sh
cd apps/docs
bun run dev:app
bun run check-types
bun run build
bunx wrangler dev --local --port 3003
```

The local site is at `http://localhost:3003/docs/`. Assets remain in the existing image, icon, logo, and video directories; preparation copies only public assets into the build input. Preparation downloads the public API specification and adds the existing API-page URLs from `scripts/api-paths.json`.

Preparation also renders page-specific PNG social cards from the original thumbnail background, logo and licensed Geist fonts. The Worker serves these static assets; image previews no longer call Holocron's hosted OG renderer. Frontmatter `og:image` overrides still take precedence.

For a Capy public preview of local Wrangler, pass `--var DOCS_PREVIEW_ORIGIN:https://<exact-preview-host>.capysandbox.net` to `wrangler dev`. This opt-in adapter accepts that exact browser origin only when the runtime request URL is loopback; it does not alter production same-origin checks or trust forwarded-host headers. Production reverse proxies must preserve the public request origin. Without this local-only setting, the assistant rejects the preview proxy's different origin with HTTP 403.

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

Same-site redirects use relative paths so previews and reverse-proxy deployments keep the browser on the public origin.

The API playground sends requests directly from the browser to the selected API server, not through the docs Worker. Before cutover, deploy the API's exact CORS allowance for `https://supermemory.ai`; arbitrary direct-Worker and preview origins are not allowed by the production API. Verify requests from the canonical website after routing it to the new Worker. Playground keys are transient and are cleared when closing the playground or changing servers.

Mintlify's repository integration does not run Holocron's preparation step, so it cannot fetch the generated OpenAPI file or validate generated API-page links. Its deployment and link checks fail against this migration. Before merging, retire the legacy repository deployment integration and replace any required Mintlify checks with the `Docs - Build, Deploy and Index` build job. Keep the existing Mintlify-hosted site live until the routing cutover is verified.

## Documentation indexing

```text
main push -> build -> deploy Worker -> fetch llms.txt and each .md export
                                       -> add new / replace changed pages
                                       -> wait for processing
                                       -> remove deleted pages
```

Only public exported documentation is indexed, including generated API pages. Source code, secrets, and PR previews are not indexed. `taskType: "superrag"` makes the material searchable without building user profiles. Unchanged content is skipped; deleted pages are removed only after the full inventory has synced successfully. If indexing fails, the deployed site remains available and the workflow fails; rerun it to reconcile the index.

Use a separate Supermemory project for documentation so visitor questions cannot retrieve other customer data. The indexing container and assistant both use `supermemory_docs`. The assistant retrieves document chunks, generates a plain-text answer with Workers AI, and returns source links. Questions are not stored as memories.

The header assistant, Ctrl+I/⌘I shortcut, inline page question box, page actions, and code-sample prompts use this same-site backend without adding a standalone assistant page to the original navigation. Conversations live only in the current tab's memory, with up to six prior messages sent for a follow-up. The server validates canonical page URLs, bounded code context, alternating user/assistant history, request size, origin, and the existing rate limit. Closing the drawer preserves the in-tab conversation; “New conversation” clears it. No questions or answers are written to browser storage or indexed as memories.

The original `contextual.options` controls the page-action menu. Markdown copies fetch the same-site `.md` export; MCP and editor actions use the canonical `https://supermemory.ai/docs/mcp` endpoint. The copied `npx -y mcp-remote` command starts a local stdio bridge to that endpoint and does not use Mintlify's hosted MCP service.

Page-helpfulness votes go to the `supermemory_docs_feedback` Cloudflare Analytics Engine dataset. Each event contains only the public page path and a yes/no value; no question, answer, browser identifier or IP is stored. The endpoint applies the same origin validation and rate-limit policy as chat.

`/docs/mcp` keeps public documentation search available to coding agents through a stateless Streamable HTTP MCP server. Its `search_docs` tool uses the same index; the documentation resource exposes the complete Markdown export without an LLM call.

To validate exports without an API key or writes:

```sh
DOCS_SITE_URL=http://localhost:3003/docs/ \
DOCS_CANONICAL_URL=https://supermemory.ai/docs/ \
bun run index-docs --dry-run
```

`DOCS_CANONICAL_URL` separates the fetch origin from citation URLs, so indexing the direct Worker URL does not leak that hostname into answers. Syncs must run one at a time for a site and container; the production workflow serializes them.

## Compatibility boundaries

- The pinned Holocron dependency uses a committed Bun compatibility patch. Keep that patch applied when installing; revalidate it before upgrading the renderer.
- Original tabs, nested anchors, SVG strokes, brand images and authored element styling are preserved. Existing page paths and redirects remain stable.
- Global search covers page titles, headings and public documentation body text. The body index loads from the same-site Markdown inventory on first use and stays in the current tab's memory; search remains local after that download.
- `api.playground.display: "interactive"` enables browser-side API requests with transient credentials, parameter/body controls and response display. No request credentials are sent to the docs Worker.
- Recursive filter schemas are expanded until a recursive boundary, which is labeled rather than expanded indefinitely. `/docs/openapi.json` serves the complete recursive specification.
- The built-in Holocron hosted assistant is disabled. Original assistant entry points use the custom Supermemory-backed documentation backend; real answer verification requires the Worker AI binding, the documentation-only API key, and a populated index.
