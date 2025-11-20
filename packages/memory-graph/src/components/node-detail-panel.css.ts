import { style } from "@vanilla-extract/css";
import { themeContract } from "../styles/theme.css";

/**
 * Main container (positioned absolutely)
 * Highest z-index so it appears above everything when open
 */
export const container = style({
	position: "absolute",
	width: "20rem", // w-80 = 320px = 20rem
	borderRadius: themeContract.radii.xl,
	overflow: "hidden",
	zIndex: 40, // Highest priority - always on top when open
	maxHeight: "calc(100vh - 2rem)", // Leave some breathing room
	top: themeContract.space[4],
	right: themeContract.space[4],

	// Add shadow for depth
	boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)",
});

/**
 * Content wrapper with scrolling
 */
export const content = style({
	position: "relative",
	zIndex: 10,
	padding: themeContract.space[4],
	overflowY: "auto",
	maxHeight: "80vh",
});

/**
 * Header section
 */
export const header = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	marginBottom: themeContract.space[3],
});

export const headerLeft = style({
	display: "flex",
	alignItems: "center",
	gap: themeContract.space[2],
});

export const headerIcon = style({
	width: "1.25rem",
	height: "1.25rem",
	color: themeContract.colors.text.secondary,
});

export const headerIconMemory = style({
	width: "1.25rem",
	height: "1.25rem",
	color: "rgb(96, 165, 250)", // blue-400
});

export const closeButton = style({
	height: "32px",
	width: "32px",
	padding: 0,
	color: themeContract.colors.text.secondary,

	selectors: {
		"&:hover": {
			color: themeContract.colors.text.primary,
		},
	},
});

export const closeIcon = style({
	width: "1rem",
	height: "1rem",
});

/**
 * Content sections
 */
export const sections = style({
	display: "flex",
	flexDirection: "column",
	gap: themeContract.space[3],
});

export const section = style({});

export const sectionLabel = style({
	fontSize: themeContract.typography.fontSize.xs,
	color: themeContract.colors.text.muted,
	textTransform: "uppercase",
	letterSpacing: "0.05em",
});

export const sectionValue = style({
	fontSize: themeContract.typography.fontSize.sm,
	color: themeContract.colors.text.secondary,
	marginTop: themeContract.space[1],
});

export const sectionValueTruncated = style({
	fontSize: themeContract.typography.fontSize.sm,
	color: themeContract.colors.text.secondary,
	marginTop: themeContract.space[1],
	overflow: "hidden",
	display: "-webkit-box",
	WebkitLineClamp: 3,
	WebkitBoxOrient: "vertical",
});

export const link = style({
	fontSize: themeContract.typography.fontSize.sm,
	color: "rgb(129, 140, 248)", // indigo-400
	marginTop: themeContract.space[1],
	display: "flex",
	alignItems: "center",
	gap: themeContract.space[1],
	textDecoration: "none",
	transition: themeContract.transitions.normal,

	selectors: {
		"&:hover": {
			color: "rgb(165, 180, 252)", // indigo-300
		},
	},
});

export const linkIcon = style({
	width: "0.75rem",
	height: "0.75rem",
});

export const badge = style({
	marginTop: themeContract.space[2],
});

export const expiryText = style({
	fontSize: themeContract.typography.fontSize.xs,
	color: themeContract.colors.text.muted,
	marginTop: themeContract.space[1],
});

/**
 * Footer section (metadata)
 */
export const footer = style({
	paddingTop: themeContract.space[2],
	borderTop: "1px solid rgba(71, 85, 105, 0.5)", // slate-700/50
});

export const metadata = style({
	display: "flex",
	alignItems: "center",
	gap: themeContract.space[4],
	fontSize: themeContract.typography.fontSize.xs,
	color: themeContract.colors.text.muted,
});

export const metadataItem = style({
	display: "flex",
	alignItems: "center",
	gap: themeContract.space[1],
});

export const metadataIcon = style({
	width: "0.75rem",
	height: "0.75rem",
});
