import { motion } from "motion/react"

export function AnimatedGradientBackground({
	topPosition = "40%",
	animateFromBottom = true,
}: {
	topPosition?: string
	animateFromBottom?: boolean
}) {
	return (
		<div className="fixed inset-0 z-0 overflow-hidden">
			<motion.div
				className="absolute top-0 left-0 right-0 bottom-0 bg-[url('/onboarding/bg-gradient-0.png')] bg-size-[150%_auto] bg-top bg-no-repeat"
				style={{ top: animateFromBottom ? undefined : topPosition }}
				initial={{ y: "100%" }}
				animate={{
					y: 0,
					opacity: animateFromBottom ? 0 : [1, 0, 1],
					top: animateFromBottom ? "0%" : topPosition,
				}}
				transition={{
					y: { duration: 0.75, ease: "easeOut" },
					opacity: animateFromBottom
						? { duration: 2, ease: "easeOut" }
						: {
								duration: 8,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							},
					top: animateFromBottom
						? { duration: 0.75, ease: "easeOut" }
						: undefined,
				}}
			/>
			<motion.div
				className="absolute top-0 left-0 right-0 bottom-0 bg-[url('/onboarding/bg-gradient-1.png')] bg-size-[150%_auto] bg-top bg-no-repeat"
				style={{ top: animateFromBottom ? undefined : topPosition }}
				initial={{ y: "100%" }}
				animate={{
					y: 0,
					opacity: animateFromBottom ? 0 : [0, 1, 0],
					top: animateFromBottom ? "0%" : topPosition,
				}}
				transition={{
					y: { duration: 0.75, ease: "easeOut" },
					opacity: animateFromBottom
						? { duration: 2, ease: "easeOut" }
						: {
								duration: 8,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							},
					top: animateFromBottom
						? { duration: 0.75, ease: "easeOut" }
						: undefined,
				}}
			/>
			<motion.div
				className="absolute top-0 left-0 right-0 bottom-0 bg-[url('/bg-rectangle.png')] bg-cover bg-center bg-no-repeat"
				transition={{ duration: 0.75, ease: "easeOut", bounce: 0 }}
				style={{
					mixBlendMode: "soft-light",
					opacity: 0.4,
				}}
			/>
		</div>
	)
}
