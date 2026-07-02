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
			className="min-h-[132px] w-full p-4"
			onClick={() => onClick(containerTag.containerTag)}
			variant={active ? "active" : "interactive"}
		>
			<Stack className="h-full" gap="xs">
				<Stack align="center" direction="row" gap="sm" justify="between">
					<span
						className="min-w-0 truncate text-sm font-medium text-white"
						style={{ fontFamily: "var(--font-brand)" }}
					>
						{name}
					</span>
					{active ? <Check className="size-4 shrink-0 text-accent" /> : null}
				</Stack>
				<div className="truncate text-xs leading-relaxed text-[#8B8B8B]">
					{containerTag.containerTag}
				</div>
				{(containerTag.documentCount > 0 || containerTag.memoryCount > 0) && (
					<div className="mt-1 flex items-center gap-(--space-2) text-xs leading-relaxed text-[#8B8B8B]">
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
				<div className="flex-1" />
				{access ? <PermissionBadge permission={access.permission} /> : null}
			</Stack>
		</Card>
	)
}
