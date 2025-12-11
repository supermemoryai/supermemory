import { cn } from "@lib/utils"
import { SquareIcon } from "lucide-react"

export function SendButton({
	onClick,
	disabled,
}: {
	onClick: () => void
	disabled: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"bg-[#000000] border-[#161F2C] border p-2 rounded-lg shrink-0 transition-opacity",
				disabled
					? "opacity-50 cursor-not-allowed"
					: "cursor-pointer hover:bg-[#161F2C]",
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
					d="M12 6L10.55 7.4L7 3.85L7 16L5 16L5 3.85L1.45 7.4L-4.37114e-07 6L6 -2.62268e-07L12 6Z"
					fill="#FAFAFA"
				/>
			</svg>
		</button>
	)
}

export function StopButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="bg-[#000000] border-[#161F2C] border p-2 rounded-lg shrink-0 cursor-pointer hover:bg-[#161F2C] transition-opacity"
		>
			<SquareIcon className="size-4 text-white fill-white" />
		</button>
	)
}
