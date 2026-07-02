interface Props {
	permission: string
}

export function PermissionBadge({ permission }: Props) {
	const isWrite = permission === "write"
	return (
		<span
			className="ml-auto mt-2 inline-flex h-8 min-w-[92px] items-center justify-center rounded-full border border-[#0D121A] bg-[#080B0F] px-4 text-[12px] font-semibold text-text-primary shadow-[0_6px_18px_rgba(0,0,0,0.28)] transition-colors group-hover:bg-[#0D121A]"
			style={{ fontFamily: "var(--font-brand)" }}
		>
			{isWrite ? "Read/write" : "Read only"}
		</span>
	)
}
