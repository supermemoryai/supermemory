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
			className="min-h-[92px] w-full p-2.5"
			onClick={() => onClick(containerTag.containerTag)}
			variant={active ? "active" : "interactive"}
		>
			<div className="absolute right-2.5 top-2.5 text-[11px] font-medium leading-none">
				{access ? <PermissionBadge permission={access.permission} /> : null}
			</div>
			{active ? (
				<Check className="absolute bottom-2.5 right-2.5 size-3 shrink-0 text-accent" />
			) : null}
			<Stack className="h-full" gap="xs">
				<Stack align="center" direction="row" gap="sm" justify="between">
					<span
						className="min-w-0 max-w-[calc(100%-82px)] truncate text-sm font-medium text-white"
						style={{ fontFamily: "var(--font-brand)" }}
					>
						{name}
					</span>
				</Stack>
				<div className="truncate text-xs leading-normal text-[#8B8B8B]">
					{containerTag.containerTag}
				</div>
				{(containerTag.documentCount > 0 || containerTag.memoryCount > 0) && (
					<div className="mt-0.5 flex items-center gap-(--space-2) text-xs leading-normal text-[#8B8B8B]">
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
			</Stack>
		</Card>
	)
}
