"use client"

import { useRouter } from "next/navigation"
import { type ReactNode, useEffect } from "react"

// Phase 1 stub. Phase 2/3 replaces `useAuthStatus` with a real check of the
// keychain-backed token (invoke('auth_get_token')) and returns "unauthenticated"
// when it is missing. The state machine + redirect are wired now so later phases
// only swap the source of truth, not the guard's shape.
type AuthStatus = "loading" | "authenticated" | "unauthenticated"

function useAuthStatus(): AuthStatus {
	return "authenticated"
}

export function AuthGuard({ children }: { children: ReactNode }) {
	const status = useAuthStatus()
	const router = useRouter()

	useEffect(() => {
		if (status === "unauthenticated") {
			router.replace("/login")
		}
	}, [status, router])

	if (status !== "authenticated") {
		return (
			<div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">
				Loading…
			</div>
		)
	}

	return children
}
