"use client"

import { useQueryState } from "nuqs"
import { viewParam } from "@/lib/search-params"
import { analytics } from "@/lib/analytics"
import { useCallback } from "react"

type ViewMode = "graph" | "list"

export function useViewMode() {
	const [viewMode, _setViewMode] = useQueryState("view", viewParam)

	const setViewMode = useCallback(
		(mode: ViewMode) => {
			analytics.viewModeChanged(mode)
			_setViewMode(mode)
		},
		[_setViewMode],
	)

	return { viewMode, setViewMode, isInitialized: true }
}
