import { style } from "@vanilla-extract/css";
import { themeContract } from "../styles/theme.css";

/**
 * Responsive heading style with bold weight
 */
export const headingH3Bold = style({
	fontSize: "0.625rem", // 10px
	fontWeight: themeContract.typography.fontWeight.bold,
	lineHeight: "28px",
	letterSpacing: "-0.4px",

	"@media": {
		"screen and (min-width: 640px)": {
			fontSize: themeContract.typography.fontSize.xs, // 12px
		},
		"screen and (min-width: 768px)": {
			fontSize: themeContract.typography.fontSize.sm, // 14px
		},
		"screen and (min-width: 1024px)": {
			fontSize: themeContract.typography.fontSize.base, // 16px
		},
	},
});
