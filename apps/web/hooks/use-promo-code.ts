"use client"

import { useAuth } from "@lib/auth-context"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"
import { toast } from "sonner"

const PENDING_PROMO_CODE_KEY = "sm.promoCode.pending"
const PROMO_TOAST_ID = "promo-code"

function promoCodeKey(orgId: string): string {
	return `sm.promoCode.org_${orgId}`
}

function readOrgPromoCode(orgId?: string): string | null {
	if (!orgId || typeof window === "undefined") return null
	return window.localStorage.getItem(promoCodeKey(orgId))
}

export function usePromoCode() {
	const { org } = useAuth()
	const orgId = org?.id

	const getDiscounts = useCallback(() => {
		const promotionCode = readOrgPromoCode(orgId)
		return promotionCode ? [{ promotionCode }] : undefined
	}, [orgId])

	const clear = useCallback(() => {
		if (!orgId) return
		window.localStorage.removeItem(promoCodeKey(orgId))
		toast.dismiss(PROMO_TOAST_ID)
	}, [orgId])

	return useMemo(() => ({ getDiscounts, clear }), [getDiscounts, clear])
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

	useEffect(() => {
		if (!org?.id) return

		const pending = window.localStorage.getItem(PENDING_PROMO_CODE_KEY)
		if (pending) {
			window.localStorage.setItem(promoCodeKey(org.id), pending)
			window.localStorage.removeItem(PENDING_PROMO_CODE_KEY)
		}

		const code = readOrgPromoCode(org.id)
		if (!code) {
			toast.dismiss(PROMO_TOAST_ID)
			return
		}
		toast.success("Discount code active", {
			id: PROMO_TOAST_ID,
			description: `Code ${code} will apply at checkout.`,
			duration: Number.POSITIVE_INFINITY,
			action: {
				label: "Upgrade",
				onClick: () => router.push("/settings#billing"),
			},
		})
	}, [org?.id, router])

	return null
}
