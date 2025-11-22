import { cn } from "@lib/utils"
import { ArrowUpIcon, SquareIcon } from "lucide-react"

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
				"bg-[#000000] border-[#161F2C] border p-2 rounded-lg flex-shrink-0 transition-opacity",
				disabled
					? "opacity-50 cursor-not-allowed"
					: "cursor-pointer hover:bg-[#161F2C]",
			)}
		>
			<ArrowUpIcon className="size-5 text-white" />
		</button>
	)
}

export function StopButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="bg-[#000000] border-[#161F2C] border p-2 rounded-lg flex-shrink-0 cursor-pointer hover:bg-[#161F2C] transition-opacity"
		>
			<SquareIcon className="size-4 text-white fill-white" />
		</button>
	)
}
