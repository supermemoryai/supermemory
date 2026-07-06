interface Props {
	permission: string
}

export function PermissionBadge({ permission }: Props) {
	const isWrite = permission === "write"
	return (
		<span
			className="text-text-muted"
			style={{ fontFamily: "var(--font-brand)" }}
		>
			{isWrite ? "Read/write" : "Read only"}
		</span>
	)
}
