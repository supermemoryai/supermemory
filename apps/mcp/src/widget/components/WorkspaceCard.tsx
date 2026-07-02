import type { ContainerTag, ContainerTagAccess } from "../../shared/types"
import { Card, Stack } from "../design/ui"
import { Check } from "../lib/icons"
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
	const name = containerTag.name || containerTag.containerTag
	return (
		<Card
			as="button"
			className="min-h-[108px] w-full p-3"
			onClick={() => onClick(containerTag.containerTag)}
			variant={active ? "active" : "interactive"}
		>
			<Stack className="h-full" gap="sm">
				<Stack align="center" direction="row" gap="sm" justify="between">
					<span
						className="min-w-0 truncate text-(length:--text-sm) font-medium text-text-primary"
						style={{ fontFamily: "var(--font-brand)" }}
					>
						{name}
					</span>
					{active ? <Check className="size-4 shrink-0 text-accent" /> : null}
				</Stack>
				<div className="truncate font-mono text-[13px] text-text-muted">
					{containerTag.containerTag}
				</div>
				{(containerTag.documentCount > 0 || containerTag.memoryCount > 0) && (
					<div className="mt-auto flex items-center gap-(--space-2) text-(length:--text-xs) text-text-muted">
						<span>
							{containerTag.documentCount} doc
							{containerTag.documentCount === 1 ? "" : "s"}
						</span>
						<span aria-hidden>·</span>
						<span>
							{containerTag.memoryCount}{" "}
							{containerTag.memoryCount === 1 ? "memory" : "memories"}
						</span>
					</div>
				)}
				{access ? <PermissionBadge permission={access.permission} /> : null}
			</Stack>
		</Card>
	)
}
