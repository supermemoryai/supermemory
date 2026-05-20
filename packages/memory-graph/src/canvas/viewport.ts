export class ViewportState {
	panX: number
	panY: number
	zoom: number

	private velocityX = 0
	private velocityY = 0
	private readonly friction = 0.92

	private targetZoom: number
	private readonly zoomSpring = 0.15
	private zoomAnchorX = 0
	private zoomAnchorY = 0

	private targetPanX: number | null = null
	private targetPanY: number | null = null
	private readonly panLerp = 0.12

	private static readonly DEFAULT_MIN_ZOOM = 0.1
	private static readonly ABSOLUTE_MIN_ZOOM = 0.005
	private static readonly MAX_ZOOM = 5.0
	private minZoom = ViewportState.DEFAULT_MIN_ZOOM

	constructor(initialPanX = 0, initialPanY = 0, initialZoom = 0.5) {
		this.panX = initialPanX
		this.panY = initialPanY
		this.zoom = initialZoom
		this.targetZoom = initialZoom
	}

	worldToScreen(wx: number, wy: number): { x: number; y: number } {
		return {
			x: wx * this.zoom + this.panX,
			y: wy * this.zoom + this.panY,
		}
	}

	screenToWorld(sx: number, sy: number): { x: number; y: number } {
		return {
			x: (sx - this.panX) / this.zoom,
			y: (sy - this.panY) / this.zoom,
		}
	}

	pan(dx: number, dy: number): void {
		this.panX += dx
		this.panY += dy
		this.targetPanX = null
		this.targetPanY = null
	}

	releaseWithVelocity(vx: number, vy: number): void {
		this.velocityX = vx
		this.velocityY = vy
	}

	zoomImmediate(delta: number, anchorX: number, anchorY: number): void {
		const world = this.screenToWorld(anchorX, anchorY)
		this.zoom = clamp(this.zoom * delta, this.minZoom, ViewportState.MAX_ZOOM)
		this.targetZoom = this.zoom
		this.panX = anchorX - world.x * this.zoom
		this.panY = anchorY - world.y * this.zoom
	}

	zoomTo(target: number, anchorX: number, anchorY: number): void {
		this.targetZoom = clamp(target, this.minZoom, ViewportState.MAX_ZOOM)
		this.zoomAnchorX = anchorX
		this.zoomAnchorY = anchorY
	}

	fitToNodes(
		nodes: Array<{ x: number; y: number; size: number }>,
		width: number,
		height: number,
	): void {
		const fit = computeFit(nodes, width, height)
		if (!fit) return

		const { cx, cy, fitZoom } = fit

		this.targetZoom = clamp(fitZoom, this.minZoom, ViewportState.MAX_ZOOM)
		this.zoomAnchorX = width / 2
		this.zoomAnchorY = height / 2
		this.targetPanX = width / 2 - cx * this.targetZoom
		this.targetPanY = height / 2 - cy * this.targetZoom
	}

	setMinZoomForNodes(
		nodes: Array<{ x: number; y: number; size: number }>,
		width: number,
		height: number,
	): void {
		const fit = computeFit(nodes, width, height)
		const nextMinZoom = fit
			? Math.min(ViewportState.DEFAULT_MIN_ZOOM, fit.fitZoom)
			: ViewportState.DEFAULT_MIN_ZOOM
		this.minZoom = clamp(
			nextMinZoom,
			ViewportState.ABSOLUTE_MIN_ZOOM,
			ViewportState.DEFAULT_MIN_ZOOM,
		)
		this.zoom = clamp(this.zoom, this.minZoom, ViewportState.MAX_ZOOM)
		this.targetZoom = clamp(
			this.targetZoom,
			this.minZoom,
			ViewportState.MAX_ZOOM,
		)
	}

	centerOn(
		worldX: number,
		worldY: number,
		width: number,
		height: number,
	): void {
		this.targetPanX = width / 2 - worldX * this.zoom
		this.targetPanY = height / 2 - worldY * this.zoom
	}

	tick(): boolean {
		let moving = false

		if (Math.abs(this.velocityX) > 0.5 || Math.abs(this.velocityY) > 0.5) {
			this.panX += this.velocityX
			this.panY += this.velocityY
			this.velocityX *= this.friction
			this.velocityY *= this.friction
			moving = true
		} else {
			this.velocityX = 0
			this.velocityY = 0
		}

		const zoomDiff = this.targetZoom - this.zoom
		if (Math.abs(zoomDiff) > 0.001) {
			const world = this.screenToWorld(this.zoomAnchorX, this.zoomAnchorY)
			this.zoom += zoomDiff * this.zoomSpring
			this.panX = this.zoomAnchorX - world.x * this.zoom
			this.panY = this.zoomAnchorY - world.y * this.zoom
			moving = true
		}

		if (this.targetPanX !== null && this.targetPanY !== null) {
			const dx = this.targetPanX - this.panX
			const dy = this.targetPanY - this.panY
			if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
				this.panX += dx * this.panLerp
				this.panY += dy * this.panLerp
				moving = true
			} else {
				this.panX = this.targetPanX
				this.panY = this.targetPanY
				this.targetPanX = null
				this.targetPanY = null
			}
		}

		return moving
	}
}

function computeFit(
	nodes: Array<{ x: number; y: number; size: number }>,
	width: number,
	height: number,
): { cx: number; cy: number; fitZoom: number } | null {
	if (nodes.length === 0 || width <= 0 || height <= 0) return null

	let minX = Number.POSITIVE_INFINITY
	let maxX = Number.NEGATIVE_INFINITY
	let minY = Number.POSITIVE_INFINITY
	let maxY = Number.NEGATIVE_INFINITY

	for (const n of nodes) {
		minX = Math.min(minX, n.x - n.size)
		maxX = Math.max(maxX, n.x + n.size)
		minY = Math.min(minY, n.y - n.size)
		maxY = Math.max(maxY, n.y + n.size)
	}

	const pad = 0.1
	const cw = Math.max((maxX - minX) * (1 + pad * 2), 1)
	const ch = Math.max((maxY - minY) * (1 + pad * 2), 1)
	const cx = (minX + maxX) / 2
	const cy = (minY + maxY) / 2

	return {
		cx,
		cy,
		fitZoom: Math.min(width / cw, height / ch, 1),
	}
}

function clamp(v: number, min: number, max: number): number {
	return v < min ? min : v > max ? max : v
}
