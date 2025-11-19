import { style } from "@vanilla-extract/css";
import { themeContract } from "../styles/theme.css";

/**
 * Navigation controls container
 */
export const navContainer = style({
	display: "flex",
	flexDirection: "column",
	gap: themeContract.space[1],
});

/**
 * Base button styles for navigation controls
 */
const navButtonBase = style({
	backgroundColor: "rgba(0, 0, 0, 0.2)",
	backdropFilter: "blur(8px)",
	WebkitBackdropFilter: "blur(8px)",
	border: `1px solid rgba(255, 255, 255, 0.1)`,
	borderRadius: themeContract.radii.lg,
	padding: themeContract.space[2],
	color: "rgba(255, 255, 255, 0.7)",
	fontSize: themeContract.typography.fontSize.xs,
	fontWeight: themeContract.typography.fontWeight.medium,
	minWidth: "64px",
	cursor: "pointer",
	transition: themeContract.transitions.normal,

	selectors: {
		"&:hover": {
			backgroundColor: "rgba(0, 0, 0, 0.3)",
			borderColor: "rgba(255, 255, 255, 0.2)",
			color: "rgba(255, 255, 255, 1)",
		},
	},
});

/**
 * Standard navigation button
 */
export const navButton = navButtonBase;

/**
 * Zoom controls container
 */
export const zoomContainer = style({
	display: "flex",
	flexDirection: "column",
});

/**
 * Zoom in button (top rounded)
 */
export const zoomInButton = style([
	navButtonBase,
	{
		borderTopLeftRadius: themeContract.radii.lg,
		borderTopRightRadius: themeContract.radii.lg,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		borderBottom: 0,
	},
]);

/**
 * Zoom out button (bottom rounded)
 */
export const zoomOutButton = style([
	navButtonBase,
	{
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
		borderBottomLeftRadius: themeContract.radii.lg,
		borderBottomRightRadius: themeContract.radii.lg,
	},
]);
