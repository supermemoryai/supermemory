"use client"

import { useEffect, useState } from "react"
import { consoleOrigin } from "../console-origin"

const SECONDS = 5

export default function MovedPage() {
	const [target, setTarget] = useState("https://console.supermemory.ai")
	const [oldHost, setOldHost] = useState("app.supermemory.ai")

	useEffect(() => {
		setTarget(consoleOrigin(window.location.hostname, window.location.protocol))
		setOldHost(window.location.hostname)
	}, [])

	useEffect(() => {
		const id = setTimeout(() => window.location.replace(target), SECONDS * 1000)
		return () => clearTimeout(id)
	}, [target])

	const newHost = target.replace(/^https?:\/\//, "")

	return (
		<div className="page">
			<header className="brand">
				<img alt="Supermemory" src="/logo-fullmark.svg" />
			</header>

			<main className="notice">
				<div className="notice-inner">
					<h1 className="headline">We moved.</h1>

					<ul className="hosts">
						<li className="host-old">{oldHost}</li>
						<li className="host-new">{newHost}</li>
					</ul>

					<p className="body">
						Your memories, API keys and plugin connections are already there.
						Nothing to set up again.
					</p>

					<div className="action">
						<a className="button" href={target}>
							Open the console
						</a>
						<div
							className="progress"
							style={{ "--seconds": `${SECONDS}s` } as React.CSSProperties}
						/>
						<p aria-live="polite" className="status">
							Redirecting automatically
						</p>
					</div>
				</div>
			</main>
		</div>
	)
}
