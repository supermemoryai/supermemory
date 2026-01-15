import { motion } from "motion/react"

export function WelcomeStep() {
	return (
		<motion.div
			className="text-center"
			initial={{ opacity: 0, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 0 }}
			transition={{ duration: 1, ease: "easeOut" }}
			layout
		>
			<h2 className="text-white text-[32px] font-medium mb-2">Welcome to...</h2>
		</motion.div>
	)
}
