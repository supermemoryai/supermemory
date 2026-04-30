import { motion } from "motion/react"

export function AnimatedGradientBackground({
	topPosition = "40%",
	animateFromBottom = true,
}: {
	topPosition?: string
	animateFromBottom?: boolean
}) {
	return (
		<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
			<motion.div
				className="absolute top-0 left-0 right-0 bottom-0 bg-[url('/onboarding/bg-gradient-0.png')] bg-size-[150%_auto] bg-top bg-no-repeat"
				style={{ top: animateFromBottom ? undefined : topPosition }}
				initial={{ opacity: 0 }}
				animate={
					animateFromBottom
						? { opacity: 1 }
						: { opacity: [1, 0, 1], top: topPosition }
				}
				transition={
					animateFromBottom
						? { duration: 1, ease: "easeOut" }
						: {
								opacity: {
									duration: 8,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								},
							}
				}
			/>
			<motion.div
				className="absolute top-0 left-0 right-0 bottom-0 bg-[url('/onboarding/bg-gradient-1.png')] bg-size-[150%_auto] bg-top bg-no-repeat"
				style={{ top: animateFromBottom ? undefined : topPosition }}
				initial={{ opacity: 0 }}
				animate={
					animateFromBottom
						? { opacity: 1 }
						: { opacity: [0, 1, 0], top: topPosition }
				}
				transition={
					animateFromBottom
						? { duration: 1, ease: "easeOut", delay: 0.2 }
						: {
								opacity: {
									duration: 8,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								},
							}
				}
			/>
			<motion.div
				className="absolute inset-0 bg-[url('/bg-rectangle.png')] bg-cover bg-bottom bg-no-repeat"
				transition={{ duration: 0.75, ease: "easeOut", bounce: 0 }}
				style={{
					mixBlendMode: "soft-light",
					opacity: 0.4,
				}}
			/>
		</div>
	)
}
