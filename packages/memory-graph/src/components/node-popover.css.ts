import { style } from "@vanilla-extract/css"

// Backdrop styles
export const backdrop = style({
	position: "fixed",
	zIndex: 999,
	pointerEvents: "auto",
	backgroundColor: "transparent",
})

export const backdropFullscreen = style({
	inset: 0,
})

// Popover container
export const popoverContainer = style({
	position: "fixed",
	background: "rgba(255, 255, 255, 0.05)",
	backdropFilter: "blur(12px)",
	WebkitBackdropFilter: "blur(12px)",
	border: "1px solid rgba(255, 255, 255, 0.25)",
	borderRadius: "12px",
	padding: "16px",
	width: "320px",
	zIndex: 1000,
	pointerEvents: "auto",
	boxShadow:
		"0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)",
})

// Layout
export const contentContainer = style({
	display: "flex",
	flexDirection: "column",
	gap: "12px",
})

export const header = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	marginBottom: "4px",
})

export const headerTitle = style({
	display: "flex",
	alignItems: "center",
	gap: "8px",
})

export const headerIcon = style({
	color: "rgba(148, 163, 184, 1)",
})

export const headerIconMemory = style({
	color: "rgb(96, 165, 250)",
})

export const title = style({
	fontSize: "16px",
	fontWeight: "700",
	color: "white",
	margin: 0,
})

// Close button
export const closeButton = style({
	padding: "4px",
	background: "transparent",
	border: "none",
	color: "rgba(148, 163, 184, 1)",
	cursor: "pointer",
	fontSize: "16px",
	lineHeight: "1",
	transition: "color 0.2s",
	":hover": {
		color: "white",
	},
})

// Sections
export const sectionsContainer = style({
	display: "flex",
	flexDirection: "column",
	gap: "12px",
})

export const fieldLabel = style({
	fontSize: "11px",
	color: "rgba(148, 163, 184, 0.8)",
	textTransform: "uppercase",
	letterSpacing: "0.05em",
	marginBottom: "4px",
})

export const fieldValue = style({
	fontSize: "14px",
	color: "rgba(203, 213, 225, 1)",
	margin: 0,
	lineHeight: "1.4",
})

export const summaryValue = style({
	fontSize: "14px",
	color: "rgba(203, 213, 225, 1)",
	margin: 0,
	lineHeight: "1.4",
	overflow: "hidden",
	display: "-webkit-box",
	WebkitLineClamp: 2,
	WebkitBoxOrient: "vertical",
})

// Link
export const link = style({
	fontSize: "14px",
	color: "rgb(129, 140, 248)",
	textDecoration: "none",
	display: "flex",
	alignItems: "center",
	gap: "4px",
	transition: "color 0.2s",
	":hover": {
		color: "rgb(165, 180, 252)",
	},
})

// Footer
export const footer = style({
	paddingTop: "12px",
	borderTop: "1px solid rgba(71, 85, 105, 0.5)",
	display: "flex",
	alignItems: "center",
	gap: "16px",
	fontSize: "12px",
	color: "rgba(148, 163, 184, 1)",
})

export const footerItem = style({
	display: "flex",
	alignItems: "center",
	gap: "4px",
})

export const footerItemId = style({
	display: "flex",
	alignItems: "center",
	gap: "4px",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	flex: 1,
})

export const idText = style({
	overflow: "hidden",
	textOverflow: "ellipsis",
})

// Memory-specific styles
export const forgottenBadge = style({
	marginTop: "8px",
	padding: "4px 8px",
	background: "rgba(220, 38, 38, 0.15)",
	borderRadius: "4px",
	fontSize: "12px",
	color: "rgba(248, 113, 113, 1)",
	display: "inline-block",
})

export const expiresText = style({
	fontSize: "12px",
	color: "rgba(148, 163, 184, 1)",
	margin: "8px 0 0 0",
	lineHeight: "1.4",
})
