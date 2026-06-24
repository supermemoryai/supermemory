# supermemory

supermemory desktop app — a [Tauri v2](https://v2.tauri.app) shell around the
Supermemory web UI (Next.js static export), talking to `api.supermemory.ai`.

Design docs live in `/.context/desktop-app-*.md` (spec, roadmap, architecture).

## Develop

```sh
# from this directory — launches the native window and spawns `next dev` on :3003
bun run tauri dev
```

`bun run dev` on its own just starts the Next dev server on :3003 (no native window).

In development, the desktop UI and Rust auth commands default to the local API at
`http://localhost:8787`. Set `NEXT_PUBLIC_BACKEND_URL` / `SUPERMEMORY_API_URL`
if you need a different API.

## Manual onboarding verification

Run the API locally on `localhost:8787`, then start the desktop app:

```sh
bun run tauri dev
```

Use this path before shipping auth or onboarding changes:

1. Clear `localStorage["supermemory-desktop-onboarding-v1"]` if you need a
   fresh first-run state.
2. Sign in with Google or email from the desktop login page.
3. Confirm the browser callback returns to the desktop app and the first
   authenticated route is `/onboarding`, not the web console.
4. In the tools step, rescan and confirm Claude Code, Codex, and Cursor show
   detected paths when installed or configured.
5. Preview each tool connection and verify the diff targets the expected config:
   `~/.claude.json`, `$CODEX_HOME/config.toml` or `~/.codex/config.toml`, and
   `~/.cursor/mcp.json`.
6. Apply one connection and confirm the app writes the MCP server, creates a
   `.smbak` backup when the config already existed, and reports the tool as
   connected after refresh.
7. Mount or skip the filesystem step, finish onboarding, relaunch the app, and
   confirm completed or skipped onboarding does not appear again.

SMFS integration uses the first available binary in this order:

1. `SUPERMEMORY_DESKTOP_SMFS_BIN`
2. bundled sidecar in `src-tauri/binaries`
3. `smfs` on `PATH`

The desktop-managed filesystem space uses container tags with the fixed
`sm_fs_` prefix. The default development tag is `sm_fs_desktop`.

## Build

```sh
bun run build        # Next static export -> ./out   (no Rust needed)
bun run build:native # copy local smfs sidecar, then build native .app / .dmg
```

## Prerequisites for the native build

- Rust toolchain (`rustup`) + Xcode Command Line Tools.
- SMFS installed locally (`curl -fsSL https://smfs.ai/install | bash`) for
  `bun run build:native`, or a pinned sidecar copied into `src-tauri/binaries`
  by CI.
- App icons in `src-tauri/icons/` — generate once with
  `bun run tauri icon <path-to-1024px.png>`.
