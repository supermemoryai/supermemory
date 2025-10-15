"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Button } from "@ui/components/button"

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

interface RelatableQuestionProps {
	onContinueOrSkip: () => void
}

export function RelatableQuestion({
	onContinueOrSkip,
}: RelatableQuestionProps) {
	const [selectedOptions, setSelectedOptions] = useState<number[]>([])

	return (
		<motion.div
			className="flex flex-col items-center justify-center h-full"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.6 }}
		>
			<motion.h1
				className="text-white text-3xl font-medium mb-6 text-center"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, delay: 0.2 }}
			>
				Which of these sound most relatable?
			</motion.h1>

			<div className="flex flex-wrap justify-center gap-4 max-w-7xl">
				{relatableOptions.map((option, index) => (
					<button
						key={option.text}
						className={`
						relative rounded-lg p-2 cursor-pointer transition-all duration-300 opacity-50 hover:opacity-100 border-[#0D121A] 
						${
							selectedOptions.includes(index)
								? "border-[#3374FF] border-[0.1px] opacity-100 bg-[url('/onboarding/bg-gradient-1.png')] bg-[length:250%_auto] bg-[center_top_3rem] bg-no-repeat"
								: "border-2 bg-[#080B0F] hover:bg-[url('/onboarding/bg-gradient-1.png')] hover:bg-[length:250%_auto] hover:bg-[center_top_3rem] hover:bg-no-repeat"
						} 
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
						<div className="flex flex-col items-start justify-between space-y-8">
							<span className="text-2xl">{option.emoji}</span>
							<p className="text-white text-xs leading-relaxed max-w-[115px] align-bottom text-left">
								{option.text}
							</p>
						</div>
					</button>
				))}
			</div>
			<div className="flex gap-4 my-8">
				<div key={selectedOptions.length === 0 ? "skip" : "continue"}>
					<Button
						className="text-foreground font-medium"
						variant="link"
						size="lg"
						onClick={onContinueOrSkip}
					>
						{selectedOptions.length === 0 ? "Skip for now →" : "Continue →"}
					</Button>
				</div>
			</div>
		</motion.div>
	)
}
