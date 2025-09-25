interface MemoryUsageRingProps {
	memoriesUsed: number
	memoriesLimit: number
	className?: string
}

export function MemoryUsageRing({
	memoriesUsed,
	memoriesLimit,
	className = "",
}: MemoryUsageRingProps) {
	const usagePercentage = memoriesUsed / memoriesLimit
	const strokeColor =
		memoriesUsed >= memoriesLimit * 0.8 ? "rgb(251 191 36)" : "rgb(34 197 94)"
	const circumference = 2 * Math.PI * 10

	return (
		<div
			className={`relative group cursor-help self-center sm:self-end mb-1 hidden sm:block ${className}`}
			title={`${memoriesUsed} of ${memoriesLimit} memories used`}
		>
			<svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
				<title>{`${memoriesUsed} of ${memoriesLimit} memories used`}</title>
				{/* Background circle */}
				<circle
					cx="12"
					cy="12"
					fill="none"
					r="10"
					stroke="rgb(255 255 255 / 0.1)"
					strokeWidth="2"
				/>
				{/* Progress circle */}
				<circle
					className="transition-all duration-300"
					cx="12"
					cy="12"
					fill="none"
					r="10"
					stroke={strokeColor}
					strokeDasharray={`${circumference}`}
					strokeDashoffset={`${circumference * (1 - usagePercentage)}`}
					strokeLinecap="round"
					strokeWidth="2"
				/>
			</svg>

			{/* Tooltip on hover */}
			<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
				{memoriesUsed} / {memoriesLimit}
			</div>
		</div>
	)
}
