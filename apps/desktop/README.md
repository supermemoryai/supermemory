# @repo/desktop

Supermemory desktop app — a [Tauri v2](https://v2.tauri.app) shell around the
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

## Build

```sh
bun run build        # Next static export -> ./out   (no Rust needed)
bun run tauri build  # native .app / .dmg            (requires the Rust toolchain)
```

## Prerequisites for the native build

- Rust toolchain (`rustup`) + Xcode Command Line Tools.
- App icons in `src-tauri/icons/` — generate once with
  `bun run tauri icon <path-to-1024px.png>`.
