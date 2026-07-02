import { Badge } from "../design/ui"

interface Props {
	permission: string
}

export function PermissionBadge({ permission }: Props) {
	const isWrite = permission === "write"
	return (
		<Badge
			className="mt-2 self-start uppercase"
			variant={isWrite ? "accent" : "neutral"}
		>
			{isWrite ? "read/write" : "read only"}
		</Badge>
	)
}
