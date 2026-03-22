import {
	DEFAULT_SUBSCRIPTION_STATUS,
	fetchSubscriptionStatus,
	isAllowedFrom,
} from "@lib/queries"
import type { useCustomer } from "autumn-js/react"
import { calculateUsagePercent, getDaysRemaining } from "@/lib/billing-utils"

export type PlanType = "free" | "pro" | "scale" | "enterprise"

export function useTokenUsage(autumn: ReturnType<typeof useCustomer>) {
	const {
		data: status = DEFAULT_SUBSCRIPTION_STATUS,
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn, !autumn.isLoading)

	let currentPlan: PlanType = "free"
	if (isAllowedFrom(status, "api_enterprise")) {
		currentPlan = "enterprise"
	} else if (isAllowedFrom(status, "api_scale")) {
		currentPlan = "scale"
	} else if (isAllowedFrom(status, "api_pro")) {
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
