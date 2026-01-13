"use client"

import { ArrowRightIcon } from "lucide-react"
import { cn } from "@lib/utils"

interface FollowUpQuestionsProps {
	questions: string[]
	onQuestionClick: (question: string) => void
	isLoading?: boolean
}

export function FollowUpQuestions({
	questions,
	onQuestionClick,
	isLoading = false,
}: FollowUpQuestionsProps) {
	if (isLoading) {
		return (
			<div className="mt-3 flex flex-col gap-2">
				<div
					key="skeleton-0"
					className="h-4 w-28 animate-pulse rounded-full bg-white/10"
				/>
				<div
					key="skeleton-1"
					className="h-4 w-36 animate-pulse rounded-full bg-white/10"
				/>
			</div>
		)
	}

	if (questions.length === 0) {
		return null
	}

	return (
		<div className="flex flex-wrap mt-2 gap-3">
			<div className="text-xs">Follow up questions:</div>
			<div className="flex flex-wrap">
				{questions.map((question) => (
					<button
						key={question}
						type="button"
						onClick={() => onQuestionClick(question)}
						className={cn(
							"group flex items-center gap-1.5 rounded-full py-1 text-sm text-[#267BF1] transition-all hover:underline cursor-pointer text-start",
						)}
					>
						<ArrowRightIcon className="size-3.5" />
						<span>{question}</span>
					</button>
				))}
			</div>
		</div>
	)
}
