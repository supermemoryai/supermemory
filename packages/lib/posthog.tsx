"use client"

import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { Suspense, useEffect } from "react"
import { useSession } from "./auth"

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
	const { data: session } = useSession()

	useEffect(() => {
		if (typeof window !== "undefined") {
			const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
			const backendUrl =
				process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

			if (posthogKey) {
				posthog.init(posthogKey, {
					api_host: `${backendUrl}/orange`,
					ui_host: "https://us.i.posthog.com",
					person_profiles: "identified_only",
					capture_pageview: false,
					capture_pageleave: true,
				})
			} else {
				console.warn(
					"PostHog API key is not set. PostHog will not be initialized.",
				)
			}
		}
	}, [])

	// User identification
	useEffect(() => {
		if (session?.user && posthog.__loaded) {
			posthog.identify(session.user.id, {
				email: session.user.email,
				name: session.user.name,
				userId: session.user.id,
				createdAt: session.user.createdAt,
			})
		}
	}, [session?.user])

	return (
		<>
			<Suspense fallback={null}>
				<PostHogPageTracking />
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
