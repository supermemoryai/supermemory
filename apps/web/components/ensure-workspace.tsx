"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@lib/auth-context"
import { Loader2 } from "lucide-react"

function WorkspaceLoadingShell() {
	return (
		<div className="flex min-h-dvh items-center justify-center bg-[#05080D]">
			<Loader2
				className="size-6 animate-spin text-white/40"
				aria-label="Loading workspace"
			/>
		</div>
	)
}

export function EnsureWorkspace({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()
	const { session, organizations, isRestoring, isSessionPending } = useAuth()

	const isPublicAppPage =
		pathname === "/" &&
		["integrations", "mcp"].includes(searchParams.get("view") ?? "")
	const isGuestPublicAppPage = isPublicAppPage && !session && !isSessionPending
	const isOnboarding = pathname.startsWith("/onboarding")

	useEffect(() => {
		if (isGuestPublicAppPage) return
		if (isRestoring) return
		if (!session) {
			router.replace(
				`/login?redirect=${encodeURIComponent(window.location.href)}`,
			)
			return
		}
		if (organizations === null) return
		if (organizations.length > 0) return
		if (isOnboarding) return
		router.replace("/onboarding")
	}, [
		session,
		organizations,
		isRestoring,
		isOnboarding,
		router,
		isGuestPublicAppPage,
	])

	const showLoading =
		!isGuestPublicAppPage &&
		(isRestoring ||
			(!session && !isRestoring) ||
			(session && organizations === null) ||
			(session &&
				organizations !== null &&
				organizations.length === 0 &&
				!isOnboarding))

	if (showLoading) {
		return <WorkspaceLoadingShell />
	}

	return children
}
