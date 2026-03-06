"use client"

import { useState } from "react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog"
import { Textarea } from "@ui/components/textarea"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon, Loader2 } from "lucide-react"
import { usePostHog } from "@lib/posthog"
import { toast } from "sonner"

interface FeedbackModalProps {
	isOpen: boolean
	onClose: () => void
}

const FEEDBACK_SURVEY_ID = "019bf2dd-f002-0000-d819-8a914cb23999"
const FEEDBACK_QUESTION_ID = "0af81ccd-cb43-43a3-a61b-3a74c08a922a"
const FEEDBACK_QUESTION = "What can we do to improve our product?"

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
	const [feedback, setFeedback] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const posthog = usePostHog()

	const handleSubmit = async () => {
		if (!feedback.trim() || isSubmitting) return

		setIsSubmitting(true)

		try {
			if (posthog.__loaded) {
				const responseKey = FEEDBACK_QUESTION_ID.replace(/-/g, "_")
				posthog.capture("survey sent", {
					$survey_id: FEEDBACK_SURVEY_ID,
					$survey_questions: [
						{
							id: FEEDBACK_QUESTION_ID,
							question: FEEDBACK_QUESTION,
						},
					],
					[`$survey_response_${responseKey}`]: feedback.trim(),
					$survey_name: "Nova feedback",
					$survey_completed: true,
				})
			}

			setFeedback("")
			toast.success("Thank you for your feedback!")
			onClose()
		} catch (error) {
			console.error("Failed to submit feedback:", error)
			toast.error("Failed to submit feedback. Please try again.")
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleClose = () => {
		if (!isSubmitting) {
			setFeedback("")
			onClose()
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (
			e.key === "Enter" &&
			(e.metaKey || e.ctrlKey) &&
			feedback.trim() &&
			!isSubmitting
		) {
			e.preventDefault()
			handleSubmit()
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent
				className={cn(
					"w-[90%]! max-w-[500px]! border-none bg-[#1B1F24] flex flex-col p-4 gap-4 rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<div className="flex flex-col gap-4">
					<div className="flex justify-between items-start gap-4">
						<DialogHeader className="pl-1 space-y-1 flex-1">
							<DialogTitle
								className={cn(
									"font-semibold text-[#fafafa]",
									dmSans125ClassName(),
								)}
							>
								Feedback
							</DialogTitle>
							<p
								className={cn(
									"text-[#737373] font-medium text-[16px] leading-[1.35]",
								)}
							>
								{FEEDBACK_QUESTION}
							</p>
						</DialogHeader>
						<DialogPrimitive.Close
							onClick={handleClose}
							disabled={isSubmitting}
							className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border border-[rgba(115,115,115,0.2)] shrink-0"
							style={{
								boxShadow:
									"0 0.711px 2.842px 0 rgba(0, 0, 0, 0.25), 0.178px 0.178px 0.178px 0 rgba(255, 255, 255, 0.10) inset",
							}}
						>
							<XIcon className="size-4 text-[#737373]" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>

					<div className="flex flex-col gap-3">
						<Textarea
							value={feedback}
							onChange={(e) => setFeedback(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Share your thoughts..."
							className={cn(
								"min-h-[120px] bg-[#0D121A] border border-[rgba(115,115,115,0.2)] text-[#fafafa] placeholder:text-[#737373] focus-visible:border-[#2261CA] focus-visible:ring-[#2261CA33] resize-none",
								dmSansClassName(),
							)}
							disabled={isSubmitting}
						/>

						<div className="flex justify-end gap-2">
							<Button
								variant="ghost"
								onClick={handleClose}
								disabled={isSubmitting}
								className={cn(
									"text-[#737373] hover:text-[#fafafa] hover:bg-[#293952]/40",
									dmSansClassName(),
								)}
							>
								Cancel
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={!feedback.trim() || isSubmitting}
								className={cn(
									"bg-[#2261CA] hover:bg-[#1a4fa0] text-white",
									dmSansClassName(),
								)}
							>
								{isSubmitting ? (
									<>
										<Loader2 className="size-4 animate-spin mr-2" />
										Submitting...
									</>
								) : (
									"Submit"
								)}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
