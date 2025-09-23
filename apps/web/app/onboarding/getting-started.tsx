"use client"

import { Button } from "@ui/components/button"
import { useOnboarding } from "./onboarding-context"
import { motion } from "motion/react"
import { ArrowRightIcon, ChromeIcon } from "lucide-react"

export function GettingStarted() {
	const { nextStep } = useOnboarding()

	const handleAddToChrome = () => {
		// Open Chrome Web Store or handle extension installation
		window.open(
			"https://chrome.google.com/webstore/detail/your-extension-id",
			"_blank",
		)
	}

	const handleConnectToAI = () => {
		// Handle AI connection logic
		console.log("Connecting to AI...")
	}

	return (
		<div className="w-full max-w-6xl mx-auto py-12">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				className="text-center mb-12"
			>
				<h1 className="text-4xl md:text-5xl text-white">
					Get started with
				</h1>
				<h1 className="text-4xl md:text-5xl text-white mb-6">
					supermemory
					<ArrowRightIcon className="inline-block ml-4 h-8 w-8 text-white" />
				</h1>
			</motion.div>

			<div className="space-y-6">
				{/* Add to Chrome Card */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
					className="bg-white/5 bg-opacity-5 backdrop-blur-sm p-3 md:p-4 border-dotted border-white/10 border"
				>
					<div className="flex items-center justify-between gap-12 w-3xl">
						<div className="flex items-center space-x-4">
							<div className="rounded-xl">
								<ChromeIcon className="h-8 w-8 text-white" />
							</div>
							<div>
								<h3 className="text-lg md:text-xl text-white">Add to Chrome</h3>
								<p className="text-white/80 text-xs md:text-sm">
									Install the browser extension to capture content
								</p>
							</div>
						</div>
						<Button
							onClick={handleAddToChrome}
							className="bg-white text-gray-900 hover:bg-gray-100 px-3 py-2 font-medium ml-4"
						>
							Add now
						</Button>
					</div>
				</motion.div>

				{/* Connect to AI Card 1 */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					className="bg-white/5 bg-opacity-5 backdrop-blur-sm p-3 md:p-4 border-dotted border-white/10 border"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<div className="rounded-xl">
								<svg
									className="h-8 w-8 text-white"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									aria-label="AI layers icon"
								>
									<title>AI layers</title>
									<path d="M12 2L2 7l10 5 10-5-10-5z" />
									<path d="M2 17l10 5 10-5" />
									<path d="M2 12l10 5 10-5" />
								</svg>
							</div>
							<div>
								<h3 className="text-lg md:text-xl text-white">
									Connect to AI
								</h3>
								<p className="text-white/80 text-xs md:text-sm">
									Connect your AI assistant for smart memory
								</p>
							</div>
						</div>
						<Button
							onClick={handleConnectToAI}
							className="bg-white text-gray-900 hover:bg-gray-100 px-3 py-2 font-medium"
						>
							Connect now
						</Button>
					</div>
				</motion.div>
			</div>

			{/* Continue Button */}
			<motion.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, delay: 0.8 }}
				className="text-center mt-12"
			>
				<Button
					onClick={nextStep}
					className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 px-8 py-3 rounded-xl font-medium border border-white/30"
				>
					Continue
					<ArrowRightIcon className="ml-2 h-4 w-4" />
				</Button>
			</motion.div>
		</div>
	)
}
