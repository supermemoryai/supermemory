"use client"

import { useEffect } from "react"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { useRouter } from "next/navigation"

export default function NewLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const flagEnabled = useFeatureFlagEnabled("nova-alpha-access")

	useEffect(() => {
		if (!flagEnabled) {
			router.push("/")
		}
	}, [flagEnabled, router])

	if (!flagEnabled) {
		return null
	}

	return <>{children}</>
}
