import { fetchSubscriptionStatus } from "@lib/queries"
import type { useCustomer } from "autumn-js/react"
import { calculateUsagePercent, getDaysRemaining } from "@/lib/billing-utils"

export type PlanType = "free" | "pro" | "scale" | "enterprise"

export function useTokenUsage(autumn: ReturnType<typeof useCustomer>) {
	const {
		data: status = {
			api_pro: { allowed: false, status: null },
			api_scale: { allowed: false, status: null },
			api_enterprise: { allowed: false, status: null },
		},
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn, !autumn.isLoading)

	let currentPlan: PlanType = "free"
	if (status.api_enterprise?.status !== null) {
		currentPlan = "enterprise"
	} else if (status.api_scale?.status !== null) {
		currentPlan = "scale"
	} else if (status.api_pro?.status !== null) {
		currentPlan = "pro"
	}

	const hasPaidPlan = currentPlan !== "free"

	// Get token usage from autumn customer features
	const tokensFeature = autumn.customer?.features?.api_tokens
	const tokensUsed = tokensFeature?.usage ?? 0
	const tokensLimit = tokensFeature?.included_usage ?? 0
	const tokensResetAt = tokensFeature?.next_reset_at

	// Get search queries usage from autumn customer features
	const searchesFeature = autumn.customer?.features?.api_search_queries
	const searchesUsed = searchesFeature?.usage ?? 0
	const searchesLimit = searchesFeature?.included_usage ?? 0

	const isLoading = autumn.isLoading || isCheckingStatus

	const tokensPercent = calculateUsagePercent(tokensUsed, tokensLimit)
	const searchesPercent = calculateUsagePercent(searchesUsed, searchesLimit)
	const daysRemaining = getDaysRemaining(tokensResetAt)

	return {
		tokensUsed,
		tokensLimit,
		tokensPercent,
		searchesUsed,
		searchesLimit,
		searchesPercent,
		currentPlan,
		hasPaidPlan,
		isLoading,
		daysRemaining,
	}
}
