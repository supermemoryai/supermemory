import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { style, globalStyle } from "@vanilla-extract/css";
import { themeContract } from "../styles/theme.css";

/**
 * Base styles for SVG icons inside badges
 */
export const badgeIcon = style({
	width: "0.75rem",
	height: "0.75rem",
	pointerEvents: "none",
});

/**
 * Badge recipe with variants
 * Replaces CVA-based badge variants with vanilla-extract recipes
 */
const badgeBase = style({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	borderRadius: themeContract.radii.md,
	border: "1px solid",
	paddingLeft: themeContract.space[2],
	paddingRight: themeContract.space[2],
	paddingTop: "0.125rem",
	paddingBottom: "0.125rem",
	fontSize: themeContract.typography.fontSize.xs,
	fontWeight: themeContract.typography.fontWeight.medium,
	width: "fit-content",
	whiteSpace: "nowrap",
	flexShrink: 0,
	gap: themeContract.space[1],
	transition: "color 200ms ease-in-out, box-shadow 200ms ease-in-out",
	overflow: "hidden",

	selectors: {
		"&:focus-visible": {
			borderColor: themeContract.colors.accent.primary,
			boxShadow: `0 0 0 2px ${themeContract.colors.accent.primary}33`,
		},
		"&[aria-invalid='true']": {
			boxShadow: `0 0 0 2px ${themeContract.colors.status.forgotten}33`,
			borderColor: themeContract.colors.status.forgotten,
		},
	},
});

// Global style for SVG children
globalStyle(`${badgeBase} > svg`, {
	width: "0.75rem",
	height: "0.75rem",
	pointerEvents: "none",
});

export const badge = recipe({
	base: badgeBase,

	variants: {
		variant: {
			default: {
				borderColor: "transparent",
				backgroundColor: themeContract.colors.accent.primary,
				color: themeContract.colors.text.primary,

				selectors: {
					"a&:hover": {
						opacity: 0.9,
					},
				},
			},

			secondary: {
				borderColor: "transparent",
				backgroundColor: themeContract.colors.background.secondary,
				color: themeContract.colors.text.secondary,

				selectors: {
					"a&:hover": {
						backgroundColor: themeContract.colors.background.accent,
					},
				},
			},

			destructive: {
				borderColor: "transparent",
				backgroundColor: themeContract.colors.status.forgotten,
				color: themeContract.colors.text.primary,

				selectors: {
					"a&:hover": {
						opacity: 0.9,
					},
					"&:focus-visible": {
						boxShadow: `0 0 0 2px ${themeContract.colors.status.forgotten}33`,
					},
				},
			},

			outline: {
				borderColor: themeContract.colors.document.border,
				backgroundColor: "transparent",
				color: themeContract.colors.text.primary,

				selectors: {
					"a&:hover": {
						backgroundColor: themeContract.colors.document.primary,
					},
				},
			},
		},
	},

	defaultVariants: {
		variant: "default",
	},
});

export type BadgeVariants = RecipeVariants<typeof badge>;
