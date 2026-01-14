import { fetchMemoriesFeature, fetchSubscriptionStatus } from "@lib/queries"
import type { useCustomer } from "autumn-js/react"

export function useMemoriesUsage(autumn: ReturnType<typeof useCustomer>) {
	const {
		data: status = {
			consumer_pro: { allowed: false, status: null },
		},
		isLoading: isCheckingStatus,
	} = fetchSubscriptionStatus(autumn, !autumn.isLoading)

	const proStatus = status.consumer_pro
	const hasProProduct = proStatus?.status !== null

	const { data: memoriesCheck, isLoading: isLoadingMemories } =
		fetchMemoriesFeature(autumn, !isCheckingStatus && !autumn.isLoading)

	const memoriesUsed = memoriesCheck?.usage ?? 0
	const memoriesLimit = memoriesCheck?.included_usage ?? 0

	const isLoading = autumn.isLoading || isCheckingStatus || isLoadingMemories

	const usagePercent =
		memoriesLimit <= 0
			? 0
			: Math.min(Math.max((memoriesUsed / memoriesLimit) * 100, 0), 100)

	return {
		memoriesUsed,
		memoriesLimit,
		hasProProduct,
		isLoading,
		usagePercent,
	}
}
