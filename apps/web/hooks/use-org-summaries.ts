"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useAuth } from "@lib/auth-context"
import { normalizePlanType, type PlanType } from "@/hooks/use-token-usage"

const API_BASE =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

export type OrgSummary = {
	orgId: string
	plan: PlanType
	activeConnectors: number
	containerTagCount: number
	documentCount: number
}

export function useOrgSummaries() {
	const { user } = useAuth()
	const [enabled, setEnabled] = useState(false)

	useEffect(() => {
		if (!user?.id) {
			setEnabled(false)
			return
		}

		setEnabled(false)
		const timeout = window.setTimeout(() => setEnabled(true), 1200)
		return () => window.clearTimeout(timeout)
	}, [user?.id])

	return useQuery({
		queryKey: ["account", "org-summaries"],
		queryFn: async (): Promise<OrgSummary[]> => {
			const res = await fetch(`${API_BASE}/v3/auth/org-summaries`, {
				credentials: "include",
				headers: { "X-App-Source": "nova" },
			})
			if (!res.ok) {
				throw new Error("Failed to load organization plans")
			}
			const data = (await res.json()) as { summaries: OrgSummary[] }
			return (data.summaries ?? []).map((s) => ({
				...s,
				plan: normalizePlanType(s.plan),
			}))
		},
		enabled,
		staleTime: 60 * 1000,
	})
}
