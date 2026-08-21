/**
 * Pure transform math for the pan/zoom image viewer.
 *
 * The image is centered in its container and rendered with
 * `transform: translate(x, y) scale(scale)` (transform-origin: center). All
 * pointer coordinates here are relative to the container's center (so 0,0 is the
 * middle), which keeps the zoom-to-cursor formula symmetric and easy to test.
 */

export interface ImageTransform {
	scale: number
	x: number
	y: number
}

export const IDENTITY_TRANSFORM: ImageTransform = { scale: 1, x: 0, y: 0 }

export const MIN_SCALE = 1
export const MAX_SCALE = 8

export function clampScale(
	scale: number,
	min = MIN_SCALE,
	max = MAX_SCALE,
): number {
	return scale < min ? min : scale > max ? max : scale
}

/**
 * Zoom by `factor` while keeping the point under the cursor stationary.
 *
 * `pointerX`/`pointerY` are relative to the container center. When the result
 * lands back at the minimum scale the image is recentered, so a full zoom-out
 * always returns to a clean centered view.
 */
export function zoomAtPoint(
	transform: ImageTransform,
	factor: number,
	pointerX: number,
	pointerY: number,
	min = MIN_SCALE,
	max = MAX_SCALE,
): ImageTransform {
	const newScale = clampScale(transform.scale * factor, min, max)
	if (newScale === transform.scale) return transform
	if (newScale <= min) return { scale: min, x: 0, y: 0 }

	const ratio = newScale / transform.scale
	return {
		scale: newScale,
		x: pointerX - (pointerX - transform.x) * ratio,
		y: pointerY - (pointerY - transform.y) * ratio,
	}
}

/**
 * Keep the (scaled) image overlapping the container so it can't be dragged
 * entirely off-screen. The image never extends past the container at
 * `scale === 1`, so the allowed travel on each axis is `(scale - 1) * half`.
 */
export function clampTranslation(
	transform: ImageTransform,
	containerWidth: number,
	containerHeight: number,
): ImageTransform {
	const maxX = Math.max(0, ((transform.scale - 1) * containerWidth) / 2)
	const maxY = Math.max(0, ((transform.scale - 1) * containerHeight) / 2)
	const clamp = (v: number, m: number) => (v < -m ? -m : v > m ? m : v)
	return {
		scale: transform.scale,
		x: clamp(transform.x, maxX),
		y: clamp(transform.y, maxY),
	}
}

/** Apply a drag delta (in pixels) and re-clamp inside the container. */
export function panBy(
	transform: ImageTransform,
	dx: number,
	dy: number,
	containerWidth: number,
	containerHeight: number,
): ImageTransform {
	return clampTranslation(
		{ scale: transform.scale, x: transform.x + dx, y: transform.y + dy },
		containerWidth,
		containerHeight,
	)
}

export function isZoomed(transform: ImageTransform): boolean {
	return transform.scale > MIN_SCALE
}

/** CSS transform string for the image element. */
export function toCssTransform(transform: ImageTransform): string {
	return `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
}
