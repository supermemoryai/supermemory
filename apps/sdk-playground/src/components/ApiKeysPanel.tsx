"use client"

import { useEffect, useState } from "react"
import {
	clearStoredApiKeys,
	readStoredApiKeys,
	storeApiKeys,
} from "@/lib/api-keys"

export function ApiKeysPanel({
	supermemoryApiKey,
	openaiApiKey,
	hasSupermemoryEnvKey,
	hasOpenAiEnvKey,
	onSupermemoryChange,
	onOpenAiChange,
}: {
	supermemoryApiKey: string
	openaiApiKey: string
	hasSupermemoryEnvKey: boolean
	hasOpenAiEnvKey: boolean
	onSupermemoryChange: (value: string) => void
	onOpenAiChange: (value: string) => void
}) {
	const [open, setOpen] = useState(false)
	const [storageInitialized, setStorageInitialized] = useState(false)
	const [rememberKeys, setRememberKeys] = useState(false)

	useEffect(() => {
		const stored = readStoredApiKeys()
		const hasStoredKeys = Boolean(
			stored.supermemoryApiKey || stored.openaiApiKey,
		)
		if (stored.supermemoryApiKey) onSupermemoryChange(stored.supermemoryApiKey)
		if (stored.openaiApiKey) onOpenAiChange(stored.openaiApiKey)
		setRememberKeys(hasStoredKeys)
		setStorageInitialized(true)
	}, [onSupermemoryChange, onOpenAiChange])

	useEffect(() => {
		if (!storageInitialized) return
		if (rememberKeys) {
			storeApiKeys({ supermemoryApiKey, openaiApiKey })
		} else {
			clearStoredApiKeys()
		}
	}, [storageInitialized, rememberKeys, supermemoryApiKey, openaiApiKey])

	const supermemoryReady =
		supermemoryApiKey.trim().length > 0 || hasSupermemoryEnvKey
	const openAiReady = openaiApiKey.trim().length > 0 || hasOpenAiEnvKey
	const ready = supermemoryReady && openAiReady

	return (
		<div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
			>
				<span className="font-medium text-zinc-200">API keys</span>
				<span className="flex items-center gap-2 text-xs">
					<span className={ready ? "text-emerald-400" : "text-amber-400"}>
						{ready ? "configured" : "required for chat"}
					</span>
					<span className="text-zinc-600">{open ? "−" : "+"}</span>
				</span>
			</button>
			{open && (
				<div className="space-y-3 border-t border-zinc-800 px-3 pb-3 pt-2">
					<p className="rounded border border-amber-900/60 bg-amber-950/30 px-2 py-1.5 text-[11px] leading-snug text-amber-200/80">
						Use disposable development or test keys only—never production
						credentials. Keys stay in this page only unless you explicitly
						enable tab-scoped storage below. Server env vars remain available as
						fallbacks.
					</p>
					<label className="block space-y-1">
						<span className="flex items-center justify-between gap-2 text-xs text-zinc-500">
							<span>Supermemory API key</span>
							{hasSupermemoryEnvKey && !supermemoryApiKey.trim() && (
								<span className="text-emerald-500">using server env</span>
							)}
						</span>
						<input
							type="password"
							value={supermemoryApiKey}
							onChange={(e) => onSupermemoryChange(e.target.value)}
							placeholder={
								hasSupermemoryEnvKey ? "Optional browser override" : "sm_…"
							}
							className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-mono"
						/>
					</label>
					<label className="block space-y-1">
						<span className="flex items-center justify-between gap-2 text-xs text-zinc-500">
							<span>OpenAI API key</span>
							{hasOpenAiEnvKey && !openaiApiKey.trim() && (
								<span className="text-emerald-500">using server env</span>
							)}
						</span>
						<input
							type="password"
							value={openaiApiKey}
							onChange={(e) => onOpenAiChange(e.target.value)}
							placeholder={
								hasOpenAiEnvKey ? "Optional browser override" : "sk-…"
							}
							className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-mono"
						/>
					</label>
					<label className="flex items-start gap-2 text-[11px] leading-snug text-zinc-400">
						<input
							type="checkbox"
							checked={rememberKeys}
							onChange={(event) => setRememberKeys(event.target.checked)}
							className="mt-0.5"
						/>
						<span>
							Remember these keys for this tab using sessionStorage. They are
							cleared when the tab closes; only enable this on a trusted
							profile.
						</span>
					</label>
					<button
						type="button"
						onClick={() => {
							onSupermemoryChange("")
							onOpenAiChange("")
							setRememberKeys(false)
							clearStoredApiKeys()
						}}
						className="text-xs text-zinc-500 hover:text-zinc-300"
					>
						Clear entered keys
					</button>
				</div>
			)}
		</div>
	)
}
