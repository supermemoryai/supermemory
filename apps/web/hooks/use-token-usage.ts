import { getSubscriptionStatus, isAllowedFrom } from "@lib/queries"
import type { useCustomer } from "autumn-js/react"
import { calculateUsagePercent, getDaysRemaining } from "@/lib/billing-utils"

export type PlanType = "free" | "pro" | "max" | "scale" | "enterprise"

export const PLAN_DISPLAY_NAMES: Record<PlanType, string> = {
	free: "Free",
	pro: "Pro",
	max: "Max",
	scale: "Scale",
	enterprise: "Enterprise",
}

/** Higher rank sorts first in org lists (enterprise at top). */
export const PLAN_RANK: Record<PlanType, number> = {
	free: 0,
	pro: 1,
	max: 2,
	scale: 3,
	enterprise: 4,
}

export function normalizePlanType(raw: unknown): PlanType {
	if (typeof raw !== "string" || !raw.trim()) return "free"
	const normalized = raw.toLowerCase().replace(/^api_/, "")
	if (normalized === "enterprise") return "enterprise"
	if (normalized === "scale") return "scale"
	if (normalized === "max") return "max"
	if (normalized === "pro") return "pro"
	return "free"
}

const TOKEN_METER_IDS = [
	"sm_tokens_text",
	"sm_tokens_rich",
	"sm_superrag_text",
	"sm_superrag_rich",
] as const

export function useTokenUsage(autumn: ReturnType<typeof useCustomer>) {
	const subscriptions = autumn.data?.subscriptions
	const status = getSubscriptionStatus(subscriptions)

	let currentPlan: PlanType = "free"
	if (isAllowedFrom(status, "api_enterprise")) {
		currentPlan = "enterprise"
	} else if (isAllowedFrom(status, "api_scale")) {
		currentPlan = "scale"
	} else if (isAllowedFrom(status, "api_max")) {
		currentPlan = "max"
	} else if (isAllowedFrom(status, "api_pro")) {
		currentPlan = "pro"
	}

	const hasPaidPlan = currentPlan !== "free"

	const planProductId =
		currentPlan === "free" ? null : (`api_${currentPlan}` as const)
	const currentSub = planProductId
		? subscriptions?.find((s) => s.planId === planProductId)
		: undefined
	const isTrialing = currentSub?.status === "trialing"
	const trialEndsAtMs = (() => {
		if (!currentSub) return null
		const sub = currentSub as {
			trialEndsAt?: number | null
			currentPeriodEnd?: number | null
			expiresAt?: number | null
		}
		const raw = sub.trialEndsAt ?? sub.currentPeriodEnd ?? sub.expiresAt
		if (raw == null) return null
		return raw < 10_000_000_000 ? raw * 1000 : raw
	})()

	const balances = autumn.data?.balances ?? {}

	const tokensUsed = TOKEN_METER_IDS.reduce((sum, id) => {
		const balance = balances[id]
		return sum + (balance?.usage ?? 0)
	}, 0)

	const searchesBalance = balances.sm_search_queries
	const searchesUsed = searchesBalance?.usage ?? 0

	const usdBalance = balances.usd_credits
	const usdIncluded = usdBalance?.granted ?? 0
	const usdSpent = usdBalance?.usage ?? 0

	const planUsagePct =
		usdIncluded > 0 ? calculateUsagePercent(usdSpent, usdIncluded) : 0

	const resetAt =
		usdBalance?.nextResetAt ??
		balances.sm_tokens_text?.nextResetAt ??
		searchesBalance?.nextResetAt ??
		undefined
	const daysRemaining = getDaysRemaining(resetAt)

	const isLoading = autumn.isLoading

	return {
		tokensUsed,
		searchesUsed,
		usdIncluded,
		usdSpent,
		planUsagePct,
		currentPlan,
		hasPaidPlan,
		isTrialing,
		trialEndsAtMs,
		isLoading,
		daysRemaining,
	}
}
