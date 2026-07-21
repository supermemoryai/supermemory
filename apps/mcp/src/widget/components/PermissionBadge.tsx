interface Props {
	permission: string
}

export function PermissionBadge({ permission }: Props) {
	const isWrite = permission === "write"
	return (
		<span className="inline-flex items-center rounded-full bg-bg-muted px-2 py-0.5 text-[10px] font-medium text-text-muted">
			{isWrite ? "Read / write" : "Read only"}
		</span>
	)
}
