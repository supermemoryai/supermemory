import { dmSansClassName } from "@/utils/fonts"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"

export function ContinueStep() {
	const router = useRouter()

	const handleContinue = () => {
		router.push("/onboarding?flow=welcome&step=features")
	}

	return (
		<motion.div
			className="text-center"
			initial={{ opacity: 0, y: 0, scale: 0.9 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 0, scale: 0.9 }}
			transition={{ duration: 1, ease: "easeOut" }}
			layout
		>
			<p
				className={cn(
					"text-[#8A8A8A] text-sm mb-6 max-w-sm",
					dmSansClassName(),
				)}
			>
				I'm built with Supermemory's super fast memory API,
				<br /> so you never have to worry about forgetting <br /> what matters
				across your AI apps.
			</p>
			<Button
				variant="onboarding"
				onClick={handleContinue}
			>
				Continue →
			</Button>
		</motion.div>
	)
}
