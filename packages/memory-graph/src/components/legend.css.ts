import { style, styleVariants, globalStyle } from "@vanilla-extract/css"
import { themeContract } from "../styles/theme.css"

/**
 * Legend container base
 */
const legendContainerBase = style({
	position: "absolute",
	zIndex: 20, // Above most elements but below node detail panel
	borderRadius: themeContract.radii.xl,
	overflow: "hidden",
	width: "fit-content",
	height: "fit-content",
	maxHeight: "calc(100vh - 2rem)", // Prevent overflow
})

/**
 * Legend container variants for positioning
 * Console: Bottom-right (doesn't conflict with anything)
 * Consumer: Bottom-right (moved from top to avoid conflicts)
 */
export const legendContainer = styleVariants({
	consoleDesktop: [
		legendContainerBase,
		{
			bottom: themeContract.space[4],
			right: themeContract.space[4],
		},
	],
	consoleMobile: [
		legendContainerBase,
		{
			bottom: themeContract.space[4],
			right: themeContract.space[4],
			"@media": {
				"screen and (max-width: 767px)": {
					display: "none",
				},
			},
		},
	],
	consumerDesktop: [
		legendContainerBase,
		{
			// Changed from top to bottom to avoid overlap with node detail panel
			bottom: themeContract.space[4],
			right: themeContract.space[4],
		},
	],
	consumerMobile: [
		legendContainerBase,
		{
			bottom: themeContract.space[4],
			right: themeContract.space[4],
			"@media": {
				"screen and (max-width: 767px)": {
					display: "none",
				},
			},
		},
	],
})

/**
 * Mobile size variants
 */
export const mobileSize = styleVariants({
	expanded: {
		maxWidth: "20rem", // max-w-xs
	},
	collapsed: {
		width: "4rem", // w-16
		height: "3rem", // h-12
	},
})

/**
 * Legend content wrapper
 */
export const legendContent = style({
	position: "relative",
	zIndex: 10,
})

/**
 * Collapsed trigger button
 */
export const collapsedTrigger = style({
	width: "100%",
	height: "100%",
	padding: themeContract.space[2],
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	transition: themeContract.transitions.normal,

	selectors: {
		"&:hover": {
			backgroundColor: "rgba(255, 255, 255, 0.05)",
		},
	},
})

export const collapsedContent = style({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: themeContract.space[1],
})

export const collapsedText = style({
	fontSize: themeContract.typography.fontSize.xs,
	color: themeContract.colors.text.secondary,
	fontWeight: themeContract.typography.fontWeight.medium,
})

export const collapsedIcon = style({
	width: "0.75rem",
	height: "0.75rem",
	color: themeContract.colors.text.muted,
})

/**
 * Header
 */
export const legendHeader = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	paddingLeft: themeContract.space[4],
	paddingRight: themeContract.space[4],
	paddingTop: themeContract.space[3],
	paddingBottom: themeContract.space[3],
	borderBottom: "1px solid rgba(71, 85, 105, 0.5)", // slate-600/50
})

export const legendTitle = style({
	fontSize: themeContract.typography.fontSize.sm,
	fontWeight: themeContract.typography.fontWeight.medium,
	color: themeContract.colors.text.primary,
})

export const headerTrigger = style({
	padding: themeContract.space[1],
	borderRadius: themeContract.radii.sm,
	transition: themeContract.transitions.normal,

	selectors: {
		"&:hover": {
			backgroundColor: "rgba(255, 255, 255, 0.1)",
		},
	},
})

export const headerIcon = style({
	width: "1rem",
	height: "1rem",
	color: themeContract.colors.text.muted,
})

/**
 * Content sections
 */
export const sectionsContainer = style({
	fontSize: themeContract.typography.fontSize.xs,
	color: themeContract.colors.text.secondary,
	paddingLeft: themeContract.space[4],
	paddingRight: themeContract.space[4],
	paddingTop: themeContract.space[3],
	paddingBottom: themeContract.space[3],
})

export const sectionWrapper = style({
	marginTop: themeContract.space[3],
	selectors: {
		"&:first-child": {
			marginTop: 0,
		},
	},
})

export const sectionTitle = style({
	fontSize: themeContract.typography.fontSize.xs,
	fontWeight: themeContract.typography.fontWeight.medium,
	color: themeContract.colors.text.secondary,
	textTransform: "uppercase",
	letterSpacing: "0.05em",
	marginBottom: themeContract.space[2],
})

export const itemsList = style({
	display: "flex",
	flexDirection: "column",
	gap: "0.375rem", // gap-1.5
})

export const legendItem = style({
	display: "flex",
	alignItems: "center",
	gap: themeContract.space[2],
})

export const legendIcon = style({
	width: "0.75rem",
	height: "0.75rem",
	flexShrink: 0,
})

export const legendText = style({
	fontSize: themeContract.typography.fontSize.xs,
})

/**
 * Shape styles
 */
export const documentNode = style({
	width: "1rem",
	height: "0.75rem",
	background: "rgba(255, 255, 255, 0.21)",
	border: "1px solid rgba(255, 255, 255, 0.6)",
	borderRadius: themeContract.radii.sm,
	flexShrink: 0,
})

// Hexagon shapes using SVG background (matching graph's flat-top hexagon)
// Points calculated: angle = (i * 2π / 6) - π/2, center (6,6), radius 4.5
const hexagonPoints = "6,1.5 10.4,3.75 10.4,8.25 6,10.5 1.6,8.25 1.6,3.75"

export const memoryNode = style({
	width: "1rem",
	height: "1rem",
	flexShrink: 0,
	backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='${hexagonPoints}' fill='rgba(147,197,253,0.21)' stroke='rgba(147,196,253,0.6)' stroke-width='1'/%3E%3C/svg%3E")`,
	backgroundSize: "contain",
	backgroundRepeat: "no-repeat",
})

export const memoryNodeOlder = style({
	opacity: 0.4,
	width: "1rem",
	height: "1rem",
	flexShrink: 0,
	backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='${hexagonPoints}' fill='rgba(147,197,253,0.21)' stroke='rgba(147,196,253,0.6)' stroke-width='1'/%3E%3C/svg%3E")`,
	backgroundSize: "contain",
	backgroundRepeat: "no-repeat",
})

export const forgottenNode = style({
	width: "1rem",
	height: "1rem",
	flexShrink: 0,
	position: "relative",
	backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='${hexagonPoints}' fill='rgba(239,68,68,0.3)' stroke='rgba(239,68,68,0.8)' stroke-width='1'/%3E%3C/svg%3E")`,
	backgroundSize: "contain",
	backgroundRepeat: "no-repeat",
})

export const expiringNode = style({
	width: "1rem",
	height: "1rem",
	flexShrink: 0,
	backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='${hexagonPoints}' fill='rgba(147,197,253,0.1)' stroke='rgb(245,158,11)' stroke-width='1.5'/%3E%3C/svg%3E")`,
	backgroundSize: "contain",
	backgroundRepeat: "no-repeat",
})

export const newNode = style({
	width: "1rem",
	height: "1rem",
	flexShrink: 0,
	position: "relative",
	backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='${hexagonPoints}' fill='rgba(147,197,253,0.1)' stroke='rgb(16,185,129)' stroke-width='1.5'/%3E%3C/svg%3E")`,
	backgroundSize: "contain",
	backgroundRepeat: "no-repeat",
})

export const forgottenIcon = style({
	position: "absolute",
	inset: 0,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	color: "rgb(248, 113, 113)",
	fontSize: themeContract.typography.fontSize.xs,
	lineHeight: "1",
	pointerEvents: "none",
})

export const newBadge = style({
	position: "absolute",
	top: "-0.25rem",
	right: "-0.25rem",
	width: "0.5rem",
	height: "0.5rem",
	backgroundColor: "rgb(16, 185, 129)",
	borderRadius: themeContract.radii.full,
})

export const connectionLine = style({
	width: "1rem",
	height: 0,
	borderTop: "1px solid rgb(148, 163, 184, 0.5)",
	flexShrink: 0,
})

export const similarityLine = style({
	width: "1rem",
	height: 0,
	borderTop: "2px dashed rgba(79, 255, 226, 0.5)",
	flexShrink: 0,
})

export const relationLine = style({
	width: "1rem",
	height: 0,
	borderTop: "2px solid",
	flexShrink: 0,
})

export const weakSimilarity = style({
	width: "0.75rem",
	height: "0.75rem",
	borderRadius: themeContract.radii.full,
	background: "rgba(79, 255, 226, 0.3)",
	flexShrink: 0,
})

export const strongSimilarity = style({
	width: "0.75rem",
	height: "0.75rem",
	borderRadius: themeContract.radii.full,
	background: "rgba(79, 255, 226, 0.7)",
	flexShrink: 0,
})

export const gradientCircle = style({
	width: "0.75rem",
	height: "0.75rem",
	background:
		"linear-gradient(to right, rgb(148, 163, 184), rgb(96, 165, 250))",
	borderRadius: themeContract.radii.full,
})
