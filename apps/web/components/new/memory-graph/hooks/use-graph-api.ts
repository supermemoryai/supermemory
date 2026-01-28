"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState, useRef, useEffect } from "react"
import { $fetch } from "@repo/lib/api"

// Graph API response types
export interface GraphApiNode {
	id: string
	type: "document" | "memory"
	title: string | null
	content: string | null
	createdAt: string
	updatedAt: string
	x: number // 0-1000
	y: number // 0-1000
	// document-specific
	documentType?: string
	// memory-specific
	isStatic?: boolean
	spaceId?: string
}

export interface GraphApiEdge {
	source: string
	target: string
	similarity: number // 0-1
}

export interface GraphViewportResponse {
	nodes: GraphApiNode[]
	edges: GraphApiEdge[]
	viewport: {
		minX: number
		maxX: number
		minY: number
		maxY: number
	}
	totalCount: number
}

export interface GraphBoundsResponse {
	bounds: {
		minX: number
		maxX: number
		minY: number
		maxY: number
	} | null
}

export interface GraphStatsResponse {
	totalDocuments: number
	documentsWithSpatial: number
	totalDocumentEdges: number
	totalMemories: number
	memoriesWithSpatial: number
	totalMemoryEdges: number
}

interface ViewportParams {
	minX: number
	maxX: number
	minY: number
	maxY: number
}

interface UseGraphApiOptions {
	containerTags?: string[]
	spaceId?: string
	includeMemories?: boolean
	limit?: number
	enabled?: boolean
}

/**
 * Hook to fetch graph data from the new Graph API
 * Handles viewport-based loading and caching
 */
export function useGraphApi(options: UseGraphApiOptions = {}) {
	const {
		containerTags,
		spaceId,
		includeMemories = true,
		limit = 200,
		enabled = true,
	} = options

	const queryClient = useQueryClient()

	// Track current viewport for fetching
	const [viewport, setViewport] = useState<ViewportParams>({
		minX: 0,
		maxX: 1000,
		minY: 0,
		maxY: 1000,
	})

	// Debounce viewport changes to avoid excessive API calls
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
		}, 150) // 150ms debounce
	}, [])

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (viewportTimeoutRef.current) {
				clearTimeout(viewportTimeoutRef.current)
			}
		}
	}, [])

	// Fetch graph bounds to know the data extent
	const boundsQuery = useQuery({
		queryKey: [
			"graph-bounds",
			containerTags?.join(","),
			spaceId,
			includeMemories,
		],
		queryFn: async (): Promise<GraphBoundsResponse> => {
			const params = new URLSearchParams()
			if (containerTags && containerTags.length > 0) {
				params.set("containerTags", JSON.stringify(containerTags))
			}
			if (spaceId) {
				params.set("spaceId", spaceId)
			}
			params.set("includeMemories", String(includeMemories))

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
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled,
	})

	// Fetch graph stats
	const statsQuery = useQuery({
		queryKey: ["graph-stats", containerTags?.join(","), spaceId],
		queryFn: async (): Promise<GraphStatsResponse> => {
			const params = new URLSearchParams()
			if (containerTags && containerTags.length > 0) {
				params.set("containerTags", JSON.stringify(containerTags))
			}
			if (spaceId) {
				params.set("spaceId", spaceId)
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

	// Fetch viewport data
	const viewportQuery = useQuery({
		queryKey: [
			"graph-viewport",
			viewport.minX,
			viewport.maxX,
			viewport.minY,
			viewport.maxY,
			containerTags?.join(","),
			spaceId,
			includeMemories,
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
					spaceId,
					includeMemories,
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
		staleTime: 30 * 1000, // 30 seconds for viewport data
		enabled,
	})

	// Prefetch adjacent viewports for smoother panning
	const prefetchAdjacentViewports = useCallback(
		(currentViewport: ViewportParams) => {
			const viewportWidth = currentViewport.maxX - currentViewport.minX
			const viewportHeight = currentViewport.maxY - currentViewport.minY

			// Prefetch in all 4 directions
			const offsets = [
				{ dx: viewportWidth * 0.5, dy: 0 }, // right
				{ dx: -viewportWidth * 0.5, dy: 0 }, // left
				{ dx: 0, dy: viewportHeight * 0.5 }, // down
				{ dx: 0, dy: -viewportHeight * 0.5 }, // up
			]

			offsets.forEach(({ dx, dy }) => {
				const prefetchViewport = {
					minX: Math.max(0, Math.min(1000, currentViewport.minX + dx)),
					maxX: Math.max(0, Math.min(1000, currentViewport.maxX + dx)),
					minY: Math.max(0, Math.min(1000, currentViewport.minY + dy)),
					maxY: Math.max(0, Math.min(1000, currentViewport.maxY + dy)),
				}

				queryClient.prefetchQuery({
					queryKey: [
						"graph-viewport",
						prefetchViewport.minX,
						prefetchViewport.maxX,
						prefetchViewport.minY,
						prefetchViewport.maxY,
						containerTags?.join(","),
						spaceId,
						includeMemories,
						limit,
					],
					queryFn: async () => {
						const response = await $fetch("@post/graph/viewport", {
							body: {
								viewport: prefetchViewport,
								containerTags,
								spaceId,
								includeMemories,
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
		[queryClient, containerTags, spaceId, includeMemories, limit],
	)

	// Compute derived state
	const data = useMemo(() => {
		return {
			nodes: viewportQuery.data?.nodes ?? [],
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
 * The backend uses a fixed 0-1000 range for spatial coordinates
 */
export function scaleBackendToCanvas(
	x: number,
	y: number,
	canvasWidth: number,
	canvasHeight: number,
): { x: number; y: number } {
	// Scale from 0-1000 to canvas size, maintaining aspect ratio
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
