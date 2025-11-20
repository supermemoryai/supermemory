import { style } from "@vanilla-extract/css";
import { themeContract } from "../styles/theme.css";

/**
 * Dropdown container
 */
export const container = style({
	position: "relative",
});

/**
 * Main trigger button with gradient border effect
 */
export const trigger = style({
	display: "flex",
	alignItems: "center",
	gap: themeContract.space[3],
	paddingLeft: themeContract.space[4],
	paddingRight: themeContract.space[4],
	paddingTop: themeContract.space[3],
	paddingBottom: themeContract.space[3],
	borderRadius: themeContract.radii.xl,
	border: "2px solid transparent",
	backgroundImage:
		"linear-gradient(#1a1f29, #1a1f29), linear-gradient(150.262deg, #A4E8F5 0%, #267FFA 26%, #464646 49%, #747474 70%, #A4E8F5 100%)",
	backgroundOrigin: "border-box",
	backgroundClip: "padding-box, border-box",
	boxShadow: "inset 0px 2px 1px rgba(84, 84, 84, 0.15)",
	backdropFilter: "blur(12px)",
	WebkitBackdropFilter: "blur(12px)",
	transition: themeContract.transitions.normal,
	cursor: "pointer",
	minWidth: "15rem", // min-w-60 = 240px = 15rem

	selectors: {
		"&:hover": {
			boxShadow: "inset 0px 2px 1px rgba(84, 84, 84, 0.25)",
		},
	},
});

export const triggerIcon = style({
	width: "1rem",
	height: "1rem",
	color: themeContract.colors.text.secondary,
});

export const triggerContent = style({
	flex: 1,
	textAlign: "left",
});

export const triggerLabel = style({
	fontSize: themeContract.typography.fontSize.sm,
	color: themeContract.colors.text.secondary,
	fontWeight: themeContract.typography.fontWeight.medium,
});

export const triggerSubtext = style({
	fontSize: themeContract.typography.fontSize.xs,
	color: themeContract.colors.text.muted,
});

export const triggerChevron = style({
	width: "1rem",
	height: "1rem",
	color: themeContract.colors.text.secondary,
	transition: "transform 200ms ease",
});

export const triggerChevronOpen = style({
	transform: "rotate(180deg)",
});

/**
 * Dropdown menu
 */
export const dropdown = style({
	position: "absolute",
	top: "100%",
	left: 0,
	right: 0,
	marginTop: themeContract.space[2],
	background: "rgba(15, 23, 42, 0.95)", // slate-900/95
	backdropFilter: "blur(12px)",
	WebkitBackdropFilter: "blur(12px)",
	border: "1px solid rgba(71, 85, 105, 0.4)", // slate-700/40
	borderRadius: themeContract.radii.xl,
	boxShadow:
		"0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", // shadow-xl
	zIndex: 20,
	overflow: "hidden",
});

export const dropdownInner = style({
	padding: themeContract.space[1],
});

/**
 * Dropdown items
 */
const dropdownItemBase = style({
	width: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	paddingLeft: themeContract.space[3],
	paddingRight: themeContract.space[3],
	paddingTop: themeContract.space[2],
	paddingBottom: themeContract.space[2],
	borderRadius: themeContract.radii.lg,
	textAlign: "left",
	transition: themeContract.transitions.normal,
	cursor: "pointer",
	border: "none",
	background: "transparent",
});

export const dropdownItem = style([
	dropdownItemBase,
	{
		color: themeContract.colors.text.secondary,

		selectors: {
			"&:hover": {
				backgroundColor: "rgba(51, 65, 85, 0.5)", // slate-700/50
			},
		},
	},
]);

export const dropdownItemActive = style([
	dropdownItemBase,
	{
		backgroundColor: "rgba(59, 130, 246, 0.2)", // blue-500/20
		color: "rgb(147, 197, 253)", // blue-300
	},
]);

export const dropdownItemLabel = style({
	fontSize: themeContract.typography.fontSize.sm,
	flex: 1,
});

export const dropdownItemLabelTruncate = style({
	fontSize: themeContract.typography.fontSize.sm,
	flex: 1,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});

export const dropdownItemBadge = style({
	backgroundColor: "rgba(51, 65, 85, 0.5)", // slate-700/50
	color: themeContract.colors.text.secondary,
	fontSize: themeContract.typography.fontSize.xs,
	marginLeft: themeContract.space[2],
});
