import type { ViewportState } from "./viewport"
import type { SpatialIndex } from "./hit-test"
import type { GraphNode } from "../types"

interface InputCallbacks {
	onNodeHover: (id: string | null) => void
	onNodeClick: (id: string | null) => void
	onNodeDragStart: (id: string, node: GraphNode) => void
	onNodeDragEnd: () => void
	onRequestRender: () => void
}

export class InputHandler {
	private canvas: HTMLCanvasElement
	private viewport: ViewportState
	private spatialIndex: SpatialIndex
	private callbacks: InputCallbacks

	private isPanning = false
	private lastMouseX = 0
	private lastMouseY = 0

	// Ring buffer for velocity tracking
	private posHistory: Array<{ x: number; y: number; t: number }> = []

	private draggingNode: GraphNode | null = null
	private dragStartX = 0
	private dragStartY = 0
	private didDrag = false

	private currentHoveredId: string | null = null

	// Touch state
	private lastTouchDistance = 0
	private lastTouchCenter = { x: 0, y: 0 }
	private isTouchGesture = false

	// Bound handlers for cleanup
	private boundMouseDown: (e: MouseEvent) => void
	private boundMouseMove: (e: MouseEvent) => void
	private boundMouseUp: (e: MouseEvent) => void
	private boundWheel: (e: WheelEvent) => void
	private boundClick: (e: MouseEvent) => void
	private boundDblClick: (e: MouseEvent) => void
	private boundTouchStart: (e: TouchEvent) => void
	private boundTouchMove: (e: TouchEvent) => void
	private boundTouchEnd: (e: TouchEvent) => void
	private boundGesture: (e: Event) => void

	constructor(
		canvas: HTMLCanvasElement,
		viewport: ViewportState,
		spatialIndex: SpatialIndex,
		callbacks: InputCallbacks,
	) {
		this.canvas = canvas
		this.viewport = viewport
		this.spatialIndex = spatialIndex
		this.callbacks = callbacks

		this.boundMouseDown = this.onMouseDown.bind(this)
		this.boundMouseMove = this.onMouseMove.bind(this)
		this.boundMouseUp = this.onMouseUp.bind(this)
		this.boundWheel = this.onWheel.bind(this)
		this.boundClick = this.onClick.bind(this)
		this.boundDblClick = this.onDblClick.bind(this)
		this.boundTouchStart = this.onTouchStart.bind(this)
		this.boundTouchMove = this.onTouchMove.bind(this)
		this.boundTouchEnd = this.onTouchEnd.bind(this)
		this.boundGesture = (e: Event) => e.preventDefault()

		canvas.addEventListener("mousedown", this.boundMouseDown)
		canvas.addEventListener("mousemove", this.boundMouseMove)
		canvas.addEventListener("mouseup", this.boundMouseUp)
		canvas.addEventListener("click", this.boundClick)
		canvas.addEventListener("dblclick", this.boundDblClick)
		canvas.addEventListener("wheel", this.boundWheel, { passive: false })
		canvas.addEventListener("touchstart", this.boundTouchStart, {
			passive: false,
		})
		canvas.addEventListener("touchmove", this.boundTouchMove, {
			passive: false,
		})
		canvas.addEventListener("touchend", this.boundTouchEnd)
		canvas.addEventListener("gesturestart", this.boundGesture, {
			passive: false,
		})
		canvas.addEventListener("gesturechange", this.boundGesture, {
			passive: false,
		})
		canvas.addEventListener("gestureend", this.boundGesture, { passive: false })
	}

	destroy(): void {
		const c = this.canvas
		c.removeEventListener("mousedown", this.boundMouseDown)
		c.removeEventListener("mousemove", this.boundMouseMove)
		c.removeEventListener("mouseup", this.boundMouseUp)
		c.removeEventListener("click", this.boundClick)
		c.removeEventListener("dblclick", this.boundDblClick)
		c.removeEventListener("wheel", this.boundWheel)
		c.removeEventListener("touchstart", this.boundTouchStart)
		c.removeEventListener("touchmove", this.boundTouchMove)
		c.removeEventListener("touchend", this.boundTouchEnd)
		c.removeEventListener("gesturestart", this.boundGesture)
		c.removeEventListener("gesturechange", this.boundGesture)
		c.removeEventListener("gestureend", this.boundGesture)
	}

	getDraggingNode(): GraphNode | null {
		return this.draggingNode
	}

	private canvasXY(e: MouseEvent): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect()
		return { x: e.clientX - rect.left, y: e.clientY - rect.top }
	}

	private onMouseDown(e: MouseEvent): void {
		const { x, y } = this.canvasXY(e)
		const world = this.viewport.screenToWorld(x, y)
		const node = this.spatialIndex.queryPoint(world.x, world.y)

		this.lastMouseX = x
		this.lastMouseY = y
		this.posHistory = [{ x, y, t: performance.now() }]
		this.didDrag = false

		if (node) {
			this.draggingNode = node
			this.dragStartX = x
			this.dragStartY = y
			node.fx = node.x
			node.fy = node.y
			this.callbacks.onNodeDragStart(node.id, node)
			this.canvas.style.cursor = "grabbing"
		} else {
			this.isPanning = true
			this.canvas.style.cursor = "grabbing"
		}
	}

	private onMouseMove(e: MouseEvent): void {
		const { x, y } = this.canvasXY(e)

		if (this.draggingNode) {
			const world = this.viewport.screenToWorld(x, y)
			this.draggingNode.fx = world.x
			this.draggingNode.fy = world.y
			this.draggingNode.x = world.x
			this.draggingNode.y = world.y
			this.didDrag = true
			this.callbacks.onRequestRender()
			return
		}

		if (this.isPanning) {
			const dx = x - this.lastMouseX
			const dy = y - this.lastMouseY
			this.viewport.pan(dx, dy)
			this.lastMouseX = x
			this.lastMouseY = y
			this.didDrag = true

			// Track positions for velocity (keep last 4)
			const now = performance.now()
			this.posHistory.push({ x, y, t: now })
			if (this.posHistory.length > 4) this.posHistory.shift()

			this.callbacks.onRequestRender()
			return
		}

		// Hover detection
		const world = this.viewport.screenToWorld(x, y)
		const node = this.spatialIndex.queryPoint(world.x, world.y)
		const id = node?.id ?? null
		if (id !== this.currentHoveredId) {
			this.currentHoveredId = id
			this.callbacks.onNodeHover(id)
			this.canvas.style.cursor = id ? "grab" : "default"
			this.callbacks.onRequestRender()
		}
	}

	private onMouseUp(_e: MouseEvent): void {
		if (this.draggingNode) {
			this.draggingNode.fx = null
			this.draggingNode.fy = null
			this.draggingNode = null
			this.callbacks.onNodeDragEnd()
			this.canvas.style.cursor = this.currentHoveredId ? "grab" : "default"
			return
		}

		if (this.isPanning) {
			this.isPanning = false

			// Calculate release velocity from position history
			if (this.posHistory.length >= 2) {
				const newest = this.posHistory[this.posHistory.length - 1]!
				const oldest = this.posHistory[0]!
				const dt = newest.t - oldest.t
				if (dt > 0 && dt < 200) {
					const vx = ((newest.x - oldest.x) / dt) * 16 // scale to ~60fps frame
					const vy = ((newest.y - oldest.y) / dt) * 16
					this.viewport.releaseWithVelocity(vx, vy)
				}
			}

			this.canvas.style.cursor = "default"
			this.callbacks.onRequestRender()
		}
	}

	private onClick(e: MouseEvent): void {
		if (this.didDrag) return

		const { x, y } = this.canvasXY(e)
		const world = this.viewport.screenToWorld(x, y)
		const node = this.spatialIndex.queryPoint(world.x, world.y)
		this.callbacks.onNodeClick(node?.id ?? null)
	}

	private onDblClick(e: MouseEvent): void {
		const { x, y } = this.canvasXY(e)
		this.viewport.zoomTo(this.viewport.zoom * 1.5, x, y)
		this.callbacks.onRequestRender()
	}

	private onWheel(e: WheelEvent): void {
		e.preventDefault()

		const { x, y } = this.canvasXY(e)

		// Horizontal scroll -> pan
		if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
			this.viewport.pan(-e.deltaX, 0)
			this.callbacks.onRequestRender()
			return
		}

		// Vertical scroll -> zoom
		const factor = e.deltaY > 0 ? 0.97 : 1.03
		this.viewport.zoomImmediate(factor, x, y)
		this.callbacks.onRequestRender()
	}

	// Touch handling
	private onTouchStart(e: TouchEvent): void {
		e.preventDefault()
		const touches = e.touches

		if (touches.length >= 2) {
			this.isTouchGesture = true
			const t0 = touches[0]!
			const t1 = touches[1]!
			this.lastTouchDistance = Math.hypot(
				t1.clientX - t0.clientX,
				t1.clientY - t0.clientY,
			)
			this.lastTouchCenter = {
				x: (t0.clientX + t1.clientX) / 2,
				y: (t0.clientY + t1.clientY) / 2,
			}
		} else if (touches.length === 1) {
			this.isTouchGesture = false
			const t = touches[0]!
			const rect = this.canvas.getBoundingClientRect()
			this.lastMouseX = t.clientX - rect.left
			this.lastMouseY = t.clientY - rect.top
			this.isPanning = true
		}
	}

	private onTouchMove(e: TouchEvent): void {
		e.preventDefault()
		const touches = e.touches

		if (touches.length >= 2 && this.isTouchGesture) {
			const t0 = touches[0]!
			const t1 = touches[1]!
			const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
			const center = {
				x: (t0.clientX + t1.clientX) / 2,
				y: (t0.clientY + t1.clientY) / 2,
			}
			const rect = this.canvas.getBoundingClientRect()
			const cx = center.x - rect.left
			const cy = center.y - rect.top

			// Pinch zoom
			const scale = dist / this.lastTouchDistance
			this.viewport.zoomImmediate(scale, cx, cy)

			// Pan from center movement
			const dx = center.x - this.lastTouchCenter.x
			const dy = center.y - this.lastTouchCenter.y
			this.viewport.pan(dx, dy)

			this.lastTouchDistance = dist
			this.lastTouchCenter = center
			this.callbacks.onRequestRender()
		} else if (touches.length === 1 && this.isPanning && !this.isTouchGesture) {
			const t = touches[0]!
			const rect = this.canvas.getBoundingClientRect()
			const x = t.clientX - rect.left
			const y = t.clientY - rect.top
			this.viewport.pan(x - this.lastMouseX, y - this.lastMouseY)
			this.lastMouseX = x
			this.lastMouseY = y
			this.callbacks.onRequestRender()
		}
	}

	private onTouchEnd(e: TouchEvent): void {
		if (e.touches.length < 2) {
			this.isTouchGesture = false
		}
		if (e.touches.length === 0) {
			this.isPanning = false
		}
	}
}
