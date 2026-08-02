"use client"

import { useAuth } from "@lib/auth-context"
import { useCustomer } from "autumn-js/react"
import { useEffect, useMemo, useState } from "react"
import { useTokenUsage } from "@/hooks/use-token-usage"
import { getBrainTrialInfo } from "@/lib/billing-utils"

export type BrainTrialState = {
	state: "trialing" | "ended" | "none"
	endsAtMs: number | null
	startedAtMs: number | null
	daysRemaining: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const NONE: BrainTrialState = {
	state: "none",
	endsAtMs: null,
	startedAtMs: null,
	daysRemaining: null,
}

// Mirrors settings billing: open metadata trial OR Autumn trialing counts as trialing.
export function useBrainTrial(): BrainTrialState {
	const { org } = useAuth()
	const autumn = useCustomer()
	const { isTrialing, trialEndsAtMs, hasPaidPlan, isLoading } =
		useTokenUsage(autumn)
	const [tick, setTick] = useState(0)

	useEffect(() => {
		const t = window.setInterval(() => setTick((v) => v + 1), 60_000)
		return () => window.clearInterval(t)
	}, [])

	// biome-ignore lint/correctness/useExhaustiveDependencies: tick keeps daysRemaining current across midnight
	return useMemo(() => {
		const meta = getBrainTrialInfo(
			org?.metadata as Record<string, unknown> | string | null | undefined,
		)
		const now = Date.now()

		const metaOpen =
			meta.status === "active" && (meta.endsAtMs == null || meta.endsAtMs > now)
		const autumnOpen =
			isTrialing && (trialEndsAtMs == null || trialEndsAtMs > now)

		if (metaOpen || autumnOpen) {
			const endsAtMs = meta.endsAtMs ?? trialEndsAtMs
			return {
				state: "trialing" as const,
				endsAtMs,
				startedAtMs:
					meta.startedAtMs ??
					(endsAtMs != null ? endsAtMs - 14 * DAY_MS : null),
				daysRemaining:
					endsAtMs != null
						? Math.max(0, Math.ceil((endsAtMs - now) / DAY_MS))
						: null,
			}
		}

		const metaEnded =
			meta.status === "expired" ||
			meta.status === "exhausted" ||
			(meta.status === "active" &&
				meta.endsAtMs != null &&
				meta.endsAtMs <= now)
		const autumnEnded =
			isTrialing && trialEndsAtMs != null && trialEndsAtMs <= now
		// Wait for Autumn so a paid/converted org never flashes trial chrome.
		if ((metaEnded || autumnEnded) && !isLoading && !hasPaidPlan) {
			return {
				state: "ended" as const,
				endsAtMs: meta.endsAtMs ?? trialEndsAtMs,
				startedAtMs: meta.startedAtMs,
				daysRemaining: 0,
			}
		}
		return NONE
	}, [org?.metadata, isTrialing, trialEndsAtMs, hasPaidPlan, isLoading, tick])
}
