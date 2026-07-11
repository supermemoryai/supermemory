"use client"

import { useEffect, useMemo, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { $fetch } from "@lib/api"
import { useProject } from "@/stores"
import { useAuth } from "@lib/auth-context"

const MAX_POLLS = 60
const POLL_INTERVAL_MS = 5_000

export function useProcessingDocuments() {
	const { user } = useAuth()
	const { effectiveContainerTags } = useProject()
	const queryClient = useQueryClient()
	const prevIdsRef = useRef<Set<string>>(new Set())

	const { data } = useQuery({
		queryKey: ["processing-documents", effectiveContainerTags],
		queryFn: async () => {
			const response = await $fetch("@get/documents/processing", {
				query: { containerTags: effectiveContainerTags },
				disableValidation: true,
			})
			if (response.error) return { documents: [], totalCount: 0 }
			return response.data ?? { documents: [], totalCount: 0 }
		},
		enabled: !!user,
		refetchInterval: (query) => {
			const count =
				(query.state.data as { totalCount?: number } | undefined)?.totalCount ??
				0
			const polls = query.state.dataUpdateCount
			if (count === 0 || polls >= MAX_POLLS) return false
			return POLL_INTERVAL_MS
		},
		staleTime: 0,
	})

	// Memoized on `data` (kept referentially stable between polls by React
	// Query's structural sharing) so `processingMap` only changes identity
	// when the poll payload actually changes — the effect below depends on it.
	const docs = useMemo(
		() =>
			(
				data as
					| {
							documents?: Array<{ id?: string | null; status?: string | null }>
					  }
					| undefined
			)?.documents ?? [],
		[data],
	)

	const processingMap = useMemo(() => {
		const map = new Map<string, string>()
		for (const doc of docs) {
			if (doc.id && doc.status) {
				map.set(doc.id, doc.status)
			}
		}
		return map
	}, [docs])

	// Detect docs that just finished (present in previous poll, absent now).
	// Done here — not in the card — because card remounts reset per-card refs
	// and lose the transition signal.
	useEffect(() => {
		const prev = prevIdsRef.current
		const current = new Set(processingMap.keys())
		prevIdsRef.current = current

		const justFinished = [...prev].filter((id) => !current.has(id))
		if (justFinished.length === 0) return

		const refresh = () => {
			queryClient.refetchQueries({ queryKey: ["documents-with-memories"] })
			queryClient.refetchQueries({ queryKey: ["dashboard-recents"] })
		}

		// First pass: give the backend ~1s to finish writing memory entries
		const t1 = setTimeout(refresh, 1000)
		// Second pass: insurance in case the first fetch still beat the writes
		const t2 = setTimeout(refresh, 4000)

		return () => {
			clearTimeout(t1)
			clearTimeout(t2)
		}
		// `processingMap` (not `processingMap.keys` — that's the shared
		// Map.prototype method, identical for every map, so the effect would
		// never re-run and finished docs would never trigger a refresh).
	}, [processingMap, queryClient])

	return processingMap
}
