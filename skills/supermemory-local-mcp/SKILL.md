---
name: supermemory-local-mcp
description: Use when setting up Supermemory (self-hosted local server at localhost:6767) and wiring it into Hermes plus MCP clients (Claude Code, OpenCode, Cline, Kilo Code, Zed) so they share one local memory store. Covers the missing-LLM-key startup failure, the stdio MCP bridge, and the systemd auto-start unit.
---

# Supermemory Local + MCP Bridge

Run Supermemory **fully locally** (no cloud dependency) and expose it to Hermes
and any MCP-capable editor as one shared memory layer.

## When to use
- User installed `supermemoryai/supermemory` locally and it "isn't connected" — almost always the server isn't running OR `memory.provider`/`supermemory.json` isn't set.
- User wants the SAME memory available in Claude Code, OpenCode, Cline, Kilo Code, and Zed.
- Local server won't start with `No model provider API key configured`.

## Key facts (verified on this env)
- Local server binary: `~/.supermemory/bin/supermemory-server` (ELF/Bun). Data store lives in `~/.supermemory/.supermemory` (pin with `SUPERMEMORY_DATA_DIR=~/.supermemory` or the store follows CWD).
- Local API key printed on first boot, stored at `~/.supermemory/api-key`.
- Server listens on `http://localhost:6767`. **It has NO MCP endpoint** — only REST v3 (`/v3/documents`, `/v3/search`, `/v3/documents/list`). `v4/*` endpoints are NOT available locally.
- Server **refuses to start without an LLM key** for memory extraction: needs `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GROQ_API_KEY`.
- Official `https://mcp.supermemory.ai/mcp` is a *remote* OAuth server — do NOT use it if the goal is local-only data.

## The bridge (why it exists)
Because the local server exposes REST only, an MCP client cannot talk to it directly.
The bridge (`scripts/supermemory-mcp`) is a zero-dependency Python **stdio MCP server**
that proxies MCP tool calls to the local REST API. No `pip install` needed (stdlib only).

Tools exposed: `search_memory`, `add_memory`, `list_documents`, `get_document`, `list_memories`, `whoami`.

## Setup — full flow
1. **Start the server** (needs an LLM key in env):
   ```bash
   export GEMINI_API_KEY=...   # free: https://aistudio.google.com/app/apikey
   ~/.supermemory/bin/supermemory-server   # or use scripts/supermemory-local
   ```
   Verify: `ss -tlnp | grep 6767`. First boot downloads ~106MB model — allow time.
   `./bin/supermemory-server doctor` lists exactly what's missing.

2. **Wire into Hermes** (plugin already present at `plugins/memory/supermemory`):
   - `~/.hermes/supermemory.json`: `{"base_url":"http://localhost:6767","container_tag":"hermes","search_mode":"hybrid","api_timeout":60.0}`
   - Append `SUPERMEMORY_API_KEY=<contents of ~/.supermemory/api-key>` to `~/.hermes/.env`
   - `hermes config set memory.provider supermemory`
   - The `supermemory` Python SDK lazy-installs on first chat.

3. **Install the bridge** so all MCP clients can use it:
   ```bash
   cp scripts/supermemory-mcp ~/.local/bin/supermemory-mcp
   chmod +x ~/.local/bin/supermemory-mcp
   ```

4. **Register with each client** (all point at the same bridge binary → one shared store):

   | Client | Command / location |
   |--------|-------------------|
   | Claude Code | `claude mcp add supermemory --scope user -- ~/.local/bin/supermemory-mcp` |
   | OpenCode | `opencode mcp add supermemory -- ~/.local/bin/supermemory-mcp` |
   | Zed | add to `~/.config/zed/settings.json`: `"context_servers": {"supermemory": {"command": "~/.local/bin/supermemory-mcp", "args": []}}` (JSONC — preserve `//` comments) |
   | Cline | `~/.vscode/settings.json`: `"cline.mcpServers": {"supermemory": {"command":"~/.local/bin/supermemory-mcp","args":[],"env":{}}}` |
   | Kilo Code | same file: `"kilo-code.mcpServers": {...}` (also try `kilocode.mcpServers`) |

5. **Auto-start on boot** (systemd user, needs `Linger=yes` which most setups have):
   - Copy `templates/supermemory.service` to `~/.config/systemd/user/`, replace `__REPLACE_WITH_YOUR_LLM_KEY__` with a real key.
   - `systemctl --user daemon-reload && systemctl --user enable --now supermemory.service`

## Verify (do this before declaring done)
Bridge protocol test — must return 6 tools and a real search result:
```bash
printf '%s\n%s\n%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
 '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_memory","arguments":{"query":"test"}}}' \
 | ~/.local/bin/supermemory-mcp
```
Hermes: `hermes memory status` should show `Provider: supermemory` and `← active`.
Then `hermes chat -q "remember X"` then a new session asking about X — it should recall it.

## Multi-project memory + auto-sync (recommended for coders)
Give each project its OWN `container_tag` so memories never mix. Then wire commit history
into memory automatically via a `post-commit` hook, and keep `CLAUDE.md`/`AGENTS.md` in sync via a daily timer.

### Project -> container mapping (edit to match your repos)
In `scripts/supermemory-sync`, the `PROJECTS` map keys are container_tags:
```bash
declare -A PROJECTS=(
  [dafgpt]="/path/to/DafGpt"
  [hejle]="/path/to/hejle"
  [limbik]="/path/to/Limbik"
)
```
The hook lowercases the repo dir name to derive the tag (DafGpt->dafgpt, etc.),
so keep dir names aligned with container names.

### Install the sync tool
```bash
cp scripts/supermemory-sync ~/.local/bin/supermemory-sync
chmod +x ~/.local/bin/supermemory-sync
```

### Per-project post-commit hook (auto-feeds every commit into memory)
Create `<repo>/.git/hooks/post-commit`:
```bash
#!/usr/bin/env bash
set -e
root="$(git rev-parse --show-toplevel)"
project="$(basename "$root" | tr 'A-Z' 'a-z')"
msg="$(git log -1 --pretty=%B)"
files="$(git diff-tree --no-commit-id --name-only -r HEAD | tr '\n' ' ')"
LOG="$HOME/.supermemory/sync.log"
{
  echo "$(date -Is) [$project] commit: $msg"
  /home/themorida/.local/bin/supermemory-sync remember-commit "$project" "$msg" $files
} >> "$LOG" 2>&1 || true
```
chmod +x it. Now every `git commit` in that repo writes a memory into its container — no manual step.

For a repo WITHOUT git (e.g. hejle originally), `git init`, commit, then install the same hook.

### Daily rule sync (catches manual CLAUDE.md edits)
`scripts/supermemory-sync sync-rules` re-ingests `CLAUDE.md`/`AGENTS.md` only when their
sha256 changes (state stored in `~/.supermemory/sync-state.json`). Run it from a systemd timer:
- `templates/supermemory-sync.service` (Type=oneshot -> `supermemory-sync sync-rules`)
- `templates/supermemory-sync.timer` (`OnCalendar=*-*-* 09:00:00`)
- `systemctl --user enable --now supermemory-sync.timer`

### Mark the container in the project's own docs
Append to each project's `CLAUDE.md`/`AGENTS.md` so agents know which container to scope to:
```
> **Supermemory container:** `dafgpt` — scope supermemory calls to this container.
```

### Manual helpers
- `supermemory-sync remember-bug <project> <note>` — store a bug/fix for later recall.
- `supermemory-sync remember-commit <project> <msg> [files...]` — ad-hoc commit memory.

## Common mistakes
- **Server won't start** → missing LLM key. Set `GEMINI_API_KEY` (free) and retry; run `doctor`.
- **Tools list empty / 404 on /v4/*** → you hit a v4 endpoint; local server is v3-only. Use `/v3/*`.
- **Zed config breaks** → Zed uses JSONC; editing via raw write_file strips `//` comments. Patch the file in place or use a Python edit that preserves comments.
- **Cline/Kilo show "not connected"** → the VS Code extension isn't installed on this machine. The settings.json stub is ready; it activates once the extension is added.
- **Memory store seems empty after moving dirs** → you launched from a different CWD and created a second store. Always set `SUPERMEMORY_DATA_DIR=~/.supermemory`.
- **MCP client can't find the key** → bridge reads `~/.supermemory/api-key` automatically; don't hardcode the key in client config.
