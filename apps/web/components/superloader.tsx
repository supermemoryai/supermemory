"use client"

import { motion, useReducedMotion, Variants } from "motion/react"

type NovaPathLoaderProps = {
	size?: number // px
	colorClassName?: string
	label?: string
	className?: string
}

// full SVG path data from nova-2d-anim.svg
const PATH_RIGHT =
	"M3.03472 6.05861L6.8539 9.91021H1.96777V11.9737H8.3006V17.4781H10.3467V11.5057C10.3467 10.8713 10.0963 10.2621 9.65119 9.81327L4.48145 4.59961L3.03472 6.05861Z"

const PATH_LEFT =
	"M12.6994 9.02793V3.52344H10.6533V9.49591C10.6533 10.1302 10.9037 10.7395 11.3488 11.1883L16.5197 16.4032L17.9665 14.9441L14.1473 11.0926H19.0334V9.02914L12.6994 9.02793Z"

// animation for stroke draw
const strokeVariants: Variants = {
	hidden: { pathLength: 0, opacity: 0.2 },
	visible: (i: number) => ({
		pathLength: [0, 1],
		opacity: [0.2, 1],
		transition: {
			duration: 0.9,
			repeat: Number.POSITIVE_INFINITY,
			repeatType: "reverse",
			ease: "easeInOut",
			delay: i * 0.18,
		},
	}),
	static: { pathLength: 1, opacity: 0.7 },
}

export function SuperLoader({
	size = 42,
	colorClassName = "text-sky-400",
	label = "Loading...",
	className = "",
}: NovaPathLoaderProps) {
	const prefersReducedMotion = useReducedMotion()

	const animateVariant = prefersReducedMotion ? "static" : "visible"

	return (
		<div
			role="status"
			aria-label={label}
			className={`inline-flex flex-col items-center gap-2 ${className}`}
			style={{ width: size + 10 }}
		>
			<motion.svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 21 21"
				width={size}
				height={size}
				className={`shrink-0 ${colorClassName}`}
			>
				<title>Loading...</title>
				{/* Right path */}
				<motion.path
					d={PATH_RIGHT}
					fill="none"
					stroke="currentColor"
					strokeWidth={1.4}
					strokeLinecap="round"
					strokeLinejoin="round"
					initial="hidden"
					animate={animateVariant}
					variants={strokeVariants}
					custom={0}
				/>

				{/* Left path */}
				<motion.path
					d={PATH_LEFT}
					fill="none"
					stroke="currentColor"
					strokeWidth={1.4}
					strokeLinecap="round"
					strokeLinejoin="round"
					initial="hidden"
					animate={animateVariant}
					variants={strokeVariants}
					custom={1}
				/>
			</motion.svg>

			<span
				className="text-xs font-medium text-slate-500"
				style={{ fontSize: size * 0.25 }}
			>
				{label}
			</span>
		</div>
	)
}
