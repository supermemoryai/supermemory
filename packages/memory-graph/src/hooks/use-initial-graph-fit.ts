import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"
import type { ViewportState } from "../canvas/viewport"
import type { ForceSimulation } from "../canvas/simulation"
import type { GraphApiDocument, GraphNode } from "../types"

export function useInitialGraphFit({
	documents,
	nodes,
	viewportRef,
	simulationRef,
	width,
	height,
	isLoading,
	isLoadingMore,
	hasMore,
}: {
	documents: GraphApiDocument[]
	nodes: GraphNode[]
	viewportRef: RefObject<ViewportState | null>
	simulationRef?: RefObject<ForceSimulation | null>
	width: number
	height: number
	isLoading: boolean
	isLoadingMore: boolean
	hasMore: boolean
}) {
	const session = useRef({
		documentIds: new Set<string>(),
		following: true,
		userMoved: false,
		fitted: false,
		width: 0,
		height: 0,
	})

	const stopFollowing = useCallback(() => {
		session.current.following = false
		session.current.userMoved = true
		viewportRef.current?.cancelAnimation()
	}, [viewportRef])

	useLayoutEffect(() => {
		const current = session.current
		const documentIds = new Set(documents.map((document) => document.id))
		const replaced = [...current.documentIds].some((id) => !documentIds.has(id))
		if (nodes.length === 0 || replaced) {
			current.following = true
			current.userMoved = false
			current.fitted = false
		}
		if (
			(width !== current.width || height !== current.height) &&
			!current.userMoved
		) {
			current.following = true
		}
		current.documentIds = documentIds
		current.width = width
		current.height = height
		if (
			!current.following ||
			isLoading ||
			nodes.length === 0 ||
			width <= 0 ||
			height <= 0
		)
			return

		let timer: ReturnType<typeof setTimeout> | undefined
		const fit = (animate = true) => {
			const viewport = viewportRef.current
			if (!viewport || !session.current.following) return
			viewport.setMinZoomForNodes(nodes, width, height)
			viewport.fitToNodes(nodes, width, height, { animate })
			if (simulationRef?.current?.isActive()) {
				timer = setTimeout(fit, 200)
			} else if (!hasMore && !isLoadingMore) {
				session.current.following = false
			}
		}
		if (!current.fitted) {
			current.fitted = true
			fit(false)
		} else {
			timer = setTimeout(fit, 100)
		}
		return () => clearTimeout(timer)
	}, [
		documents,
		nodes,
		viewportRef,
		simulationRef,
		width,
		height,
		isLoading,
		isLoadingMore,
		hasMore,
	])

	return stopFollowing
}
