import { style, styleVariants } from "@vanilla-extract/css";
import { themeContract } from "./theme.css";

/**
 * Base glass-morphism effect
 * Provides the signature frosted glass look
 */
const glassBase = style({
	backdropFilter: "blur(12px)",
	WebkitBackdropFilter: "blur(12px)",
	border: `1px solid ${themeContract.colors.document.border}`,
	borderRadius: themeContract.radii.lg,
});

/**
 * Glass effect variants
 */
export const glass = styleVariants({
	/**
	 * Light glass effect - subtle background
	 */
	light: [
		glassBase,
		{
			background: "rgba(255, 255, 255, 0.05)",
		},
	],

	/**
	 * Medium glass effect - more visible
	 */
	medium: [
		glassBase,
		{
			background: "rgba(255, 255, 255, 0.08)",
		},
	],

	/**
	 * Dark glass effect - prominent
	 */
	dark: [
		glassBase,
		{
			background: "rgba(15, 20, 25, 0.8)",
			backdropFilter: "blur(20px)",
			WebkitBackdropFilter: "blur(20px)",
		},
	],
});

/**
 * Glass panel styles for larger containers
 */
export const glassPanel = styleVariants({
	default: {
		background: "rgba(15, 20, 25, 0.8)",
		backdropFilter: "blur(20px)",
		WebkitBackdropFilter: "blur(20px)",
		border: `1px solid ${themeContract.colors.document.border}`,
		borderRadius: themeContract.radii.xl,
	},
	bordered: {
		background: "rgba(15, 20, 25, 0.8)",
		backdropFilter: "blur(20px)",
		WebkitBackdropFilter: "blur(20px)",
		border: `2px solid ${themeContract.colors.document.border}`,
		borderRadius: themeContract.radii.xl,
	},
});

/**
 * Focus ring styles for accessibility
 */
export const focusRing = style({
	outline: "none",
	selectors: {
		"&:focus-visible": {
			outline: `2px solid ${themeContract.colors.accent.primary}`,
			outlineOffset: "2px",
		},
	},
});

/**
 * Transition presets
 */
export const transition = styleVariants({
	fast: {
		transition: themeContract.transitions.fast,
	},
	normal: {
		transition: themeContract.transitions.normal,
	},
	slow: {
		transition: themeContract.transitions.slow,
	},
	all: {
		transition: `all ${themeContract.transitions.normal}`,
	},
	colors: {
		transition: `background-color ${themeContract.transitions.normal}, color ${themeContract.transitions.normal}, border-color ${themeContract.transitions.normal}`,
	},
	transform: {
		transition: `transform ${themeContract.transitions.normal}`,
	},
});

/**
 * Hover glow effect
 */
export const hoverGlow = style({
	position: "relative",
	transition: themeContract.transitions.normal,
	selectors: {
		"&:hover": {
			boxShadow: `0 0 20px ${themeContract.colors.document.glow}`,
		},
	},
});
