"use client"

import { useQueryState } from "nuqs"
import { viewParam, type ViewParamValue } from "@/lib/search-params"
import { analytics } from "@/lib/analytics"
import { useCallback } from "react"

export type ViewMode = ViewParamValue

type SetViewMode = (value: ViewMode | null) => Promise<URLSearchParams>

export function useViewMode() {
	const [viewMode, _setViewMode] = useQueryState("view", viewParam)

	const setViewMode = useCallback(
		(mode: ViewMode) => {
			analytics.viewModeChanged(mode)
			;(_setViewMode as SetViewMode)(mode)
		},
		[_setViewMode],
	)

	return { viewMode, setViewMode, isInitialized: true }
}
