import { motion } from "framer-motion"
import { Button } from "@ui/components/button"
import Link from "next/link"

export function FeaturesStep() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
			className="text-center max-w-[22rem]"
			layout
		>
			<h2 className="text-white text-3xl font-medium mb-2">
				What I can do for you
			</h2>

			<div className="space-y-6 mb-8">
				<div className="flex items-start space-x-2">
					<div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0">
						<img
							src="/onboarding/human-brain.png"
							alt="Brain icon"
							className="w-14 h-14"
						/>
					</div>
					<div className="text-left">
						<h3 className="text-white font-light text-lg mb-1">
							Remember every context
						</h3>
						<p className="text-[#8A8A8A] text-xs">
							I keep track of what you've saved and shared with your
							supermemory.
						</p>
					</div>
				</div>

				<div className="flex items-start space-x-2">
					<div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0">
						<img
							src="/onboarding/search.png"
							alt="Search icon"
							className="w-14 h-14"
						/>
					</div>
					<div className="text-left">
						<h3 className="text-white font-light text-lg mb-1">
							Find when you need it
						</h3>
						<p className="text-[#8A8A8A] text-xs">
							I surface the right memories inside your supermemory, superfast.
						</p>
					</div>
				</div>

				<div className="flex items-start space-x-2">
					<div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0">
						<img
							src="/onboarding/plant.png"
							alt="Growth icon"
							className="w-14 h-14"
						/>
					</div>
					<div className="text-left">
						<h3 className="text-white font-light text-lg mb-1">
							Grow with your supermemory
						</h3>
						<p className="text-[#8A8A8A] text-xs">
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
					className="rounded-xl px-6 py-3 bg-black border border-gray-800 hover:bg-gray-900 max-w-[10rem]"
					asChild
				>
					<Link href="/onboarding/setup">
						<motion.button whileTap={{ scale: 0.95 }} className="w-full">
							Continue setup →
						</motion.button>
					</Link>
				</Button>
			</motion.div>
		</motion.div>
	)
}
