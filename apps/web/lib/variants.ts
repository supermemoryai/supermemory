import type { Variants } from "motion/react"

export const contentVariants: Variants = {
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.5,
			ease: "easeInOut",
			delay: 0.2,
		},
	},
	hiddenUp: {
		opacity: 0,
		y: -40,
		transition: {
			duration: 0,
		},
	},
	hiddenDown: {
		opacity: 0,
		y: 40,
		transition: {
			duration: 0,
		},
	},
}

export const continueVariants: Variants = {
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.5,
			ease: "easeInOut",
		},
	},
	hidden: {
		opacity: 0,
		y: -40,
		transition: {
			duration: 0,
		},
	},
}

export const gapVariants: Variants = {
	default: {
		gap: 16,
		transition: {
			duration: 0.6,
			ease: "easeOut",
		},
	},
	minimized: {
		gap: 0,
		transition: {
			duration: 0.6,
			ease: "easeOut",
		},
	},
}

export const orbVariants: Variants = {
	default: {
		scale: 1,
		padding: 48,
		paddingTop: 0,
		y: 0,
		transition: {
			duration: 0.8,
			ease: "easeOut",
		},
	},
	features: {
		scale: 0.7,
		padding: 0,
		paddingTop: 0,
		y: 0,
		transition: {
			duration: 0.8,
			ease: "easeOut",
		},
	},
	memories: {
		scale: 0.4,
		padding: 0,
		paddingTop: 0,
		y: 0,
		transition: {
			duration: 0.8,
			ease: "easeOut",
		},
	},
}
