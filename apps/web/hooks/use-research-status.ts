"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@lib/auth-context"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const POLL_INTERVAL_MS = 2_000
const MAX_POLLS = 150

export type ResearchStat = { label: string; value: string }

export type ResearchEvent = {
	aspect: string
	label: string
	status: "in_progress" | "complete" | "error" | string
	detail: string | null
	stats: ResearchStat[]
	highlights: string[]
	sources: string[]
	createdAt: number
}

export type ResearchState = {
	status: "queued" | "running" | "done" | null
	domain: string | null
	findings: number
	events: ResearchEvent[]
}

const EMPTY: ResearchState = {
	status: null,
	domain: null,
	findings: 0,
	events: [],
}

export function useResearchStatus(enabled = true) {
	const { org } = useAuth()
	const orgId = org?.id

	const { data } = useQuery<ResearchState>({
		queryKey: ["brain-research-status", orgId],
		queryFn: async () => {
			const res = await fetch(`${BACKEND}/brain/research/status`, {
				credentials: "include",
				headers: { "X-App-Source": "nova" },
			})
			if (!res.ok) return EMPTY
			return (await res.json()) as ResearchState
		},
		enabled: Boolean(enabled && orgId),
		refetchInterval: (query) => {
			const status = query.state.data?.status
			const polls = query.state.dataUpdateCount
			if (status === "done" || polls >= MAX_POLLS) return false
			return POLL_INTERVAL_MS
		},
		staleTime: 0,
	})

	return data ?? EMPTY
}
