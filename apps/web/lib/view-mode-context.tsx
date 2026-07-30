"use client"

import { useQueryState } from "nuqs"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { viewParam, type ViewParamValue } from "@/lib/search-params"
import {
	integrationViewToPath,
	isIntegrationView,
	pathToIntegrationView,
} from "@/lib/integration-routes"
import { isConfigurePath } from "@/lib/configure-routes"
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

	// On /integrations[/card] and /configure[/section] the path is the source of truth;
	// elsewhere the ?view param is.
	const pathView: ViewMode | null =
		pathToIntegrationView(pathname) ??
		(isConfigurePath(pathname) ? "configure" : null)
	const viewMode: ViewMode = pathView ?? paramView

	const setViewMode = useCallback(
		(mode: ViewMode) => {
			if (isTrackedViewMode(mode)) analytics.viewModeChanged(mode)
			if (isIntegrationView(mode)) {
				router.push(integrationViewToPath(mode))
				return
			}
			if (mode === "configure") {
				router.push("/configure")
				return
			}
			// Leaving (or already off) a path-owned route for a param-owned view.
			if (pathToIntegrationView(pathname) || isConfigurePath(pathname)) {
				router.push(mode === "dashboard" ? "/" : `/?view=${mode}`)
				return
			}
			void setParamView(mode)
		},
		[router, pathname, setParamView],
	)

	return { viewMode, setViewMode, isInitialized: true }
}

// Forwards legacy /?view=integrations (and sub-views) and /?view=configure to their
// canonical routes, preserving any other query params. Call once near the app root.
export function useLegacyViewRedirect() {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()

	useEffect(() => {
		if (pathname !== "/") return
		const view = searchParams.get("view")
		if (!view) return
		const target = isIntegrationView(view)
			? integrationViewToPath(view)
			: view === "configure"
				? "/configure"
				: null
		if (!target) return
		const params = new URLSearchParams(searchParams.toString())
		params.delete("view")
		const qs = params.toString()
		router.replace(target + (qs ? `?${qs}` : ""))
	}, [pathname, searchParams, router])
}
