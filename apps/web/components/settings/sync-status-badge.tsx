"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { formatRelativeTime } from "@/components/settings/sync-utils"

function deriveStatus(
	syncInProgress?: boolean,
	lastSyncedAt?: number,
): "syncing" | "synced" | "idle" {
	if (syncInProgress) return "syncing"
	if (lastSyncedAt) return "synced"
	return "idle"
}

interface SyncStatusBadgeProps {
	syncInProgress?: boolean
	lastSyncedAt?: number
	className?: string
}

export function SyncStatusBadge({
	syncInProgress,
	lastSyncedAt,
	className,
}: SyncStatusBadgeProps) {
	const status = deriveStatus(syncInProgress, lastSyncedAt)

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<div
				className={cn(
					"size-[7px] rounded-full",
					status === "syncing" && "bg-[#4BA0FA] animate-pulse",
					status === "synced" && "bg-[#00AC3F]",
					status === "idle" && "bg-[#737373]",
				)}
			/>
			{status === "syncing" && (
				<span
					className={cn(
						dmSans125ClassName(),
						"font-medium text-[16px] tracking-[-0.16px] text-[#4BA0FA]",
					)}
				>
					Syncing...
				</span>
			)}
			{status === "synced" && (
				<>
					<span
						className={cn(
							dmSans125ClassName(),
							"font-medium text-[16px] tracking-[-0.16px] text-[#00AC3F]",
						)}
					>
						Synced
					</span>
					<div className="size-[3px] rounded-full bg-[#737373]" />
					<span
						className={cn(
							dmSans125ClassName(),
							"font-medium text-[14px] tracking-[-0.14px] text-[#737373]",
						)}
					>
						{formatRelativeTime(lastSyncedAt)}
					</span>
				</>
			)}
			{status === "idle" && (
				<span
					className={cn(
						dmSans125ClassName(),
						"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
					)}
				>
					Waiting for first sync
				</span>
			)}
		</div>
	)
}
