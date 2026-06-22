"use client"

import { invoke } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"

type AppInfo = {
	name: string
	version: string
	platform: string
}

export default function Home() {
	const [info, setInfo] = useState<AppInfo | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		// Call into the Rust core over Tauri's IPC bridge. If this resolves, the
		// native layer is alive and wired to the webview — the Phase 0 goal.
		invoke<AppInfo>("app_info")
			.then(setInfo)
			.catch((err) => setError(String(err)))
	}, [])

	return (
		<main className="screen">
			<section className="card">
				<h1 className="title">Supermemory</h1>
				<p className="muted">Desktop · Phase 0</p>

				{info ? (
					<dl className="info">
						<div className="row">
							<dt>App</dt>
							<dd>{info.name}</dd>
						</div>
						<div className="row">
							<dt>Version</dt>
							<dd>{info.version}</dd>
						</div>
						<div className="row">
							<dt>Platform</dt>
							<dd>{info.platform}</dd>
						</div>
					</dl>
				) : error ? (
					<p className="error">Native bridge error: {error}</p>
				) : (
					<p className="muted">Connecting to the native core…</p>
				)}
			</section>
		</main>
	)
}
