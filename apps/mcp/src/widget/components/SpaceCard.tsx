import type { ContainerTag, ContainerTagAccess } from "../../shared/types"
import { cn } from "../design/lib/cn"
import { formatTagLabel } from "../lib/formatTag"
import { PermissionBadge } from "./PermissionBadge"

interface Props {
	containerTag: ContainerTag
	active: boolean
	access?: ContainerTagAccess
	onClick: (containerTag: string) => void
}

export function SpaceCard({ containerTag, active, access, onClick }: Props) {
	const name = containerTag.name || formatTagLabel(containerTag.containerTag)
	const docs = containerTag.documentCount
	const mems = containerTag.memoryCount
	const meta =
		docs > 0 || mems > 0
			? `${docs} doc${docs === 1 ? "" : "s"} · ${mems} ${mems === 1 ? "memory" : "memories"}`
			: "No memories yet"

	return (
		<button
			className="space-card"
			data-active={active}
			onClick={() => onClick(containerTag.containerTag)}
			type="button"
		>
			<span className="space-card-inner">
				<span className="space-card-main">
					<span
						className={cn(
							"space-card-title truncate text-sm font-medium",
							active ? "text-accent" : "text-text-primary",
						)}
					>
						{name}
					</span>
					<span className="space-card-meta text-[11px] leading-normal text-text-muted">
						{meta}
					</span>
				</span>
				<span className="space-card-trailing">
					{access ? <PermissionBadge permission={access.permission} /> : null}
				</span>
			</span>
		</button>
	)
}
