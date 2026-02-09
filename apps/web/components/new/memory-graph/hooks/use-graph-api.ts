"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState, useRef, useEffect } from "react"
import { $fetch } from "@repo/lib/api"
import type {
	GraphViewportResponse,
	GraphBoundsResponse,
	GraphStatsResponse,
} from "../types"

interface ViewportParams {
	minX: number
	maxX: number
	minY: number
	maxY: number
}

interface UseGraphApiOptions {
	containerTags?: string[]
	limit?: number
	enabled?: boolean
	documentIds?: string[]
}

export function useGraphApi(options: UseGraphApiOptions = {}) {
	const { containerTags, documentIds, limit = 200, enabled = true } = options

	const queryClient = useQueryClient()

	const [viewport, setViewport] = useState<ViewportParams>({
		minX: 0,
		maxX: 1000,
		minY: 0,
		maxY: 1000,
	})

	// Debounce viewport changes
	const viewportTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const pendingViewportRef = useRef<ViewportParams | null>(null)

	const updateViewport = useCallback((newViewport: ViewportParams) => {
		pendingViewportRef.current = newViewport

		if (viewportTimeoutRef.current) {
			clearTimeout(viewportTimeoutRef.current)
		}

		viewportTimeoutRef.current = setTimeout(() => {
			if (pendingViewportRef.current) {
				setViewport(pendingViewportRef.current)
				pendingViewportRef.current = null
			}
		}, 150)
	}, [])

	useEffect(() => {
		return () => {
			if (viewportTimeoutRef.current) {
				clearTimeout(viewportTimeoutRef.current)
			}
		}
	}, [])

	const boundsQuery = useQuery({
		queryKey: ["graph-bounds", containerTags?.join(",")],
		queryFn: async (): Promise<GraphBoundsResponse> => {
			const params = new URLSearchParams()
			if (containerTags?.length) {
				params.set("containerTags", JSON.stringify(containerTags))
			}

			const response = await $fetch("@get/graph/bounds", {
				query: Object.fromEntries(params),
				disableValidation: true,
			})

			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to fetch graph bounds",
				)
			}

			return response.data as GraphBoundsResponse
		},
		staleTime: 5 * 60 * 1000,
		enabled,
	})

	const statsQuery = useQuery({
		queryKey: ["graph-stats", containerTags?.join(",")],
		queryFn: async (): Promise<GraphStatsResponse> => {
			const params = new URLSearchParams()
			if (containerTags?.length) {
				params.set("containerTags", JSON.stringify(containerTags))
			}

			const response = await $fetch("@get/graph/stats", {
				query: Object.fromEntries(params),
				disableValidation: true,
			})

			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to fetch graph stats",
				)
			}

			return response.data as GraphStatsResponse
		},
		staleTime: 5 * 60 * 1000,
		enabled,
	})

	const viewportQuery = useQuery({
		queryKey: [
			"graph-viewport",
			viewport.minX,
			viewport.maxX,
			viewport.minY,
			viewport.maxY,
			containerTags?.join(","),
			documentIds?.join(","),
			limit,
		],
		queryFn: async (): Promise<GraphViewportResponse> => {
			const response = await $fetch("@post/graph/viewport", {
				body: {
					viewport: {
						minX: viewport.minX,
						maxX: viewport.maxX,
						minY: viewport.minY,
						maxY: viewport.maxY,
					},
					containerTags,
					documentIds,
					limit,
				},
				disableValidation: true,
			})

			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to fetch graph viewport",
				)
			}

			return response.data as GraphViewportResponse
		},
		staleTime: 30 * 1000,
		enabled,
	})

	// Prefetch adjacent viewports for smoother panning
	const prefetchAdjacentViewports = useCallback(
		(currentViewport: ViewportParams) => {
			const viewportWidth = currentViewport.maxX - currentViewport.minX
			const viewportHeight = currentViewport.maxY - currentViewport.minY

			const offsets = [
				{ dx: viewportWidth * 0.5, dy: 0 },
				{ dx: -viewportWidth * 0.5, dy: 0 },
				{ dx: 0, dy: viewportHeight * 0.5 },
				{ dx: 0, dy: -viewportHeight * 0.5 },
			]

			offsets.forEach(({ dx, dy }) => {
				const prefetchViewport = {
					minX: Math.max(0, currentViewport.minX + dx),
					maxX: Math.max(0, currentViewport.maxX + dx),
					minY: Math.max(0, currentViewport.minY + dy),
					maxY: Math.max(0, currentViewport.maxY + dy),
				}

				queryClient.prefetchQuery({
					queryKey: [
						"graph-viewport",
						prefetchViewport.minX,
						prefetchViewport.maxX,
						prefetchViewport.minY,
						prefetchViewport.maxY,
						containerTags?.join(","),
						limit,
					],
					queryFn: async () => {
						const response = await $fetch("@post/graph/viewport", {
							body: {
								viewport: prefetchViewport,
								containerTags,
								limit,
							},
							disableValidation: true,
						})

						if (response.error) {
							throw new Error(
								response.error?.message || "Failed to fetch graph viewport",
							)
						}

						return response.data
					},
					staleTime: 30 * 1000,
				})
			})
		},
		[queryClient, containerTags, limit],
	)

	const data = useMemo(() => {
		return {
			documents: viewportQuery.data?.documents ?? [],
			edges: viewportQuery.data?.edges ?? [],
			totalCount: viewportQuery.data?.totalCount ?? 0,
			bounds: boundsQuery.data?.bounds ?? null,
			stats: statsQuery.data ?? null,
		}
	}, [viewportQuery.data, boundsQuery.data, statsQuery.data])

	const isLoading = viewportQuery.isPending || boundsQuery.isPending
	const isRefetching = viewportQuery.isRefetching
	const error =
		viewportQuery.error || boundsQuery.error || statsQuery.error || null

	return {
		data,
		isLoading,
		isRefetching,
		error,
		viewport,
		updateViewport,
		prefetchAdjacentViewports,
		refetch: viewportQuery.refetch,
	}
}

/**
 * Scales backend coordinates (0-1000) to graph canvas coordinates
 */
export function scaleBackendToCanvas(
	x: number,
	y: number,
	canvasWidth: number,
	canvasHeight: number,
): { x: number; y: number } {
	const scale = Math.min(canvasWidth, canvasHeight) / 1000
	const offsetX = (canvasWidth - 1000 * scale) / 2
	const offsetY = (canvasHeight - 1000 * scale) / 2

	return {
		x: x * scale + offsetX,
		y: y * scale + offsetY,
	}
}

/**
 * Scales canvas coordinates to backend coordinates (0-1000)
 */
export function scaleCanvasToBackend(
	x: number,
	y: number,
	canvasWidth: number,
	canvasHeight: number,
): { x: number; y: number } {
	const scale = Math.min(canvasWidth, canvasHeight) / 1000
	const offsetX = (canvasWidth - 1000 * scale) / 2
	const offsetY = (canvasHeight - 1000 * scale) / 2

	return {
		x: (x - offsetX) / scale,
		y: (y - offsetY) / scale,
	}
}
