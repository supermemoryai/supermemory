import { keyframes } from "@vanilla-extract/css";

/**
 * Animation keyframes
 * Used throughout the component library for consistent motion
 */

export const fadeIn = keyframes({
	from: { opacity: 0 },
	to: { opacity: 1 },
});

export const fadeOut = keyframes({
	from: { opacity: 1 },
	to: { opacity: 0 },
});

export const slideInFromRight = keyframes({
	from: {
		transform: "translateX(100%)",
		opacity: 0,
	},
	to: {
		transform: "translateX(0)",
		opacity: 1,
	},
});

export const slideInFromLeft = keyframes({
	from: {
		transform: "translateX(-100%)",
		opacity: 0,
	},
	to: {
		transform: "translateX(0)",
		opacity: 1,
	},
});

export const slideInFromTop = keyframes({
	from: {
		transform: "translateY(-100%)",
		opacity: 0,
	},
	to: {
		transform: "translateY(0)",
		opacity: 1,
	},
});

export const slideInFromBottom = keyframes({
	from: {
		transform: "translateY(100%)",
		opacity: 0,
	},
	to: {
		transform: "translateY(0)",
		opacity: 1,
	},
});

export const spin = keyframes({
	from: { transform: "rotate(0deg)" },
	to: { transform: "rotate(360deg)" },
});

export const pulse = keyframes({
	"0%, 100%": {
		opacity: 1,
	},
	"50%": {
		opacity: 0.5,
	},
});

export const bounce = keyframes({
	"0%, 100%": {
		transform: "translateY(-25%)",
		animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
	},
	"50%": {
		transform: "translateY(0)",
		animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
	},
});

export const scaleIn = keyframes({
	from: {
		transform: "scale(0.95)",
		opacity: 0,
	},
	to: {
		transform: "scale(1)",
		opacity: 1,
	},
});

export const scaleOut = keyframes({
	from: {
		transform: "scale(1)",
		opacity: 1,
	},
	to: {
		transform: "scale(0.95)",
		opacity: 0,
	},
});

export const shimmer = keyframes({
	"0%": {
		backgroundPosition: "-1000px 0",
	},
	"100%": {
		backgroundPosition: "1000px 0",
	},
});
