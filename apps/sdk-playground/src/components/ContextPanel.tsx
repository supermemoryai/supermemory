"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ContainerContext } from "@/lib/context-api"

type ContextDocument = ContainerContext["documents"][number]

export function ContextPanel({
	containerTag,
	lastUserMessage,
	refreshKey,
	supermemoryApiKey,
	supermemoryKeyReady,
}: {
	containerTag: string
	lastUserMessage?: string
	refreshKey: number
	supermemoryApiKey: string
	supermemoryKeyReady: boolean
}) {
	const [context, setContext] = useState<ContainerContext | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [useQuery, setUseQuery] = useState(false)
	const [selectedDocKey, setSelectedDocKey] = useState<string | null>(null)
	const activeRequest = useRef<AbortController | null>(null)

	const load = useCallback(async () => {
		if (!supermemoryKeyReady) {
			setError("Enter a Supermemory API key or set SUPERMEMORY_API_KEY")
			setContext(null)
			return
		}
		const normalizedContainerTag = containerTag.trim()
		if (!normalizedContainerTag) {
			setError("Enter a container tag to load context")
			setContext(null)
			return
		}

		activeRequest.current?.abort()
		const controller = new AbortController()
		activeRequest.current = controller
		setLoading(true)
		setError(null)
		try {
			const res = await fetch("/api/context", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal: controller.signal,
				body: JSON.stringify({
					containerTag: normalizedContainerTag,
					...(useQuery && lastUserMessage ? { query: lastUserMessage } : {}),
					...(supermemoryApiKey.trim()
						? {
								apiKeys: {
									supermemoryApiKey: supermemoryApiKey.trim(),
								},
							}
						: {}),
				}),
			})
			const data = await res.json()
			if (!data.ok) throw new Error(data.error ?? "Failed to load context")
			if (controller.signal.aborted) return
			setContext(data.context)
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") return
			setError(err instanceof Error ? err.message : String(err))
			setContext(null)
		} finally {
			if (activeRequest.current === controller) {
				activeRequest.current = null
				setLoading(false)
			}
		}
	}, [
		containerTag,
		lastUserMessage,
		useQuery,
		supermemoryApiKey,
		supermemoryKeyReady,
	])

	useEffect(() => {
		// The counter changes after a successful chat and explicitly refreshes context.
		void refreshKey
		if (!supermemoryKeyReady || !containerTag.trim()) {
			activeRequest.current?.abort()
			activeRequest.current = null
			setLoading(false)
			setContext(null)
			setError(null)
			return
		}

		const timeout = window.setTimeout(() => {
			void load()
		}, 500)

		return () => {
			window.clearTimeout(timeout)
			activeRequest.current?.abort()
		}
	}, [load, refreshKey, supermemoryKeyReady, containerTag])

	useEffect(() => {
		// A different container must not retain the previous document selection.
		void containerTag
		setSelectedDocKey(null)
	}, [containerTag])

	const selectedDoc =
		context?.documents.find((doc) => documentKey(doc) === selectedDocKey) ??
		null

	return (
		<div className="flex min-h-0 flex-col gap-3 text-sm">
			<div className="flex items-center justify-between gap-2">
				<h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
					Container context
				</h2>
				<button
					type="button"
					onClick={() => void load()}
					disabled={!supermemoryKeyReady || !containerTag.trim()}
					className="text-xs text-zinc-400 hover:text-zinc-200 disabled:cursor-not-allowed disabled:text-zinc-700"
				>
					Refresh
				</button>
			</div>

			<label className="flex items-center gap-2 text-xs text-zinc-400">
				<input
					type="checkbox"
					checked={useQuery}
					onChange={(e) => setUseQuery(e.target.checked)}
				/>
				Profile with last message as query
			</label>

			{loading && <p className="text-xs text-zinc-500">Loading…</p>}
			{!supermemoryKeyReady && (
				<p className="text-xs text-zinc-500">
					Enter a Supermemory key or set SUPERMEMORY_API_KEY to load context.
				</p>
			)}
			{error && <p className="text-xs text-red-400">{error}</p>}

			{context && (
				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
					<section>
						<h3 className="mb-2 text-xs font-medium text-zinc-400">
							Profile · {context.profile.static.length} static ·{" "}
							{context.profile.dynamic.length} dynamic ·{" "}
							{context.profile.searchResults.length} search
						</h3>
						<div className="space-y-2">
							<MemoryList title="Static" items={context.profile.static} />
							<MemoryList title="Dynamic" items={context.profile.dynamic} />
							{context.profile.searchResults.length > 0 && (
								<MemoryList
									title="Search results"
									items={context.profile.searchResults}
								/>
							)}
						</div>
					</section>

					<section className="min-h-0">
						<h3 className="mb-2 text-xs font-medium text-zinc-400">
							Documents / sessions ({context.documents.length})
						</h3>
						{context.documents.length === 0 ? (
							<p className="text-xs text-zinc-500">No documents yet</p>
						) : (
							<div className="flex min-h-0 gap-2">
								<ul className="min-w-0 flex-1 space-y-2">
									{context.documents.map((doc) => {
										const key = documentKey(doc)
										const isSelected = key === selectedDocKey
										const memoryCount = doc.memoryEntries?.length ?? 0
										return (
											<li key={key}>
												<button
													type="button"
													onClick={() =>
														setSelectedDocKey(isSelected ? null : key)
													}
													className={`w-full rounded border p-2 text-left text-xs transition-colors ${
														isSelected
															? "border-emerald-700/60 bg-emerald-950/30"
															: "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
													}`}
												>
													<div className="flex items-start justify-between gap-2">
														<div className="min-w-0 font-mono text-zinc-300 truncate">
															{doc.id ?? "—"}
														</div>
														<span
															className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
																memoryCount > 0
																	? "bg-emerald-900/50 text-emerald-300"
																	: "bg-zinc-800 text-zinc-500"
															}`}
														>
															{memoryCount}
														</span>
													</div>
													<div className="text-zinc-500 truncate">
														{doc.title ?? "untitled"}
													</div>
													<div className="text-zinc-600">
														{doc.customId
															? `session: ${doc.customId}`
															: "no customId"}
														{doc.status ? ` · ${doc.status}` : ""}
													</div>
												</button>
											</li>
										)
									})}
								</ul>

								{selectedDoc && (
									<div className="min-w-0 flex-1 border-l border-zinc-800 pl-2">
										<DocumentMemoriesPanel doc={selectedDoc} />
									</div>
								)}
							</div>
						)}
						{context.documents.length > 0 && !selectedDoc && (
							<p className="mt-2 text-[10px] text-zinc-600">
								Click a document to view its memories
							</p>
						)}
					</section>
				</div>
			)}
		</div>
	)
}

function DocumentMemoriesPanel({ doc }: { doc: ContextDocument }) {
	const entries = doc.memoryEntries ?? []

	return (
		<div className="space-y-2">
			<div className="text-[10px] uppercase tracking-wide text-zinc-600">
				Document memories ({entries.length})
			</div>
			<div className="text-xs text-zinc-500 truncate">
				{doc.title ?? "untitled"}
			</div>
			{doc.summary && (
				<p className="text-[11px] leading-snug text-zinc-500 line-clamp-3">
					{doc.summary}
				</p>
			)}
			{entries.length === 0 ? (
				<p className="text-xs text-zinc-600">No memories on this document</p>
			) : (
				<ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
					{entries.map((entry, i) => (
						<li
							key={memoryEntryKey(entry, i)}
							className="rounded border border-zinc-800 bg-zinc-900/60 p-2"
						>
							<MemoryEntryCard entry={entry} />
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

function MemoryEntryCard({ entry }: { entry: unknown }) {
	const record =
		entry && typeof entry === "object"
			? (entry as Record<string, unknown>)
			: null

	const memoryText = formatMemoryItem(entry)
	const id = record?.id as string | undefined
	const version = record?.version as number | undefined
	const isForgotten = Boolean(record?.isForgotten)
	const isStatic = Boolean(record?.isStatic)
	const forgetAfter = record?.forgetAfter as string | undefined

	return (
		<div className="space-y-1">
			{memoryText && (
				<p className="text-xs leading-snug text-zinc-300">{memoryText}</p>
			)}
			<div className="flex flex-wrap gap-1 text-[10px] text-zinc-600">
				{id && <span className="font-mono truncate max-w-full">{id}</span>}
				{version != null && <span>v{version}</span>}
				{isStatic && <span className="text-sky-500">static</span>}
				{isForgotten && <span className="text-amber-500">forgotten</span>}
				{forgetAfter && !isForgotten && (
					<span className="text-orange-500">expires</span>
				)}
			</div>
		</div>
	)
}

function documentKey(doc: ContextDocument): string {
	return doc.id ?? doc.customId ?? doc.title ?? "unknown"
}

function memoryEntryKey(entry: unknown, index: number): string {
	if (entry && typeof entry === "object" && "id" in entry) {
		return String((entry as { id: unknown }).id)
	}
	return `memory-${index}`
}

function MemoryList({ title, items }: { title: string; items: unknown[] }) {
	if (!items.length) return null
	return (
		<div>
			<div className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1">
				{title}
			</div>
			<ul className="space-y-1">
				{items.slice(0, 12).map((item, i) => (
					<li
						key={i}
						className="rounded bg-zinc-900/60 px-2 py-1 text-xs text-zinc-300 leading-snug"
					>
						{formatMemoryItem(item)}
					</li>
				))}
			</ul>
		</div>
	)
}

function formatMemoryItem(item: unknown): string {
	if (typeof item === "string") return item
	if (item && typeof item === "object") {
		const record = item as Record<string, unknown>
		if (typeof record.memory === "string") return record.memory
		if (typeof record.content === "string") return record.content
		if (typeof record.chunk === "string") return record.chunk
	}
	return JSON.stringify(item)
}
