import { motion } from "motion/react"
import { Button } from "@ui/components/button"
import { useRouter } from "next/navigation"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"

export function FeaturesStep() {
	const router = useRouter()

	const handleContinue = () => {
		router.push("/onboarding?flow=welcome&step=memories")
	}
	return (
		<motion.div
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
			className="text-center max-w-88 space-y-6"
			layout
		>
			<h2 className="text-white text-[32px] font-medium leading-[110%]">
				What I can do for you
			</h2>

			<div className={cn("space-y-4 mb-[24px] mx-4", dmSansClassName())}>
				<div className="flex items-start space-x-2">
					<div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0">
						<img
							src="/onboarding/human-brain.png"
							alt="Brain icon"
							className="w-14 h-14"
						/>
					</div>
					<div className="text-left">
						<p className="text-white font-light">Remember every context</p>
						<p className="text-[#8A8A8A] text-[14px]">
							I keep track of what you've saved and shared with your
							supermemory.
						</p>
					</div>
				</div>

				<div className="flex items-start space-x-2">
					<div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0">
						<img
							src="/onboarding/search.png"
							alt="Search icon"
							className="w-14 h-14"
						/>
					</div>
					<div className="text-left">
						<p className="text-white font-light">Find when you need it</p>
						<p className="text-[#8A8A8A] text-[14px]">
							I surface the right memories inside <br /> your supermemory,
							superfast.
						</p>
					</div>
				</div>

				<div className="flex items-start space-x-2">
					<div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0">
						<img
							src="/onboarding/plant.png"
							alt="Growth icon"
							className="w-14 h-14"
						/>
					</div>
					<div className="text-left">
						<p className="text-white font-light">Grow with your supermemory</p>
						<p className="text-[#8A8A8A] text-[14px]">
							I learn and personalize over time, so every interaction feels
							natural.
						</p>
					</div>
				</div>
			</div>

			<motion.div
				animate={{
					opacity: 1,
					y: 0,
				}}
				transition={{ duration: 1, ease: "easeOut", delay: 1 }}
				initial={{ opacity: 0, y: 10 }}
			>
				<Button
					variant="onboarding"
					style={{
						background: "linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
					}}
					onClick={handleContinue}
				>
					Add memories →
				</Button>
			</motion.div>
		</motion.div>
	)
}
