"use client"

import { useEffect, useState } from "react"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

type SlackStatus = { connected: boolean; teamName: string | null }

function SlackMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 122.8 122.8" className={className} aria-hidden="true">
			<title>Slack</title>
			<path
				d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z"
				fill="#E01E5A"
			/>
			<path
				d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
				fill="#E01E5A"
			/>
			<path
				d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z"
				fill="#36C5F0"
			/>
			<path
				d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
				fill="#36C5F0"
			/>
			<path
				d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z"
				fill="#2EB67D"
			/>
			<path
				d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
				fill="#2EB67D"
			/>
			<path
				d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z"
				fill="#ECB22E"
			/>
			<path
				d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
				fill="#ECB22E"
			/>
		</svg>
	)
}

export function SlackConnectCard() {
	const isCompanyBrain = useHasCompanyBrain()
	const [status, setStatus] = useState<SlackStatus | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!isCompanyBrain) return
		let active = true
		;(async () => {
			try {
				const res = await fetch(`${BACKEND}/brain/slack/status`, {
					credentials: "include",
				})
				if (active && res.ok) setStatus((await res.json()) as SlackStatus)
			} finally {
				if (active) setLoading(false)
			}
		})()
		return () => {
			active = false
		}
	}, [isCompanyBrain])

	if (!isCompanyBrain || loading) return null

	const connected = status?.connected

	return (
		<div className="flex items-center justify-between gap-4 rounded-[14px] bg-[#191D24] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] sm:px-5">
			<div className="min-w-0">
				<p className="text-sm font-semibold text-fg-primary">
					Add Supermemory to your Slack
				</p>
				<p className="mt-0.5 truncate text-[12px] text-fg-muted">
					{connected
						? `Connected to ${status?.teamName ?? "your workspace"}.`
						: "Answer from your company brain and act on connected apps — right inside Slack."}
				</p>
			</div>
			{connected ? (
				<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-skeleton px-3 py-1.5 text-[12px] font-medium text-fg-muted ring-1 ring-surface-border">
					<span className="size-1.5 rounded-full bg-[#2EB67D]" />
					Connected
				</span>
			) : (
				<a
					href={`${BACKEND}/brain/slack/oauth/install`}
					className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1D1C1D] transition-transform hover:scale-[1.02]"
				>
					<SlackMark className="size-4" />
					Add to Slack
				</a>
			)}
		</div>
	)
}
