/**
 * Pure geometry for the graph minimap.
 *
 * The minimap projects the whole node cloud into a small fixed-size box and
 * draws a rectangle for the region the main canvas is currently showing.
 * Everything here is side-effect free so it can be unit tested without a canvas.
 */

export interface MinimapBounds {
	minX: number
	minY: number
	maxX: number
	maxY: number
}

export interface MinimapLayout {
	/** World units -> minimap pixels. */
	scale: number
	/** Added after scaling to place the content inside the padded box. */
	offsetX: number
	offsetY: number
	width: number
	height: number
}

/** A structural subset of ViewportState so the math stays canvas-agnostic. */
export interface MinimapViewport {
	panX: number
	panY: number
	zoom: number
}

export interface MinimapRect {
	x: number
	y: number
	width: number
	height: number
}

/**
 * Fit the world `bounds` into a `width` x `height` box (minus `padding` on each
 * side), preserving aspect ratio and centering the content.
 */
export function computeMinimapLayout(
	bounds: MinimapBounds,
	width: number,
	height: number,
	padding = 8,
): MinimapLayout {
	const worldWidth = Math.max(bounds.maxX - bounds.minX, 1)
	const worldHeight = Math.max(bounds.maxY - bounds.minY, 1)
	const availWidth = Math.max(width - padding * 2, 1)
	const availHeight = Math.max(height - padding * 2, 1)

	const scale = Math.min(availWidth / worldWidth, availHeight / worldHeight)

	const contentWidth = worldWidth * scale
	const contentHeight = worldHeight * scale
	const offsetX =
		padding + (availWidth - contentWidth) / 2 - bounds.minX * scale
	const offsetY =
		padding + (availHeight - contentHeight) / 2 - bounds.minY * scale

	return { scale, offsetX, offsetY, width, height }
}

/** World point -> minimap pixel. */
export function worldToMinimap(
	worldX: number,
	worldY: number,
	layout: MinimapLayout,
): { x: number; y: number } {
	return {
		x: layout.offsetX + worldX * layout.scale,
		y: layout.offsetY + worldY * layout.scale,
	}
}

/** Minimap pixel -> world point (inverse of {@link worldToMinimap}). */
export function minimapToWorld(
	minimapX: number,
	minimapY: number,
	layout: MinimapLayout,
): { x: number; y: number } {
	return {
		x: (minimapX - layout.offsetX) / layout.scale,
		y: (minimapY - layout.offsetY) / layout.scale,
	}
}

/**
 * The rectangle, in minimap pixels, covering the world region currently visible
 * on a `canvasWidth` x `canvasHeight` main canvas. May extend past the minimap
 * box when the user has zoomed out past the node cloud; callers clip as needed.
 */
export function computeViewportRect(
	viewport: MinimapViewport,
	canvasWidth: number,
	canvasHeight: number,
	layout: MinimapLayout,
): MinimapRect {
	const zoom = viewport.zoom || 1
	const topLeftWorld = {
		x: (0 - viewport.panX) / zoom,
		y: (0 - viewport.panY) / zoom,
	}
	const bottomRightWorld = {
		x: (canvasWidth - viewport.panX) / zoom,
		y: (canvasHeight - viewport.panY) / zoom,
	}

	const topLeft = worldToMinimap(topLeftWorld.x, topLeftWorld.y, layout)
	const bottomRight = worldToMinimap(
		bottomRightWorld.x,
		bottomRightWorld.y,
		layout,
	)

	return {
		x: topLeft.x,
		y: topLeft.y,
		width: bottomRight.x - topLeft.x,
		height: bottomRight.y - topLeft.y,
	}
}

/** Clamp a value into the inclusive [min, max] range. */
export function clampToRange(value: number, min: number, max: number): number {
	return value < min ? min : value > max ? max : value
}
