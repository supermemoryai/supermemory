"use client"

import { useState } from "react"

export const AgentMarks = () => (
	<p className="sm-works">
		<span className="sm-works-label">Or add memory to</span>
		<a
			className="sm-works-item"
			href={`${import.meta.env.BASE_URL}integrations/claude-code`}
		>
			<svg aria-hidden="true" viewBox="0 0 256 257" fill="currentColor">
				<path d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z" />
			</svg>
			Claude Code
		</a>
		<a
			className="sm-works-item"
			href={`${import.meta.env.BASE_URL}integrations/cursor`}
		>
			<svg aria-hidden="true" viewBox="0 0 466.73 532.09" fill="currentColor">
				<path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
			</svg>
			Cursor
		</a>
		<a
			className="sm-works-item"
			href={`${import.meta.env.BASE_URL}integrations/codex`}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				fill="currentColor"
				fillRule="evenodd"
			>
				<path
					clipRule="evenodd"
					d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"
				/>
			</svg>
			Codex
		</a>
		<a
			className="sm-works-item"
			href={`${import.meta.env.BASE_URL}integrations/opencode`}
		>
			<svg aria-hidden="true" viewBox="0 0 32 40" fill="none">
				<path d="M24 32H8V16H24V32Z" fill="currentColor" fillOpacity="0.3" />
				<path d="M24 8H8V32H24V8ZM32 40H0V0H32V40Z" fill="currentColor" />
			</svg>
			OpenCode
		</a>
	</p>
)

export const CopyPromptButton = ({ prompt, className, label, copiedLabel }) => {
	const [copied, setCopied] = useState(false)
	const onCopy = async () => {
		try {
			await navigator.clipboard.writeText(prompt)
			setCopied(true)
			setTimeout(() => setCopied(false), 1600)
		} catch {}
	}
	return (
		<button
			type="button"
			className={className}
			onClick={onCopy}
			aria-label={label ? undefined : "Copy prompt"}
		>
			{copied ? (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M20 6 9 17l-5-5" />
				</svg>
			) : (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<rect x="9" y="9" width="12" height="12" rx="2" />
					<path d="M5 15V5a2 2 0 0 1 2-2h10" />
				</svg>
			)}
			{label ? <span>{copied ? (copiedLabel ?? "Copied") : label}</span> : null}
		</button>
	)
}

export const PromptPanel = ({ tabs }) => {
	const [active, setActive] = useState(0)
	const [copied, setCopied] = useState(false)
	const tab = tabs[active]

	const onCopy = async () => {
		try {
			await navigator.clipboard.writeText(tab.text)
			setCopied(true)
			setTimeout(() => setCopied(false), 1600)
		} catch {}
	}

	const promptLine = (line) => {
		const h = /^(#{1,6}) (.*)$/.exec(line)
		if (h) {
			return (
				<>
					<span className="sm-prompt-muted">{h[1]} </span>
					<span className="sm-prompt-heading">{h[2]}</span>
				</>
			)
		}
		if (/^\|[-| ]+\|$/.test(line))
			return <span className="sm-prompt-muted">{line}</span>
		const out = []
		let last = 0
		let k = 0
		for (const m of line.matchAll(
			/(\|)|(\b(?:GET|POST|PATCH|DELETE) \/[^\s|]+)/g,
		)) {
			const at = m.index ?? 0
			if (at > last) out.push(line.slice(last, at))
			out.push(
				m[1] ? (
					<span className="sm-prompt-muted" key={`p${k++}`}>
						|
					</span>
				) : (
					<span className="sm-prompt-endpoint" key={`e${k++}`}>
						{m[2]}
					</span>
				),
			)
			last = at + m[0].length
		}
		if (last < line.length) out.push(line.slice(last))
		return out
	}

	const codeLine = (line) => {
		if (/^\s*(\/\/|#)/.test(line))
			return <span className="sm-prompt-muted">{line}</span>
		const out = []
		let last = 0
		let k = 0
		for (const m of line.matchAll(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g)) {
			const at = m.index ?? 0
			if (at > last) out.push(line.slice(last, at))
			out.push(
				<span className="sm-prompt-string" key={`s${k++}`}>
					{m[0]}
				</span>,
			)
			last = at + m[0].length
		}
		if (last < line.length) out.push(line.slice(last))
		return out
	}

	const render = tab.kind === "prompt" ? promptLine : codeLine

	return (
		<div className="sm-prompt-panel">
			<div className="sm-prompt-header">
				<div className="sm-prompt-tabs" role="tablist">
					{tabs.map((t, i) => (
						<button
							key={t.label}
							type="button"
							role="tab"
							aria-selected={i === active}
							className="sm-prompt-tab"
							onClick={() => {
								setActive(i)
								setCopied(false)
							}}
						>
							{t.label}
						</button>
					))}
				</div>
				<button
					type="button"
					className="sm-prompt-copy-icon"
					onClick={onCopy}
					aria-label={copied ? "Copied" : `Copy ${tab.label}`}
				>
					{copied ? (
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
					) : (
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<rect x="9" y="9" width="12" height="12" rx="2" />
							<path d="M5 15V5a2 2 0 0 1 2-2h10" />
						</svg>
					)}
				</button>
			</div>
			<div className="sm-prompt-body" role="tabpanel" aria-label={tab.label}>
				<pre
					className={`sm-prompt-scroll${tab.kind === "code" ? " sm-prompt-code" : ""}`}
				>
					{tab.text.split("\n").map((text, i) => (
						<span className="sm-prompt-line" key={`${active}:${i}`}>
							{text.length === 0 ? " " : render(text)}
						</span>
					))}
				</pre>
				<span className="sm-prompt-fade" aria-hidden="true" />
			</div>
		</div>
	)
}
