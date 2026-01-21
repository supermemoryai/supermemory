import type { LucideIcon } from "lucide-react"

interface TabButtonProps {
	icon: LucideIcon
	label: string
	isActive: boolean
	onClick: () => void
}

export function TabButton({
	icon: Icon,
	label,
	isActive,
	onClick,
}: TabButtonProps) {
	return (
		<button
			className={`flex items-center gap-1.5 text-xs sm:text-xs px-4 sm:px-3 py-2 sm:py-1 h-8 sm:h-6 rounded-sm transition-colors whitespace-nowrap min-w-0 ${
				isActive ? "bg-white/10" : "hover:bg-white/5"
			}`}
			onClick={onClick}
			type="button"
		>
			<Icon className="h-4 w-4 sm:h-3 sm:w-3" />
			{label}
		</button>
	)
}
