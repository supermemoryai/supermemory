import { motion } from "motion/react"

interface GreetingStepProps {
	name: string
}

export function GreetingStep({ name }: GreetingStepProps) {
	return (
		<motion.div
			className="text-center"
			initial={{ opacity: 0, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 0 }}
			transition={{ duration: 1, ease: "easeOut" }}
			layout
		>
			<h2 className="text-white text-2xl font-medium mb-2">
				Hi {name}, I'm Nova
			</h2>
		</motion.div>
	)
}
