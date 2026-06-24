"use client"

import { useRouter } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import { getSession } from "@/lib/auth"
import { shouldShowDesktopOnboarding } from "@/lib/onboarding"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

function useAuthStatus(): AuthStatus {
	const [status, setStatus] = useState<AuthStatus>("loading")

	useEffect(() => {
		let cancelled = false

		getSession()
			.then(() => {
				if (!cancelled) setStatus("authenticated")
			})
			.catch(() => {
				if (!cancelled) setStatus("unauthenticated")
			})

		return () => {
			cancelled = true
		}
	}, [])

	return status
}

export function AuthGuard({ children }: { children: ReactNode }) {
	const status = useAuthStatus()
	const router = useRouter()

	useEffect(() => {
		if (status === "unauthenticated") {
			router.replace("/login")
			return
		}

		if (status === "authenticated" && shouldShowDesktopOnboarding()) {
			router.replace("/onboarding")
		}
	}, [status, router])

	if (status !== "authenticated") {
		return (
			<div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">
				Loading...
			</div>
		)
	}

	return children
}
