import { Button } from "@repo/ui/components/button"
import { Loader2, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"

interface ActionButtonsProps {
	onCancel: () => void
	onSubmit?: () => void
	submitText: string
	submitIcon?: LucideIcon
	isSubmitting?: boolean
	isSubmitDisabled?: boolean
	submitType?: "button" | "submit"
	className?: string
}

export function ActionButtons({
	onCancel,
	onSubmit,
	submitText,
	submitIcon: SubmitIcon,
	isSubmitting = false,
	isSubmitDisabled = false,
	submitType = "submit",
	className = "",
}: ActionButtonsProps) {
	return (
		<div className={`flex gap-3 order-1 sm:order-2 justify-end ${className}`}>
			<Button
				className="hover:bg-foreground/10 border-none flex-1 sm:flex-initial cursor-pointer"
				onClick={onCancel}
				type="button"
				variant="ghost"
			>
				Cancel
			</Button>

			<motion.div
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				className="flex-1 sm:flex-initial"
			>
				<Button
					className="w-full cursor-pointer"
					disabled={isSubmitting || isSubmitDisabled}
					onClick={submitType === "button" ? onSubmit : undefined}
					type={submitType}
				>
					{isSubmitting ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
							{submitText.includes("Add")
								? "Adding..."
								: submitText.includes("Upload")
									? "Uploading..."
									: "Processing..."}
						</>
					) : (
						<>
							{SubmitIcon && <SubmitIcon className="h-4 w-4 mr-2" />}
							{submitText}
						</>
					)}
				</Button>
			</motion.div>
		</div>
	)
}
