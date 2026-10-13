// Pure, canvas-free geometry for the graph minimap.

export interface MinimapBounds {
	minX: number
	minY: number
	maxX: number
	maxY: number
}

export interface MinimapLayout {
	scale: number
	offsetX: number
	offsetY: number
	width: number
	height: number
}

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

// Can extend past the minimap box when zoomed out; callers clip.
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

export function clampToRange(value: number, min: number, max: number): number {
	return value < min ? min : value > max ? max : value
}
