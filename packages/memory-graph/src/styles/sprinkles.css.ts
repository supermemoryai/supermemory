import { defineProperties, createSprinkles } from "@vanilla-extract/sprinkles";
import { themeContract } from "./theme.css";

/**
 * Responsive conditions for mobile-first design
 */
const responsiveProperties = defineProperties({
	conditions: {
		mobile: {},
		tablet: { "@media": "screen and (min-width: 768px)" },
		desktop: { "@media": "screen and (min-width: 1024px)" },
	},
	defaultCondition: "mobile",
	properties: {
		// Display
		display: ["none", "flex", "block", "inline", "inline-flex", "grid"],

		// Flexbox
		flexDirection: ["row", "column", "row-reverse", "column-reverse"],
		justifyContent: [
			"stretch",
			"flex-start",
			"center",
			"flex-end",
			"space-between",
			"space-around",
			"space-evenly",
		],
		alignItems: ["stretch", "flex-start", "center", "flex-end", "baseline"],
		flexWrap: ["nowrap", "wrap", "wrap-reverse"],
		gap: themeContract.space,

		// Spacing
		padding: themeContract.space,
		paddingTop: themeContract.space,
		paddingBottom: themeContract.space,
		paddingLeft: themeContract.space,
		paddingRight: themeContract.space,
		margin: themeContract.space,
		marginTop: themeContract.space,
		marginBottom: themeContract.space,
		marginLeft: themeContract.space,
		marginRight: themeContract.space,

		// Sizing
		width: {
			auto: "auto",
			full: "100%",
			screen: "100vw",
			min: "min-content",
			max: "max-content",
			fit: "fit-content",
		},
		height: {
			auto: "auto",
			full: "100%",
			screen: "100vh",
			min: "min-content",
			max: "max-content",
			fit: "fit-content",
		},
		minWidth: {
			0: "0",
			full: "100%",
			min: "min-content",
			max: "max-content",
			fit: "fit-content",
		},
		minHeight: {
			0: "0",
			full: "100%",
			screen: "100vh",
		},
		maxWidth: {
			none: "none",
			full: "100%",
			min: "min-content",
			max: "max-content",
			fit: "fit-content",
		},
		maxHeight: {
			none: "none",
			full: "100%",
			screen: "100vh",
		},

		// Position
		position: ["static", "relative", "absolute", "fixed", "sticky"],
		top: themeContract.space,
		bottom: themeContract.space,
		left: themeContract.space,
		right: themeContract.space,
		inset: themeContract.space,

		// Border radius
		borderRadius: themeContract.radii,
		borderTopLeftRadius: themeContract.radii,
		borderTopRightRadius: themeContract.radii,
		borderBottomLeftRadius: themeContract.radii,
		borderBottomRightRadius: themeContract.radii,

		// Text
		fontSize: themeContract.typography.fontSize,
		fontWeight: themeContract.typography.fontWeight,
		lineHeight: themeContract.typography.lineHeight,
		textAlign: ["left", "center", "right", "justify"],

		// Overflow
		overflow: ["visible", "hidden", "scroll", "auto"],
		overflowX: ["visible", "hidden", "scroll", "auto"],
		overflowY: ["visible", "hidden", "scroll", "auto"],

		// Z-index
		zIndex: themeContract.zIndex,

		// Cursor
		cursor: ["auto", "pointer", "not-allowed", "grab", "grabbing"],

		// Pointer events
		pointerEvents: ["auto", "none"],

		// User select
		userSelect: ["auto", "none", "text", "all"],
	},
});

/**
 * Color properties (non-responsive)
 */
const colorProperties = defineProperties({
	properties: {
		color: {
			primary: themeContract.colors.text.primary,
			secondary: themeContract.colors.text.secondary,
			muted: themeContract.colors.text.muted,
		},
		backgroundColor: {
			transparent: "transparent",
			primary: themeContract.colors.background.primary,
			secondary: themeContract.colors.background.secondary,
			accent: themeContract.colors.background.accent,
			documentPrimary: themeContract.colors.document.primary,
			documentSecondary: themeContract.colors.document.secondary,
			documentAccent: themeContract.colors.document.accent,
			memoryPrimary: themeContract.colors.memory.primary,
			memorySecondary: themeContract.colors.memory.secondary,
			memoryAccent: themeContract.colors.memory.accent,
		},
		borderColor: {
			transparent: "transparent",
			documentBorder: themeContract.colors.document.border,
			memoryBorder: themeContract.colors.memory.border,
		},
	},
});

/**
 * Border properties
 */
const borderProperties = defineProperties({
	properties: {
		borderWidth: {
			0: "0",
			1: "1px",
			2: "2px",
			4: "4px",
		},
		borderStyle: ["none", "solid", "dashed", "dotted"],
	},
});

/**
 * Opacity properties
 */
const opacityProperties = defineProperties({
	properties: {
		opacity: {
			0: "0",
			10: "0.1",
			20: "0.2",
			30: "0.3",
			40: "0.4",
			50: "0.5",
			60: "0.6",
			70: "0.7",
			80: "0.8",
			90: "0.9",
			100: "1",
		},
	},
});

/**
 * Combined sprinkles system
 * Provides Tailwind-like utility classes with full type safety
 */
export const sprinkles = createSprinkles(
	responsiveProperties,
	colorProperties,
	borderProperties,
	opacityProperties,
);

export type Sprinkles = Parameters<typeof sprinkles>[0];
