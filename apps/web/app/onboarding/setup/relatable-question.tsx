"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@ui/components/button"
import { useRouter } from "next/navigation"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"

const relatableOptions = [
	{
		emoji: "😔",
		text: "I always forget what I save in my twitter bookmarks",
	},
	{
		emoji: "😭",
		text: "Going through e-books manually is so tedious",
	},
	{
		emoji: "🥲",
		text: "I always have to feed every AI app with my data",
	},
	{
		emoji: "😵‍💫",
		text: "Referring meeting notes makes my AI chat hallucinate",
	},
	{
		emoji: "🫤",
		text: "I save nothing on my browser, it's just useless",
	},
]

export function RelatableQuestion() {
	const router = useRouter()
	const [selectedOptions, setSelectedOptions] = useState<number[]>([])

	const handleContinueOrSkip = () => {
		router.push("/onboarding?flow=setup&step=integrations")
	}

	return (
		<motion.div
			className="flex flex-col items-center justify-center h-full"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.6 }}
		>
			<motion.h1
				className="text-white text-[32px] font-medium mb-6 text-center"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, delay: 0.2 }}
			>
				Which of these sound most relatable?
			</motion.h1>

			<div
				className={cn(
					"flex flex-wrap justify-center gap-4 max-w-3xl",
					dmSansClassName(),
				)}
			>
				{relatableOptions.map((option, index) => (
					<div
						key={option.text}
						className={cn(
							"rounded-lg max-w-[140px] min-h-[159px] transition-all duration-300",
							selectedOptions.includes(index)
								? "p-px bg-linear-to-b from-[#3374FF] to-[#1A63FF00]"
								: "p-0 border border-[#0D121A] hover:border-[#4C608B66]",
						)}
					>
						<button
							className={`
						group relative w-full h-full rounded-lg p-2 cursor-pointer transition-all duration-300 overflow-hidden
						bg-[#080B0F] hover:bg-no-repeat
					`}
							onClick={() => {
								setSelectedOptions((prev) =>
									prev.includes(index)
										? prev.filter((i) => i !== index)
										: [...prev, index],
								)
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault()
									setSelectedOptions((prev) =>
										prev.includes(index)
											? prev.filter((i) => i !== index)
											: [...prev, index],
									)
								}
							}}
							type="button"
						>
							<AnimatePresence>
								{selectedOptions.includes(index) && (
									<motion.div
										className="absolute inset-0 bg-[url('/onboarding/bg-gradient-1.png')] bg-size-[550%_auto] bg-top bg-no-repeat"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
									/>
								)}
							</AnimatePresence>
							<div className="relative flex flex-col items-start justify-between h-full">
								<span
									className={`text-2xl ${
										selectedOptions.includes(index)
											? "opacity-100"
											: "opacity-70 group-hover:opacity-100"
									}`}
								>
									{option.emoji}
								</span>
								<p
									className={`text-white text-sm leading-[135%] align-bottom text-left transition-opacity duration-300 ${
										selectedOptions.includes(index)
											? "opacity-100"
											: "opacity-50 group-hover:opacity-100"
									}`}
								>
									{option.text}
								</p>
							</div>
						</button>
					</div>
				))}
			</div>
			<div className="flex gap-4 my-8">
				<div key={selectedOptions.length === 0 ? "skip" : "continue"}>
					<Button
						className={cn(
							"font-medium text-white hover:no-underline",
							selectedOptions.length !== 0 ? "rounded-xl" : "",
						)}
						variant={selectedOptions.length !== 0 ? "onboarding" : "link"}
						size="lg"
						onClick={handleContinueOrSkip}
						style={
							selectedOptions.length !== 0
								? {
										background:
											"linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
									}
								: undefined
						}
					>
						{selectedOptions.length === 0
							? "Skip for now →"
							: "Remember this →"}
					</Button>
				</div>
			</div>
		</motion.div>
	)
}
