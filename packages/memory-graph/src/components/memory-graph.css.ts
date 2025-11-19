import { style } from "@vanilla-extract/css";
import { themeContract } from "../styles/theme.css";

/**
 * Error state container
 */
export const errorContainer = style({
	height: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	backgroundColor: themeContract.colors.background.primary,
});

export const errorCard = style({
	borderRadius: themeContract.radii.xl,
	overflow: "hidden",
});

export const errorContent = style({
	position: "relative",
	zIndex: 10,
	color: themeContract.colors.text.secondary,
	paddingLeft: themeContract.space[6],
	paddingRight: themeContract.space[6],
	paddingTop: themeContract.space[4],
	paddingBottom: themeContract.space[4],
});

/**
 * Main graph container
 * Position relative so absolutely positioned children position relative to this container
 */
export const mainContainer = style({
	position: "relative",
	height: "100%",
	borderRadius: themeContract.radii.xl,
	overflow: "hidden",
	backgroundColor: themeContract.colors.background.primary,
});

/**
 * Spaces selector positioning
 * Top-left corner, below most overlays
 */
export const spacesSelectorContainer = style({
	position: "absolute",
	top: themeContract.space[4],
	left: themeContract.space[4],
	zIndex: 15, // Above base elements, below loading/panels
});

/**
 * Graph canvas container
 */
export const graphContainer = style({
	width: "100%",
	height: "100%",
	position: "relative",
	overflow: "hidden",
	touchAction: "none",
	userSelect: "none",
	WebkitUserSelect: "none",
});

/**
 * Navigation controls positioning
 * Bottom-left corner
 */
export const navControlsContainer = style({
	position: "absolute",
	bottom: themeContract.space[4],
	left: themeContract.space[4],
	zIndex: 15, // Same level as spaces dropdown
});
