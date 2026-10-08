import type { NamespaceAccess, NamespaceInfo } from "../../shared/types"
import { cn } from "../design/lib/cn"
import { formatNamespaceLabel } from "../lib/formatNamespace"
import { PermissionBadge } from "./PermissionBadge"

interface Props {
	namespace: NamespaceInfo
	active: boolean
	access?: NamespaceAccess
	onClick: (namespace: string) => void
}

export function SpaceCard({ namespace, active, access, onClick }: Props) {
	const name = formatNamespaceLabel(namespace.namespace)
	const docs = namespace.documentCount
	const mems = namespace.memoryCount
	const meta =
		docs > 0 || mems > 0
			? `${docs} doc${docs === 1 ? "" : "s"} · ${mems} ${mems === 1 ? "memory" : "memories"}`
			: "No memories yet"

	return (
		<button
			className="space-card"
			data-active={active}
			onClick={() => onClick(namespace.namespace)}
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
