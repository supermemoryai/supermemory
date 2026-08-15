export const PLAN_TIERS = [
	"api_pro",
	"api_max",
	"api_scale",
	"api_enterprise",
] as const
export type PlanTier = (typeof PLAN_TIERS)[number]

export type SubscriptionStatusMap = Record<
	string,
	{ allowed: boolean; status: string | null }
>

const DEFAULT_SUBSCRIPTION_STATUS: SubscriptionStatusMap = {
	api_pro: { allowed: false, status: null },
	api_max: { allowed: false, status: null },
	api_scale: { allowed: false, status: null },
	api_enterprise: { allowed: false, status: null },
}

function isLiveSubscriptionStatus(status: string | null | undefined): boolean {
	return status === "active" || status === "trialing"
}

export function isAllowedFrom(
	status: SubscriptionStatusMap,
	minimumTier: PlanTier,
): boolean {
	const minIndex = PLAN_TIERS.indexOf(minimumTier)
	return PLAN_TIERS.slice(minIndex).some((tier) => {
		const s = status[tier]
		return isLiveSubscriptionStatus(s?.status)
	})
}

export function getSubscriptionStatus(
	subscriptions: Array<{ planId: string; status: string }> | undefined,
): SubscriptionStatusMap {
	const statusMap: SubscriptionStatusMap = { ...DEFAULT_SUBSCRIPTION_STATUS }
	if (!subscriptions) return statusMap

	const subMap = new Map(subscriptions.map((s) => [s.planId, s]))

	for (const tier of PLAN_TIERS) {
		const sub = subMap.get(tier)
		statusMap[tier] = {
			allowed: isLiveSubscriptionStatus(sub?.status),
			status: sub?.status ?? null,
		}
	}
	return statusMap
}

export function hasActivePlan(
	subscriptions: Array<{ planId: string; status: string }> | undefined,
	minimumTier: PlanTier,
): boolean {
	return isAllowedFrom(getSubscriptionStatus(subscriptions), minimumTier)
}

export type CanceledSubscription = { planId: string; endsAt: number | null }

// A subscription scheduled to cancel at period end: still active, but canceledAt is set.
export function getCanceledSubscription(
	subscriptions:
		| Array<{
				planId: string
				status?: string
				canceledAt?: number | null
				currentPeriodEnd?: number | null
				expiresAt?: number | null
		  }>
		| undefined,
): CanceledSubscription | null {
	const sub = subscriptions?.find(
		(s) =>
			s.status === "active" &&
			s.canceledAt != null &&
			(PLAN_TIERS as readonly string[]).includes(s.planId),
	)
	if (!sub) return null
	return {
		planId: sub.planId,
		endsAt: sub.currentPeriodEnd ?? sub.expiresAt ?? null,
	}
}
