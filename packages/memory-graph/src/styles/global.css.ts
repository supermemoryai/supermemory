import { globalStyle } from "@vanilla-extract/css";

/**
 * Global CSS reset and base styles
 */

// Box sizing reset
globalStyle("*, *::before, *::after", {
	boxSizing: "border-box",
});

// Remove default margins
globalStyle("body, h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd", {
	margin: 0,
});

// Remove list styles
globalStyle("ul[role='list'], ol[role='list']", {
	listStyle: "none",
});

// Core body defaults
globalStyle("html, body", {
	height: "100%",
});

globalStyle("body", {
	lineHeight: 1.5,
	WebkitFontSmoothing: "antialiased",
	MozOsxFontSmoothing: "grayscale",
});

// Typography defaults
globalStyle("h1, h2, h3, h4, h5, h6", {
	fontWeight: 500,
	lineHeight: 1.25,
});

// Inherit fonts for inputs and buttons
globalStyle("input, button, textarea, select", {
	font: "inherit",
});

// Remove default button styles
globalStyle("button", {
	background: "none",
	border: "none",
	padding: 0,
	cursor: "pointer",
});

// Improve media defaults
globalStyle("img, picture, video, canvas, svg", {
	display: "block",
	maxWidth: "100%",
});

// Remove built-in form typography styles
globalStyle("input, button, textarea, select", {
	font: "inherit",
});

// Avoid text overflows
globalStyle("p, h1, h2, h3, h4, h5, h6", {
	overflowWrap: "break-word",
});

// Improve text rendering
globalStyle("#root, #__next", {
	isolation: "isolate",
});
