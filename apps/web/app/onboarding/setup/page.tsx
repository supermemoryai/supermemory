import { motion } from "motion/react"

export function AnimatedGradientBackground() {
	return (
		<div className="fixed inset-0 z-0 overflow-hidden">
			<motion.div
				className="absolute top-[40%] left-0 right-0 bottom-0 bg-[url('/onboarding/bg-gradient-0.png')] bg-[length:150%_auto] bg-top bg-no-repeat"
				initial={{ y: "100%" }}
				animate={{
					y: 0,
					opacity: [1, 0, 1],
				}}
				transition={{
					y: { duration: 0.75, ease: "easeOut" },
					opacity: {
						duration: 8,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					},
				}}
			/>
			<motion.div
				className="absolute top-[40%] left-0 right-0 bottom-0 bg-[url('/onboarding/bg-gradient-1.png')] bg-[length:150%_auto] bg-top bg-no-repeat"
				initial={{ y: "100%" }}
				animate={{
					y: 0,
					opacity: [0, 1, 0],
				}}
				transition={{
					y: { duration: 0.75, ease: "easeOut" },
					opacity: {
						duration: 8,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					},
				}}
			/>
			<motion.div
				className="absolute top-20 left-0 right-0 bottom-0 bg-[url('/bg-rectangle.png')] bg-cover bg-center bg-no-repeat"
				initial={{ y: "100%" }}
				animate={{ y: 0 }}
				transition={{ duration: 0.75, ease: "easeOut", bounce: 0 }}
				style={{
					mixBlendMode: "soft-light",
					opacity: 0.6,
				}}
			/>
		</div>
	)
}
