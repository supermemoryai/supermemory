"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@lib/auth-context"

export function EnsureWorkspace({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()
	const { session, organizations, isRestoring } = useAuth()

	const isMcpPublicPage = searchParams.get("view") === "mcp"

	useEffect(() => {
		if (isMcpPublicPage) return
		if (isRestoring) return
		if (!session) {
			router.replace(
				`/login?redirect=${encodeURIComponent(window.location.href)}`,
			)
			return
		}
		if (organizations === null) return
		if (organizations.length > 0) return
		if (pathname.startsWith("/onboarding")) return
		router.replace("/onboarding")
	}, [session, organizations, isRestoring, pathname, router, isMcpPublicPage])

	return children
}
