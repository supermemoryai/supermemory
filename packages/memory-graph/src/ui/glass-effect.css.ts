import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { themeContract } from "../styles/theme.css";

/**
 * Glass menu effect container
 */
export const glassMenuContainer = style({
	position: "absolute",
	inset: 0,
});

/**
 * Glass menu effect with customizable border radius
 */
export const glassMenuEffect = recipe({
	base: {
		position: "absolute",
		inset: 0,
		backdropFilter: "blur(12px)",
		WebkitBackdropFilter: "blur(12px)",
		background: "rgba(255, 255, 255, 0.05)",
		border: `1px solid ${themeContract.colors.document.border}`,
	},

	variants: {
		rounded: {
			none: {
				borderRadius: themeContract.radii.none,
			},
			sm: {
				borderRadius: themeContract.radii.sm,
			},
			md: {
				borderRadius: themeContract.radii.md,
			},
			lg: {
				borderRadius: themeContract.radii.lg,
			},
			xl: {
				borderRadius: themeContract.radii.xl,
			},
			"2xl": {
				borderRadius: themeContract.radii["2xl"],
			},
			"3xl": {
				borderRadius: "1.5rem", // Tailwind's rounded-3xl
			},
			full: {
				borderRadius: themeContract.radii.full,
			},
		},
	},

	defaultVariants: {
		rounded: "3xl",
	},
});
