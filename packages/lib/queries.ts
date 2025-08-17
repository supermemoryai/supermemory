import { useQuery } from "@tanstack/react-query"
import type { useCustomer } from "autumn-js/react"

export const fetchSubscriptionStatus = (
	autumn: ReturnType<typeof useCustomer>,
) =>
	useQuery({
		queryFn: async () => {
			const allPlans = [
				"pro",
				"memory_starter",
				"memory_growth",
				"consumer_pro",
			]
			const statusMap: Record<string, boolean | null> = {}

			await Promise.all(
				allPlans.map(async (plan) => {
					try {
						const res = await autumn.check({
							productId: plan,
						})
						statusMap[plan] = res.data?.allowed ?? false
					} catch (error) {
						console.error(`Error checking status for ${plan}:`, error)
						statusMap[plan] = false
					}
				}),
			)

			return statusMap
		},
		queryKey: ["subscription-status"],
		refetchInterval: 5000, // Refetch every 5 seconds
		staleTime: 4000, // Consider data stale after 4 seconds
	})

// Feature checks
export const fetchMemoriesFeature = (autumn: ReturnType<typeof useCustomer>) =>
	useQuery({
		queryFn: async () => {
			const res = await autumn.check({ featureId: "memories" })
			return res.data
		},
		queryKey: ["autumn-feature", "memories"],
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
	})

export const fetchConnectionsFeature = (
	autumn: ReturnType<typeof useCustomer>,
) =>
	useQuery({
		queryFn: async () => {
			const res = await autumn.check({ featureId: "connections" })
			return res.data
		},
		queryKey: ["autumn-feature", "connections"],
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
	})

// Product checks
export const fetchConsumerProProduct = (
	autumn: ReturnType<typeof useCustomer>,
) =>
	useQuery({
		queryFn: async () => {
			const res = await autumn.check({ productId: "consumer_pro" })
			return res.data
		},
		queryKey: ["autumn-product", "consumer_pro"],
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
	})

export const fetchProProduct = (autumn: ReturnType<typeof useCustomer>) =>
	useQuery({
		queryFn: async () => {
			const res = await autumn.check({ productId: "pro" })
			return res.data
		},
		queryKey: ["autumn-product", "pro"],
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
	})
