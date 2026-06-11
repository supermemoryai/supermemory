import { cn } from "@lib/utils"
import { SquareIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/tooltip"

export function SendButton({
	onClick,
	disabled,
	disabledTooltip = "Type a message to send",
}: {
	onClick: () => void
	disabled: boolean
	disabledTooltip?: string
}) {
	const button = (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"bg-surface-card border-surface-border border p-2 rounded-lg shrink-0 transition-opacity",
				disabled
					? "opacity-50 cursor-not-allowed"
					: "cursor-pointer hover:bg-surface-hover",
			)}
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 12 16"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>Send Icon</title>
				<path
					d="M12 6L10.55 7.4L7 3.85L7 16L5 16L5 3.85L1.45 7.4L-4.37e-07 6L6 -2.62e-07L12 6Z"
					fill="#9CA3AF"
				/>
			</svg>
		</button>
	)

	if (disabled) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="inline-flex">{button}</span>
				</TooltipTrigger>
				<TooltipContent side="top">{disabledTooltip}</TooltipContent>
			</Tooltip>
		)
	}

	return button
}

export function StopButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="bg-surface-card border-surface-border border p-2 rounded-lg shrink-0 cursor-pointer hover:bg-surface-hover transition-opacity"
		>
			<SquareIcon className="size-4 text-white fill-white" />
		</button>
	)
}
