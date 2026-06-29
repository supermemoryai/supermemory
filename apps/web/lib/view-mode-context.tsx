"use client"

import { useQueryState } from "nuqs"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { viewParam, type ViewParamValue } from "@/lib/search-params"
import {
	integrationViewToPath,
	isIntegrationView,
	pathToIntegrationView,
} from "@/lib/integration-routes"
import { analytics } from "@/lib/analytics"
import { useCallback, useEffect } from "react"

export type ViewMode = ViewParamValue

const TRACKED_VIEW_MODES = [
	"dashboard",
	"graph",
	"list",
	"integrations",
	"chat",
	"digests",
] as const

function isTrackedViewMode(
	mode: ViewMode,
): mode is (typeof TRACKED_VIEW_MODES)[number] {
	return (TRACKED_VIEW_MODES as readonly string[]).includes(mode)
}

export function useViewMode() {
	const pathname = usePathname()
	const router = useRouter()
	const [paramView, setParamView] = useQueryState("view", viewParam)

	// On /integrations[/card] the path is the source of truth; elsewhere the ?view param is.
	const pathView = pathToIntegrationView(pathname)
	const viewMode: ViewMode = pathView ?? paramView

	const setViewMode = useCallback(
		(mode: ViewMode) => {
			if (isTrackedViewMode(mode)) analytics.viewModeChanged(mode)
			if (isIntegrationView(mode)) {
				router.push(integrationViewToPath(mode))
				return
			}
			// Leaving (or already off) the integrations route for a non-integration view.
			if (pathToIntegrationView(pathname)) {
				router.push(mode === "dashboard" ? "/" : `/?view=${mode}`)
				return
			}
			void setParamView(mode)
		},
		[router, pathname, setParamView],
	)

	return { viewMode, setViewMode, isInitialized: true }
}

// Forwards legacy /?view=integrations (and sub-views) to the canonical /integrations route,
// preserving any other query params. Call once near the app root.
export function useLegacyViewRedirect() {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()

	useEffect(() => {
		if (pathname !== "/") return
		const view = searchParams.get("view")
		if (!view || !isIntegrationView(view)) return
		const params = new URLSearchParams(searchParams.toString())
		params.delete("view")
		const qs = params.toString()
		router.replace(integrationViewToPath(view) + (qs ? `?${qs}` : ""))
	}, [pathname, searchParams, router])
}
