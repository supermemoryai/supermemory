/**
 * Aspect-ratio presets for the graph share card, sized for where people post
 * screenshots. Pure so the mapping can be unit tested.
 */

export type ShareAspect = "post" | "square" | "story"

export interface ShareAspectPreset {
	id: ShareAspect
	label: string
	/** CSS `aspect-ratio` value (width / height). */
	ratio: string
	/** Width / height as a number, for any numeric layout math. */
	value: number
}

const POST_PRESET: ShareAspectPreset = {
	id: "post",
	label: "Post",
	ratio: "674 / 505",
	value: 674 / 505,
}

export const SHARE_ASPECT_PRESETS: readonly ShareAspectPreset[] = [
	POST_PRESET,
	{ id: "square", label: "Square", ratio: "1 / 1", value: 1 },
	{ id: "story", label: "Story", ratio: "9 / 16", value: 9 / 16 },
]

export function getShareAspectPreset(aspect: ShareAspect): ShareAspectPreset {
	return SHARE_ASPECT_PRESETS.find((p) => p.id === aspect) ?? POST_PRESET
}

/**
 * A max-height (in dvh) that keeps the preview inside the dialog. Tall (story)
 * ratios need to be shorter than wide ones so they don't overflow.
 */
export function shareAspectMaxHeightDvh(aspect: ShareAspect): number {
	return aspect === "story" ? 60 : 48
}
