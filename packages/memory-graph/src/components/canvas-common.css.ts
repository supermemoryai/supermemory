import { style } from "@vanilla-extract/css";

/**
 * Canvas wrapper/container that fills its parent
 * Used by both graph-canvas and graph-webgl-canvas
 */
export const canvasWrapper = style({
	position: "absolute",
	inset: 0,
});
