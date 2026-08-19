"use client"

import { useAuth } from "@lib/auth-context"
import { useCustomer } from "autumn-js/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"
import { toast } from "sonner"
import {
	normalizePlanType,
	PLAN_RANK,
	type PlanType,
	useTokenUsage,
} from "@/hooks/use-token-usage"

const PENDING_PROMO_CODE_KEY = "sm.promoCode.pending"
const PROMO_TOAST_ID = "promo-code"
/** A code that is never redeemed stops applying after this long. */
const PROMO_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface StoredPromoCode {
	code: string
	/** Plan the org was on when the code was stored. */
	plan?: PlanType
	expiresAt?: number
}

function promoCodeKey(orgId: string): string {
	return `sm.promoCode.org_${orgId}`
}

/**
 * Codes are stored as JSON. Values written before the plan/expiry bookkeeping
 * existed are the bare code, and are kept working until `PromoCodeHost` stamps
 * them on the next mount.
 */
export function parseStoredPromoCode(
	raw: string | null,
	now: number = Date.now(),
): StoredPromoCode | null {
	if (!raw) return null

	let stored: StoredPromoCode
	if (raw.startsWith("{")) {
		try {
			const parsed = JSON.parse(raw) as StoredPromoCode
			if (typeof parsed?.code !== "string" || !parsed.code) return null
			stored = parsed
		} catch {
			return null
		}
	} else {
		stored = { code: raw }
	}

	if (stored.expiresAt !== undefined && stored.expiresAt <= now) return null
	return stored
}

/**
 * A discount is spent once the org actually moves up a plan — that, not
 * `attach()` resolving, is the point at which the checkout it was captured for
 * went through. Downgrades and trial expiries leave an unused code alone.
 */
export function isPromoCodeSpent(
	stored: StoredPromoCode,
	currentPlan: PlanType,
): boolean {
	if (!stored.plan) return false
	return PLAN_RANK[currentPlan] > PLAN_RANK[stored.plan]
}

function readOrgPromoCode(orgId?: string): StoredPromoCode | null {
	if (!orgId || typeof window === "undefined") return null
	return parseStoredPromoCode(window.localStorage.getItem(promoCodeKey(orgId)))
}

function writeOrgPromoCode(orgId: string, code: string, plan: PlanType): void {
	const stored: StoredPromoCode = {
		code,
		plan,
		expiresAt: Date.now() + PROMO_TTL_MS,
	}
	window.localStorage.setItem(promoCodeKey(orgId), JSON.stringify(stored))
}

export function usePromoCode() {
	const { org } = useAuth()
	const orgId = org?.id

	const getDiscounts = useCallback(() => {
		const stored = readOrgPromoCode(orgId)
		return stored ? [{ promotionCode: stored.code }] : undefined
	}, [orgId])

	return useMemo(() => ({ getDiscounts }), [getDiscounts])
}

export function PromoCodeCapture() {
	useEffect(() => {
		const url = new URL(window.location.href)
		const code = url.searchParams.get("discountCode")
		if (!code) return

		window.localStorage.setItem(PENDING_PROMO_CODE_KEY, code)
		url.searchParams.delete("discountCode")
		window.history.replaceState({}, "", url.toString())
	}, [])

	return null
}

export function PromoCodeHost() {
	const { org } = useAuth()
	const router = useRouter()
	const autumn = useCustomer()
	const { currentPlan, isLoading } = useTokenUsage(autumn)
	const orgId = org?.id

	useEffect(() => {
		if (!orgId) return
		// The stored plan is the yardstick for "has this code been redeemed",
		// so nothing is stamped until autumn has loaded — recording a
		// placeholder "free" would spend the code on the next render.
		if (isLoading) return

		const plan = normalizePlanType(currentPlan)
		const pending = window.localStorage.getItem(PENDING_PROMO_CODE_KEY)
		if (pending) {
			writeOrgPromoCode(orgId, pending, plan)
			window.localStorage.removeItem(PENDING_PROMO_CODE_KEY)
		}

		const stored = readOrgPromoCode(orgId)
		if (!stored) {
			toast.dismiss(PROMO_TOAST_ID)
			return
		}

		if (isPromoCodeSpent(stored, plan)) {
			window.localStorage.removeItem(promoCodeKey(orgId))
			toast.dismiss(PROMO_TOAST_ID)
			return
		}

		// Codes stored before this bookkeeping existed carry no plan or expiry.
		if (!stored.plan || stored.expiresAt === undefined) {
			writeOrgPromoCode(orgId, stored.code, plan)
		}

		toast.success("Discount code active", {
			id: PROMO_TOAST_ID,
			description: `Code ${stored.code} will apply at checkout.`,
			duration: Number.POSITIVE_INFINITY,
			action: {
				label: "Upgrade",
				onClick: () => router.push("/settings#billing"),
			},
		})
	}, [orgId, router, currentPlan, isLoading])

	return null
}
