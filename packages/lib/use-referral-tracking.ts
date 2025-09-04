import { $fetch } from "@repo/lib/api"
import { useEffect } from "react"

export function useReferralTracking(user: any) {
	useEffect(() => {
		if (!user) return

		const trackReferral = async () => {
			try {
				// Check for pending referral code in localStorage
				const pendingReferral = localStorage.getItem(
					"supermemory-pending-referral",
				)

				// Also check URL params as a fallback
				const urlParams = new URLSearchParams(window.location.search)
				const urlReferral = urlParams.get("ref")

				const referralCode = pendingReferral || urlReferral

				if (!referralCode) return

				// Send referral tracking request
				const response = await $fetch("@post/referral/track", {
					body: { referralCode },
				})

				if (response.data) {
					// Clear the pending referral from localStorage
					localStorage.removeItem("supermemory-pending-referral")

					// Clear the ref param from URL
					if (urlReferral) {
						const url = new URL(window.location.href)
						url.searchParams.delete("ref")
						window.history.replaceState({}, "", url.toString())
					}

					console.log("Referral tracked successfully")
				} else if (response.error) {
					console.error(
						"Failed to track referral:",
						response.error?.message || "Unknown error",
					)
				}
			} catch (error) {
				console.error("Error tracking referral:", error)
			}
		}

		// Only track referral for new users (you might want to add a check here)
		// For now, we'll attempt to track for any user that has a pending referral
		trackReferral()
	}, [user])
}
