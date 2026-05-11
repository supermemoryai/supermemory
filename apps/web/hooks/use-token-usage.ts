import { getSubscriptionStatus, isAllowedFrom } from "@lib/queries"
import type { useCustomer } from "autumn-js/react"
import { calculateUsagePercent, getDaysRemaining } from "@/lib/billing-utils"

export type PlanType = "free" | "pro" | "scale" | "enterprise"

const TOKEN_METER_IDS = [
	"sm_tokens_text",
	"sm_tokens_rich",
	"sm_superrag_text",
	"sm_superrag_rich",
] as const

export function useTokenUsage(autumn: ReturnType<typeof useCustomer>) {
	const status = getSubscriptionStatus(autumn.data?.subscriptions)

	let currentPlan: PlanType = "free"
	if (isAllowedFrom(status, "api_enterprise")) {
		currentPlan = "enterprise"
	} else if (isAllowedFrom(status, "api_scale")) {
		currentPlan = "scale"
	} else if (isAllowedFrom(status, "api_pro")) {
		currentPlan = "pro"
	}

	const hasPaidPlan = currentPlan !== "free"

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
		isLoading,
		daysRemaining,
	}
}
