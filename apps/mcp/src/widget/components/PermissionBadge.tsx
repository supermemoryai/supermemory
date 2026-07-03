interface Props {
	permission: string
}

export function PermissionBadge({ permission }: Props) {
	const isWrite = permission === "write"
	return (
		<span
			className="text-[#8B8B8B]"
			style={{ fontFamily: "var(--font-brand)" }}
		>
			{isWrite ? "Read/write" : "Read only"}
		</span>
	)
}
