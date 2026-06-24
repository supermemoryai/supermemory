"use client"

import { useRouter } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import { getSession, type AuthSession } from "@/lib/auth"
import { shouldShowDesktopOnboarding } from "@/lib/onboarding"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

function useAuthStatus(): {
	status: AuthStatus
	session: AuthSession | null
} {
	const [status, setStatus] = useState<AuthStatus>("loading")
	const [session, setSession] = useState<AuthSession | null>(null)

	useEffect(() => {
		let cancelled = false

		getSession()
			.then((nextSession) => {
				if (!cancelled) {
					setSession(nextSession)
					setStatus("authenticated")
				}
			})
			.catch(() => {
				if (!cancelled) {
					setSession(null)
					setStatus("unauthenticated")
				}
			})

		return () => {
			cancelled = true
		}
	}, [])

	return { status, session }
}

export function AuthGuard({ children }: { children: ReactNode }) {
	const { status, session } = useAuthStatus()
	const router = useRouter()

	useEffect(() => {
		if (status === "unauthenticated") {
			router.replace("/login")
			return
		}

		if (status === "authenticated" && shouldShowDesktopOnboarding(session)) {
			router.replace("/onboarding")
		}
	}, [status, session, router])

	if (status !== "authenticated") {
		return (
			<div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">
				Loading...
			</div>
		)
	}

	return children
}
