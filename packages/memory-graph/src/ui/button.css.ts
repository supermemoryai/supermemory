import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { style } from "@vanilla-extract/css";
import { themeContract } from "../styles/theme.css";

/**
 * Base styles for SVG icons inside buttons
 */
export const buttonIcon = style({
	pointerEvents: "none",
	flexShrink: 0,
	selectors: {
		"&:not([class*='size-'])": {
			width: "1rem",
			height: "1rem",
		},
	},
});

/**
 * Button recipe with variants
 * Replaces CVA-based button variants with vanilla-extract recipes
 */
export const button = recipe({
	base: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		gap: themeContract.space[2],
		whiteSpace: "nowrap",
		borderRadius: themeContract.radii.md,
		fontSize: themeContract.typography.fontSize.sm,
		fontWeight: themeContract.typography.fontWeight.medium,
		transition: themeContract.transitions.normal,
		flexShrink: 0,
		outline: "none",
		border: "1px solid transparent",
		cursor: "pointer",

		// SVG sizing
		selectors: {
			[`&:has(${buttonIcon})`]: {
				// Buttons with icons get adjusted padding
			},
			"&:disabled": {
				pointerEvents: "none",
				opacity: 0.5,
			},
			"&:focus-visible": {
				borderColor: themeContract.colors.accent.primary,
				boxShadow: `0 0 0 2px ${themeContract.colors.accent.primary}33`,
			},
			"&[aria-invalid='true']": {
				boxShadow: `0 0 0 2px ${themeContract.colors.status.forgotten}`,
				borderColor: themeContract.colors.status.forgotten,
			},
		},
	},

	variants: {
		variant: {
			default: {
				backgroundColor: themeContract.colors.accent.primary,
				color: themeContract.colors.text.primary,
				boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",

				selectors: {
					"&:hover:not(:disabled)": {
						backgroundColor: themeContract.colors.accent.secondary,
					},
				},
			},

			destructive: {
				backgroundColor: themeContract.colors.status.forgotten,
				color: themeContract.colors.text.primary,
				boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",

				selectors: {
					"&:hover:not(:disabled)": {
						opacity: 0.9,
					},
					"&:focus-visible": {
						boxShadow: `0 0 0 2px ${themeContract.colors.status.forgotten}33`,
					},
				},
			},

			outline: {
				backgroundColor: themeContract.colors.background.primary,
				borderColor: themeContract.colors.document.border,
				color: themeContract.colors.text.primary,
				boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",

				selectors: {
					"&:hover:not(:disabled)": {
						backgroundColor: themeContract.colors.document.primary,
					},
				},
			},

			secondary: {
				backgroundColor: themeContract.colors.background.secondary,
				color: themeContract.colors.text.secondary,
				boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",

				selectors: {
					"&:hover:not(:disabled)": {
						backgroundColor: themeContract.colors.background.accent,
					},
				},
			},

			ghost: {
				backgroundColor: "transparent",
				color: themeContract.colors.text.primary,

				selectors: {
					"&:hover:not(:disabled)": {
						backgroundColor: themeContract.colors.document.primary,
					},
				},
			},

			link: {
				backgroundColor: "transparent",
				color: themeContract.colors.accent.primary,
				textDecoration: "underline",
				textUnderlineOffset: "4px",

				selectors: {
					"&:hover:not(:disabled)": {
						textDecoration: "underline",
					},
				},
			},

			settingsNav: {
				cursor: "pointer",
				borderRadius: themeContract.radii.sm,
				backgroundColor: "transparent",
				color: themeContract.colors.text.primary,
			},
		},

		size: {
			default: {
				height: "36px",
				paddingLeft: themeContract.space[4],
				paddingRight: themeContract.space[4],
				paddingTop: themeContract.space[2],
				paddingBottom: themeContract.space[2],

				selectors: {
					"&:has(svg)": {
						paddingLeft: themeContract.space[3],
						paddingRight: themeContract.space[3],
					},
				},
			},

			sm: {
				height: "32px",
				borderRadius: themeContract.radii.md,
				gap: themeContract.space[1],
				paddingLeft: themeContract.space[3],
				paddingRight: themeContract.space[3],

				selectors: {
					"&:has(svg)": {
						paddingLeft: themeContract.space[2],
						paddingRight: themeContract.space[2],
					},
				},
			},

			lg: {
				height: "40px",
				borderRadius: themeContract.radii.md,
				paddingLeft: themeContract.space[6],
				paddingRight: themeContract.space[6],

				selectors: {
					"&:has(svg)": {
						paddingLeft: themeContract.space[4],
						paddingRight: themeContract.space[4],
					},
				},
			},

			icon: {
				width: "36px",
				height: "36px",
				padding: 0,
			},

			settingsNav: {
				height: "32px",
				gap: 0,
				padding: 0,
			},
		},
	},

	defaultVariants: {
		variant: "default",
		size: "default",
	},
});

export type ButtonVariants = RecipeVariants<typeof button>;
