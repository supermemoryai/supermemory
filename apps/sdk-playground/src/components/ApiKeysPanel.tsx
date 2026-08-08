"use client"

import { useEffect, useState } from "react"
import {
	API_KEYS_STORAGE_KEY,
	readStoredApiKeys,
	storeApiKeys,
} from "@/lib/api-keys"

export function ApiKeysPanel({
	supermemoryApiKey,
	openaiApiKey,
	onSupermemoryChange,
	onOpenAiChange,
}: {
	supermemoryApiKey: string
	openaiApiKey: string
	onSupermemoryChange: (value: string) => void
	onOpenAiChange: (value: string) => void
}) {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!supermemoryApiKey && !openaiApiKey) {
			const stored = readStoredApiKeys()
			if (stored.supermemoryApiKey) onSupermemoryChange(stored.supermemoryApiKey)
			if (stored.openaiApiKey) onOpenAiChange(stored.openaiApiKey)
		}
	}, [supermemoryApiKey, openaiApiKey, onSupermemoryChange, onOpenAiChange])

	useEffect(() => {
		storeApiKeys({ supermemoryApiKey, openaiApiKey })
	}, [supermemoryApiKey, openaiApiKey])

	const ready = supermemoryApiKey.trim().length > 0 && openaiApiKey.trim().length > 0

	return (
		<div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
			>
				<span className="font-medium text-zinc-200">API keys</span>
				<span className="flex items-center gap-2 text-xs">
					<span
						className={
							ready ? "text-emerald-400" : "text-amber-400"
						}
					>
						{ready ? "configured" : "required for chat"}
					</span>
					<span className="text-zinc-600">{open ? "−" : "+"}</span>
				</span>
			</button>
			{open && (
				<div className="space-y-3 border-t border-zinc-800 px-3 pb-3 pt-2">
					<p className="text-[11px] leading-snug text-zinc-500">
						Keys are stored in your browser (localStorage) for quick
						testing. Env vars still work as fallback on the server.
					</p>
					<label className="block space-y-1">
						<span className="text-xs text-zinc-500">
							Supermemory API key
						</span>
						<input
							type="password"
							value={supermemoryApiKey}
							onChange={(e) => onSupermemoryChange(e.target.value)}
							placeholder="sm_…"
							className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-mono"
						/>
					</label>
					<label className="block space-y-1">
						<span className="text-xs text-zinc-500">OpenAI API key</span>
						<input
							type="password"
							value={openaiApiKey}
							onChange={(e) => onOpenAiChange(e.target.value)}
							placeholder="sk-…"
							className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-mono"
						/>
					</label>
					<button
						type="button"
						onClick={() => {
							onSupermemoryChange("")
							onOpenAiChange("")
							localStorage.removeItem(API_KEYS_STORAGE_KEY)
						}}
						className="text-xs text-zinc-500 hover:text-zinc-300"
					>
						Clear stored keys
					</button>
				</div>
			)}
		</div>
	)
}
