import { motion } from "motion/react"

interface GreetingStepProps {
	name: string
}

export function GreetingStep({ name }: GreetingStepProps) {
	const userName = name ? `${name.split(" ")[0]}` : ""
	return (
		<motion.div
			className="text-center"
			initial={{ opacity: 0, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 0 }}
			transition={{ duration: 1, ease: "easeOut" }}
			layout
		>
			<h2 className="text-white text-[32px] font-medium mb-2">
				Hi {userName}, I'm Nova
			</h2>
		</motion.div>
	)
}
