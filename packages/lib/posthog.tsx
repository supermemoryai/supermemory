"use client"

import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { Suspense, useEffect } from "react"
import { useAuth } from "./auth-context"

function PostHogPageTracking() {
	const pathname = usePathname()
	const searchParams = useSearchParams()

	// Page tracking
	useEffect(() => {
		if (pathname && posthog.__loaded) {
			let url = window.origin + pathname
			if (searchParams.toString()) {
				url = `${url}?${searchParams.toString()}`
			}

			// Extract page context for better tracking
			const pageContext = {
				$current_url: url,
				path: pathname,
				search_params: searchParams.toString(),
				page_type: getPageType(),
				org_slug: getOrgSlug(pathname),
			}

			posthog.capture("$pageview", pageContext)
		}
	}, [pathname, searchParams])

	return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	const { user } = useAuth()

	useEffect(() => {
		if (typeof window === "undefined") return
		if (posthog.__loaded) {
			if (user) {
				posthog.identify(user.id, {
					email: user.email,
					name: user.name,
					userId: user.id,
					createdAt: user.createdAt,
				})
			}
			return
		}

		const timeout = window.setTimeout(() => {
			const backendUrl =
				process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

			posthog.init("phc_ShqecfUPQgf16lWu6ZMUzduQvcWzCywrkCz5KHwmWsv", {
				api_host: `${backendUrl}/orange`,
				ui_host: "https://us.i.posthog.com",
				person_profiles: "identified_only",
				capture_pageview: false,
				capture_pageleave: true,
				loaded: (ph) => {
					ph.register({ app: "app" })
					if (user) {
						ph.identify(user.id, {
							email: user.email,
							name: user.name,
							userId: user.id,
							createdAt: user.createdAt,
						})
					}
					if (process.env.NODE_ENV === "production") {
						ph.capture("$pageview", {
							$current_url: window.location.href,
							path: window.location.pathname,
							search_params: window.location.search.replace(/^\?/, ""),
							page_type: getPageType(),
							org_slug: getOrgSlug(window.location.pathname),
						})
					}
				},
			})
		}, 1500)

		return () => window.clearTimeout(timeout)
	}, [user])

	// User identification
	useEffect(() => {
		if (user && posthog.__loaded) {
			posthog.identify(user.id, {
				email: user.email,
				name: user.name,
				userId: user.id,
				createdAt: user.createdAt,
			})
		}
	}, [user])

	return (
		<>
			<Suspense fallback={null}>
				{process.env.NODE_ENV === "production" && <PostHogPageTracking />}
			</Suspense>
			{children}
		</>
	)
}

function getPageType(): string {
	return "other"
}

function getOrgSlug(pathname: string): string | null {
	const match = pathname.match(/^\/([^/]+)\//)
	return match ? (match[1] ?? null) : null
}

export function usePostHog() {
	return posthog
}
