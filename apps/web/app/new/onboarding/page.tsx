"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
	const router = useRouter()

	useEffect(() => {
		router.replace("/new/onboarding/welcome?step=input")
	}, [router])

	return (
		<div className="h-screen overflow-hidden bg-black flex items-center justify-center">
			<div className="text-white/50 text-sm">Loading...</div>
		</div>
	)
}
