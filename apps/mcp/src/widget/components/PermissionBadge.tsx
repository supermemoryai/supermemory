interface Props {
	permission: string
}

export function PermissionBadge({ permission }: Props) {
	const isWrite = permission === "write"
	return (
		<span
			className="ml-auto mt-2 inline-flex h-8 min-w-[94px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-medium text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] sm:h-9 sm:min-w-[116px] sm:px-5 sm:text-[14px]"
			style={{ fontFamily: "var(--font-brand)" }}
		>
			{isWrite ? "Read/write" : "Read only"}
		</span>
	)
}
