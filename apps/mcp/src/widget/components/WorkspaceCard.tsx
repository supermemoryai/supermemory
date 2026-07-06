import type { ContainerTag, ContainerTagAccess } from "../../shared/types"
import { Card } from "../design/ui"
import { Check } from "../lib/icons"
import { formatTagLabel } from "../lib/formatTag"
import { PermissionBadge } from "./PermissionBadge"

interface Props {
	containerTag: ContainerTag
	active: boolean
	access?: ContainerTagAccess
	onClick: (containerTag: string) => void
}

export function WorkspaceCard({
	containerTag,
	active,
	access,
	onClick,
}: Props) {
	const name = containerTag.name || formatTagLabel(containerTag.containerTag)
	return (
		<Card
			as="button"
			className="workspace-card w-full p-3"
			onClick={() => onClick(containerTag.containerTag)}
			variant={active ? "active" : "interactive"}
		>
			<div className="workspace-card-inner">
				<div className="workspace-card-main">
					<div className="workspace-card-heading">
						<span
							className="workspace-card-title truncate text-sm font-medium text-text-primary"
							style={{ fontFamily: "var(--font-brand)" }}
						>
							{name}
						</span>
						{active ? (
							<Check
								aria-hidden
								className="workspace-card-check size-3 shrink-0 text-accent"
							/>
						) : null}
					</div>
					{(containerTag.documentCount > 0 ||
						containerTag.memoryCount > 0) && (
						<div className="workspace-card-meta flex items-center gap-(--space-2) text-[11px] leading-normal text-text-muted">
							<span>
								{containerTag.documentCount} doc
								{containerTag.documentCount === 1 ? "" : "s"}
							</span>
							<span aria-hidden className="opacity-40">
								·
							</span>
							<span>
								{containerTag.memoryCount}{" "}
								{containerTag.memoryCount === 1 ? "memory" : "memories"}
							</span>
						</div>
					)}
				</div>
				{access ? (
					<div className="workspace-card-trailing">
						<PermissionBadge permission={access.permission} />
					</div>
				) : null}
			</div>
		</Card>
	)
}
