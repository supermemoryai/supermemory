"use client"

import { useState } from "react"

export function DocsAssistant() {
	const [question, setQuestion] = useState("")
	const [pending, setPending] = useState(false)
	const [error, setError] = useState("")
	const [answer, setAnswer] = useState("")
	const [sources, setSources] = useState<{ title: string; url: string }[]>([])

	return (
		<div className="sm-docs-assistant">
			<form
				onSubmit={async (event) => {
					event.preventDefault()
					if (pending || !question.trim()) return
					setPending(true)
					setError("")
					setAnswer("")
					setSources([])
					try {
						const response = await fetch(
							`${import.meta.env.BASE_URL}api/chat`,
							{
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ question }),
							},
						)
						const data = (await response.json()) as {
							answer: string
							sources: { title: string; url: string }[]
							error?: string
						}
						if (!response.ok)
							throw new Error(data.error ?? "Could not answer this question")
						setAnswer(data.answer)
						setSources(data.sources)
					} catch (failure) {
						setError(
							failure instanceof Error
								? failure.message
								: "Could not answer this question",
						)
					} finally {
						setPending(false)
					}
				}}
			>
				<label htmlFor="docs-question">What would you like to know?</label>
				<textarea
					id="docs-question"
					value={question}
					onChange={(event) => setQuestion(event.target.value)}
					placeholder="How do I add memory to my agent?"
					maxLength={2_000}
					required
					rows={3}
				/>
				<button
					className="sm-home-btn sm-home-btn-primary"
					type="submit"
					disabled={pending || !question.trim()}
				>
					{pending ? "Searching the docs…" : "Ask Supermemory"}
				</button>
			</form>
			<div aria-live="polite">
				{error && <p role="alert">{error}</p>}
				{answer && <div className="sm-docs-answer">{answer}</div>}
				{sources.length > 0 && (
					<ol>
						{sources.map((source, index) => (
							<li key={`${source.url}-${index}`}>
								<a href={source.url}>{source.title}</a>
							</li>
						))}
					</ol>
				)}
			</div>
		</div>
	)
}
