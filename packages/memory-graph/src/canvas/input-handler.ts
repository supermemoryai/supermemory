import type { GraphNode } from "../types"
import type { SpatialIndex } from "./hit-test"
import type { ViewportState } from "./viewport"

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

	private posHistory: Array<{ x: number; y: number; t: number }> = []

	private draggingNode: GraphNode | null = null
	private pressedNode: GraphNode | null = null
	private pressX = 0
	private pressY = 0
	private grabOffset = { x: 0, y: 0 }
	private gestureWindow: Window | null = null
	private didDrag = false

	private currentHoveredId: string | null = null

	private lastTouchDistance = 0
	private lastTouchCenter = { x: 0, y: 0 }
	private isTouchGesture = false

	// Tap detection: touch browsers never fire the synthesized click because
	// onTouchStart calls preventDefault(), so taps are detected manually.
	private static readonly TAP_MOVE_THRESHOLD = 10
	private tapCandidate = false
	private touchStartX = 0
	private touchStartY = 0
	// World point under the finger at touchstart, captured before any panning so
	// the release hit-test is not thrown off by sub-threshold pans during the tap.
	private touchStartWorldX = 0
	private touchStartWorldY = 0
	private touchStartNodeId: string | null = null

	private boundMouseDown: (e: MouseEvent) => void
	private boundMouseMove: (e: MouseEvent) => void
	private boundMouseUp: (e: MouseEvent) => void
	private boundWindowMove: (e: MouseEvent) => void
	private boundBlur: () => void
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
		this.boundWindowMove = (event) => {
			if (event.target !== this.canvas) this.onMouseMove(event)
		}
		this.boundBlur = () => this.endMouseGesture(false)
		this.boundWheel = this.onWheel.bind(this)
		this.boundClick = this.onClick.bind(this)
		this.boundDblClick = this.onDblClick.bind(this)
		this.boundTouchStart = this.onTouchStart.bind(this)
		this.boundTouchMove = this.onTouchMove.bind(this)
		this.boundTouchEnd = this.onTouchEnd.bind(this)
		this.boundGesture = (e: Event) => e.preventDefault()

		canvas.addEventListener("mousedown", this.boundMouseDown)
		canvas.addEventListener("mousemove", this.boundMouseMove)
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
		this.endMouseGesture(false)
		const c = this.canvas
		c.removeEventListener("mousedown", this.boundMouseDown)
		c.removeEventListener("mousemove", this.boundMouseMove)
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

	syncNodes(nodes: Map<string, GraphNode>): void {
		if (this.pressedNode) {
			this.pressedNode = nodes.get(this.pressedNode.id) ?? null
		}
		if (!this.draggingNode) return
		const current = nodes.get(this.draggingNode.id)
		if (!current) {
			this.endMouseGesture(false)
		} else if (current !== this.draggingNode) {
			current.x = current.fx = this.draggingNode.x
			current.y = current.fy = this.draggingNode.y
			this.draggingNode.fx = null
			this.draggingNode.fy = null
			this.draggingNode = current
		}
	}

	private canvasXY(e: MouseEvent): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect()
		return { x: e.clientX - rect.left, y: e.clientY - rect.top }
	}

	private onMouseDown(e: MouseEvent): void {
		if (e.button !== 0) return
		this.endMouseGesture(false)
		this.viewport.cancelAnimation()
		const { x, y } = this.canvasXY(e)
		const world = this.viewport.screenToWorld(x, y)
		const node = this.spatialIndex.queryPoint(world.x, world.y)

		this.lastMouseX = x
		this.lastMouseY = y
		this.posHistory = [{ x, y, t: performance.now() }]
		this.didDrag = false
		this.pressX = x
		this.pressY = y
		this.gestureWindow = this.canvas.ownerDocument.defaultView
		this.gestureWindow?.addEventListener("mousemove", this.boundWindowMove)
		this.gestureWindow?.addEventListener("mouseup", this.boundMouseUp)
		this.gestureWindow?.addEventListener("blur", this.boundBlur)

		if (node) {
			this.pressedNode = node
			this.grabOffset = { x: world.x - node.x, y: world.y - node.y }
		} else {
			this.isPanning = true
			this.canvas.style.cursor = "grabbing"
		}
	}

	private onMouseMove(e: MouseEvent): void {
		const { x, y } = this.canvasXY(e)
		if (this.pressedNode) {
			if (Math.hypot(x - this.pressX, y - this.pressY) < 4) return
			this.draggingNode = this.pressedNode
			this.pressedNode = null
			this.callbacks.onNodeDragStart(this.draggingNode.id, this.draggingNode)
			this.canvas.style.cursor = "grabbing"
		}

		if (this.draggingNode) {
			const world = this.viewport.screenToWorld(x, y)
			this.draggingNode.x = this.draggingNode.fx = world.x - this.grabOffset.x
			this.draggingNode.y = this.draggingNode.fy = world.y - this.grabOffset.y
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

			const now = performance.now()
			this.posHistory.push({ x, y, t: now })
			if (this.posHistory.length > 4) this.posHistory.shift()

			this.callbacks.onRequestRender()
			return
		}

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
		this.endMouseGesture(true)
	}

	private endMouseGesture(withInertia: boolean): void {
		this.gestureWindow?.removeEventListener("mousemove", this.boundWindowMove)
		this.gestureWindow?.removeEventListener("mouseup", this.boundMouseUp)
		this.gestureWindow?.removeEventListener("blur", this.boundBlur)
		this.gestureWindow = null
		this.pressedNode = null
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

			if (withInertia && this.posHistory.length >= 2) {
				const newest = this.posHistory[this.posHistory.length - 1]
				const oldest = this.posHistory[0]
				if (!newest || !oldest) return
				const dt = newest.t - oldest.t
				if (dt > 0 && dt < 200) {
					const vx = ((newest.x - oldest.x) / dt) * 16
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

		if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
			this.viewport.pan(-e.deltaX, 0)
			this.callbacks.onRequestRender()
			return
		}

		const factor = e.deltaY > 0 ? 0.97 : 1.03
		this.viewport.zoomImmediate(factor, x, y)
		this.callbacks.onRequestRender()
	}

	private onTouchStart(e: TouchEvent): void {
		e.preventDefault()
		const touches = e.touches

		if (touches.length >= 2) {
			this.isTouchGesture = true
			this.tapCandidate = false
			if (this.draggingNode) {
				this.draggingNode.fx = null
				this.draggingNode.fy = null
				this.draggingNode = null
				this.callbacks.onNodeDragEnd()
			}
			const t0 = touches[0]
			const t1 = touches[1]
			if (!t0 || !t1) return
			this.lastTouchDistance = Math.hypot(
				t1.clientX - t0.clientX,
				t1.clientY - t0.clientY,
			)
			this.lastTouchCenter = {
				x: (t0.clientX + t1.clientX) / 2,
				y: (t0.clientY + t1.clientY) / 2,
			}
		} else if (touches.length === 1 && touches[0]) {
			this.isTouchGesture = false
			const t = touches[0]
			const rect = this.canvas.getBoundingClientRect()
			this.lastMouseX = t.clientX - rect.left
			this.lastMouseY = t.clientY - rect.top
			this.touchStartX = this.lastMouseX
			this.touchStartY = this.lastMouseY
			const startWorld = this.viewport.screenToWorld(
				this.lastMouseX,
				this.lastMouseY,
			)
			this.touchStartWorldX = startWorld.x
			this.touchStartWorldY = startWorld.y
			this.tapCandidate = true

			const node = this.spatialIndex.queryPoint(startWorld.x, startWorld.y)
			this.touchStartNodeId = node?.id ?? null
			if (node) {
				this.draggingNode = node
				node.fx = node.x
				node.fy = node.y
				this.callbacks.onNodeDragStart(node.id, node)
				this.isPanning = false
			} else {
				this.draggingNode = null
				this.isPanning = true
			}
		}
	}

	private onTouchMove(e: TouchEvent): void {
		e.preventDefault()
		const touches = e.touches

		if (touches.length >= 2 && this.isTouchGesture) {
			const t0 = touches[0]
			const t1 = touches[1]
			if (!t0 || !t1) return
			const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
			const center = {
				x: (t0.clientX + t1.clientX) / 2,
				y: (t0.clientY + t1.clientY) / 2,
			}
			const rect = this.canvas.getBoundingClientRect()
			const cx = center.x - rect.left
			const cy = center.y - rect.top

			const scale = dist / this.lastTouchDistance
			this.viewport.zoomImmediate(scale, cx, cy)

			const dx = center.x - this.lastTouchCenter.x
			const dy = center.y - this.lastTouchCenter.y
			this.viewport.pan(dx, dy)

			this.lastTouchDistance = dist
			this.lastTouchCenter = center
			this.callbacks.onRequestRender()
		} else if (
			touches.length === 1 &&
			!this.isTouchGesture &&
			touches[0]
		) {
			const t = touches[0]
			const rect = this.canvas.getBoundingClientRect()
			const x = t.clientX - rect.left
			const y = t.clientY - rect.top
			if (
				this.tapCandidate &&
				Math.hypot(x - this.touchStartX, y - this.touchStartY) >
					InputHandler.TAP_MOVE_THRESHOLD
			) {
				this.tapCandidate = false
			}

			if (this.draggingNode) {
				const world = this.viewport.screenToWorld(x, y)
				this.draggingNode.fx = world.x
				this.draggingNode.fy = world.y
				this.draggingNode.x = world.x
				this.draggingNode.y = world.y
				this.callbacks.onRequestRender()
			} else if (this.isPanning) {
				this.viewport.pan(x - this.lastMouseX, y - this.lastMouseY)
				this.lastMouseX = x
				this.lastMouseY = y
				this.callbacks.onRequestRender()
			}
		}
	}

	private onTouchEnd(e: TouchEvent): void {
		if (e.touches.length < 2) {
			this.isTouchGesture = false
		}
		if (e.touches.length === 0) {
			this.isPanning = false
			if (this.draggingNode) {
				this.draggingNode.fx = null
				this.draggingNode.fy = null
				this.draggingNode = null
				this.callbacks.onNodeDragEnd()
				this.callbacks.onRequestRender()
			}
			if (this.tapCandidate) {
				this.tapCandidate = false
				this.callbacks.onNodeClick(this.touchStartNodeId)
			}
		}
	}
}
