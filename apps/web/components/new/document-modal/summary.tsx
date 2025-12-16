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
				d="M1.33333 13.3333C0.966667 13.3333 0.652778 13.2028 0.391667 12.9417C0.130556 12.6806 0 12.3667 0 12V2.66667C0 2.3 0.130556 1.98611 0.391667 1.725C0.652778 1.46389 0.966667 1.33333 1.33333 1.33333H2V0H3.33333V1.33333H8.66667V0H10V1.33333H10.6667C11.0333 1.33333 11.3472 1.46389 11.6083 1.725C11.8694 1.98611 12 2.3 12 2.66667V6H10.6667V5.33333H1.33333V12H6V13.3333H1.33333ZM1.33333 4H10.6667V2.66667H1.33333V4ZM7.33333 13.3333V11.2833L11.0167 7.61667C11.1167 7.51667 11.2278 7.44444 11.35 7.4C11.4722 7.35556 11.5944 7.33333 11.7167 7.33333C11.85 7.33333 11.9778 7.35833 12.1 7.40833C12.2222 7.45833 12.3333 7.53333 12.4333 7.63333L13.05 8.25C13.1389 8.35 13.2083 8.46111 13.2583 8.58333C13.3083 8.70555 13.3333 8.82778 13.3333 8.95C13.3333 9.07222 13.3111 9.19722 13.2667 9.325C13.2222 9.45278 13.15 9.56667 13.05 9.66667L9.38333 13.3333H7.33333ZM8.33333 12.3333H8.96667L10.9833 10.3L10.6833 9.98333L10.3667 9.68333L8.33333 11.7V12.3333ZM10.6833 9.98333L10.3667 9.68333L10.9833 10.3L10.6833 9.98333Z"
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
			className="bg-[#14161A] py-3 px-4 rounded-[14px] space-y-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
		>
			<div className="flex items-center justify-between">
				<p className="text-[16px] font-semibold text-[#FAFAFA] line-clamp-1 leading-[125%]">
					Summary
				</p>
				<div className="text-[#737373] text-[10px] leading-[150%]">
					powered by supermemory
				</div>
			</div>
			<div className="text-[14px] text-[#FAFAFA] leading-[1.4] max-h-[117.6px] overflow-y-auto scrollbar-thin">
				{summary}
			</div>
			<div
				className={cn(
					"flex items-center",
					memoryEntries.length > 0 ? "justify-between" : "justify-end",
				)}
			>
				{memoryEntries.length > 0 && (
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
