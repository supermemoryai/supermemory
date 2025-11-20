import { style } from "@vanilla-extract/css";
import { themeContract } from "../styles/theme.css";
import { animations } from "../styles";

/**
 * Loading indicator container
 * Positioned top-left, below spaces dropdown
 */
export const loadingContainer = style({
	position: "absolute",
	zIndex: 30, // High priority so it's visible when loading
	borderRadius: themeContract.radii.xl,
	overflow: "hidden",
	top: "5.5rem", // Below spaces dropdown (~88px)
	left: themeContract.space[4],
});

/**
 * Content wrapper
 */
export const loadingContent = style({
	position: "relative",
	zIndex: 10,
	color: themeContract.colors.text.secondary,
	paddingLeft: themeContract.space[4],
	paddingRight: themeContract.space[4],
	paddingTop: themeContract.space[3],
	paddingBottom: themeContract.space[3],
});

/**
 * Flex container for icon and text
 */
export const loadingFlex = style({
	display: "flex",
	alignItems: "center",
	gap: themeContract.space[2],
});

/**
 * Spinning icon
 */
export const loadingIcon = style({
	width: "1rem",
	height: "1rem",
	animation: `${animations.spin} 1s linear infinite`,
	color: themeContract.colors.memory.border,
});

/**
 * Loading text
 */
export const loadingText = style({
	fontSize: themeContract.typography.fontSize.sm,
});
