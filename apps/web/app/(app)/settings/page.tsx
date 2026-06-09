"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { parseHashToTab } from "@/components/settings/settings-content"

/**
 * Legacy redirect: /settings (and /settings#billing etc.) now open the
 * settings modal via the ?settings=<tab> URL state on the home page.
 */
export default function SettingsRedirect() {
	const router = useRouter()

	useEffect(() => {
		const hash = typeof window !== "undefined" ? window.location.hash : ""
		const tab = parseHashToTab(hash)
		router.replace(
			tab === "integrations" ? "/?view=integrations" : `/?settings=${tab}`,
		)
	}, [router])

	return null
}
