import { cn } from "@lib/utils"
import { SyncLogoIcon } from "@ui/assets/icons"

function CalendarIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Calendar Icon</title>
			<path
				d="M1.33 13.33C0.97 13.33 0.65 13.2 0.39 12.94C0.13 12.68 0 12.37 0 12V2.67C0 2.3 0.13 1.99 0.39 1.73C0.65 1.46 0.97 1.33 1.33 1.33H2V0H3.33V1.33H8.67V0H10V1.33H10.67C11.03 1.33 11.35 1.46 11.61 1.73C11.87 1.99 12 2.3 12 2.67V6H10.67V5.33H1.33V12H6V13.33H1.33ZM1.33 4H10.67V2.67H1.33V4ZM7.33 13.33V11.28L11.02 7.62C11.12 7.52 11.23 7.44 11.35 7.4C11.47 7.36 11.59 7.33 11.72 7.33C11.85 7.33 11.98 7.36 12.1 7.41C12.22 7.46 12.33 7.53 12.43 7.63L13.05 8.25C13.14 8.35 13.21 8.46 13.26 8.58C13.31 8.71 13.33 8.83 13.33 8.95C13.33 9.07 13.31 9.2 13.27 9.32C13.22 9.45 13.15 9.57 13.05 9.67L9.38 13.33H7.33ZM8.33 12.33H8.97L10.98 10.3L10.68 9.98L10.37 9.68L8.33 11.7V12.33ZM10.68 9.98L10.37 9.68L10.98 10.3L10.68 9.98Z"
				fill="#737373"
			/>
		</svg>
	)
}

export function Summary({
	memoryEntries,
	summary,
	createdAt,
}: {
	memoryEntries: any[]
	summary: string
	createdAt: Date
}) {
	return (
		<div
			id="document-summary"
			className="bg-[#14161A] p-3 rounded-[14px] space-y-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
		>
			<div className="flex items-center justify-between">
				<p className="text-[16px] font-semibold text-[#FAFAFA] line-clamp-1 leading-[125%]">
					Summary
				</p>
				<div className="flex items-center gap-1 text-[#737373] opacity-50 text-[10px] leading-[150%]">
					<SyncLogoIcon className="size-[10px]" />
					powered by supermemory
				</div>
			</div>
			<div className="text-[14px] text-[#FAFAFA] leading-[1.4] max-h-[117.6px] overflow-y-auto scrollbar-thin">
				{summary}
			</div>
			<div
				className={cn(
					"flex items-center",
					memoryEntries?.length > 0 ? "justify-between" : "justify-end",
				)}
			>
				{memoryEntries?.length > 0 && (
					<p
						className={cn(
							"text-[#369BFD] line-clamp-1 flex items-center gap-1.5",
						)}
						style={{
							background:
								"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
							backgroundClip: "text",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
						}}
					>
						<SyncLogoIcon className="w-[17.1px] h-[13.87px]" />
						{memoryEntries.length}{" "}
						{memoryEntries.length === 1 ? "memory" : "memories"}
					</p>
				)}
				<p
					className={cn("text-[#737373] line-clamp-1 flex items-center gap-1")}
				>
					<CalendarIcon />
					{new Date(createdAt).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
					})}
				</p>
			</div>
		</div>
	)
}
