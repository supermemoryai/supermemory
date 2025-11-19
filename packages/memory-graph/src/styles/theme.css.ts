import { createTheme, createThemeContract } from "@vanilla-extract/css";

/**
 * Theme contract defines the structure of the design system.
 * Consumers can provide custom themes that match this contract.
 */
export const themeContract = createThemeContract({
	colors: {
		// Background colors
		background: {
			primary: null,
			secondary: null,
			accent: null,
		},
		// Document node colors
		document: {
			primary: null,
			secondary: null,
			accent: null,
			border: null,
			glow: null,
		},
		// Memory node colors
		memory: {
			primary: null,
			secondary: null,
			accent: null,
			border: null,
			glow: null,
		},
		// Connection strengths
		connection: {
			weak: null,
			memory: null,
			medium: null,
			strong: null,
		},
		// Text colors
		text: {
			primary: null,
			secondary: null,
			muted: null,
		},
		// Accent colors
		accent: {
			primary: null,
			secondary: null,
			glow: null,
			amber: null,
			emerald: null,
		},
		// Status indicators
		status: {
			forgotten: null,
			expiring: null,
			new: null,
		},
		// Relation types
		relations: {
			updates: null,
			extends: null,
			derives: null,
		},
	},
	space: {
		0: null,
		1: null,
		2: null,
		3: null,
		4: null,
		5: null,
		6: null,
		8: null,
		10: null,
		12: null,
		16: null,
		20: null,
		24: null,
		32: null,
		40: null,
		48: null,
		64: null,
	},
	radii: {
		none: null,
		sm: null,
		md: null,
		lg: null,
		xl: null,
		"2xl": null,
		full: null,
	},
	typography: {
		fontSize: {
			xs: null,
			sm: null,
			base: null,
			lg: null,
			xl: null,
			"2xl": null,
			"3xl": null,
		},
		fontWeight: {
			normal: null,
			medium: null,
			semibold: null,
			bold: null,
		},
		lineHeight: {
			tight: null,
			normal: null,
			relaxed: null,
		},
	},
	transitions: {
		fast: null,
		normal: null,
		slow: null,
	},
	zIndex: {
		base: null,
		dropdown: null,
		overlay: null,
		modal: null,
		tooltip: null,
	},
});

/**
 * Default theme implementation based on the original constants.ts colors
 * This provides the glass-morphism dark theme used throughout the app.
 */
export const defaultTheme = createTheme(themeContract, {
	colors: {
		background: {
			primary: "#0f1419", // Deep dark blue-gray
			secondary: "#1a1f29", // Slightly lighter
			accent: "#252a35", // Card backgrounds
		},
		document: {
			primary: "rgba(255, 255, 255, 0.06)", // Subtle glass white
			secondary: "rgba(255, 255, 255, 0.12)", // More visible
			accent: "rgba(255, 255, 255, 0.18)", // Hover state
			border: "rgba(255, 255, 255, 0.25)", // Sharp borders
			glow: "rgba(147, 197, 253, 0.4)", // Blue glow for interaction
		},
		memory: {
			primary: "rgba(147, 197, 253, 0.08)", // Subtle glass blue
			secondary: "rgba(147, 197, 253, 0.16)", // More visible
			accent: "rgba(147, 197, 253, 0.24)", // Hover state
			border: "rgba(147, 197, 253, 0.35)", // Sharp borders
			glow: "rgba(147, 197, 253, 0.5)", // Blue glow for interaction
		},
		connection: {
			weak: "rgba(148, 163, 184, 0)", // Very subtle
			memory: "rgba(148, 163, 184, 0.3)", // Very subtle
			medium: "rgba(148, 163, 184, 0.125)", // Medium visibility
			strong: "rgba(148, 163, 184, 0.4)", // Strong connection
		},
		text: {
			primary: "#ffffff", // Pure white
			secondary: "#e2e8f0", // Light gray
			muted: "#94a3b8", // Medium gray
		},
		accent: {
			primary: "rgba(59, 130, 246, 0.7)", // Clean blue
			secondary: "rgba(99, 102, 241, 0.6)", // Clean purple
			glow: "rgba(147, 197, 253, 0.6)", // Subtle glow
			amber: "rgba(251, 165, 36, 0.8)", // Amber for expiring
			emerald: "rgba(16, 185, 129, 0.4)", // Emerald for new
		},
		status: {
			forgotten: "rgba(220, 38, 38, 0.15)", // Red for forgotten
			expiring: "rgba(251, 165, 36, 0.8)", // Amber for expiring soon
			new: "rgba(16, 185, 129, 0.4)", // Emerald for new memories
		},
		relations: {
			updates: "rgba(147, 77, 253, 0.5)", // purple
			extends: "rgba(16, 185, 129, 0.5)", // green
			derives: "rgba(147, 197, 253, 0.5)", // blue
		},
	},
	space: {
		0: "0",
		1: "0.25rem", // 4px
		2: "0.5rem", // 8px
		3: "0.75rem", // 12px
		4: "1rem", // 16px
		5: "1.25rem", // 20px
		6: "1.5rem", // 24px
		8: "2rem", // 32px
		10: "2.5rem", // 40px
		12: "3rem", // 48px
		16: "4rem", // 64px
		20: "5rem", // 80px
		24: "6rem", // 96px
		32: "8rem", // 128px
		40: "10rem", // 160px
		48: "12rem", // 192px
		64: "16rem", // 256px
	},
	radii: {
		none: "0",
		sm: "0.125rem", // 2px
		md: "0.375rem", // 6px
		lg: "0.5rem", // 8px
		xl: "0.75rem", // 12px
		"2xl": "1rem", // 16px
		full: "9999px",
	},
	typography: {
		fontSize: {
			xs: "0.75rem", // 12px
			sm: "0.875rem", // 14px
			base: "1rem", // 16px
			lg: "1.125rem", // 18px
			xl: "1.25rem", // 20px
			"2xl": "1.5rem", // 24px
			"3xl": "1.875rem", // 30px
		},
		fontWeight: {
			normal: "400",
			medium: "500",
			semibold: "600",
			bold: "700",
		},
		lineHeight: {
			tight: "1.25",
			normal: "1.5",
			relaxed: "1.75",
		},
	},
	transitions: {
		fast: "150ms ease-in-out",
		normal: "200ms ease-in-out",
		slow: "300ms ease-in-out",
	},
	zIndex: {
		base: "0",
		dropdown: "10",
		overlay: "20",
		modal: "30",
		tooltip: "40",
	},
});
