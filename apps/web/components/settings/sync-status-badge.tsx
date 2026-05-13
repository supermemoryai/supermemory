import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { formatRelativeTime } from "@/components/settings/sync-utils"

function deriveStatus(
	syncInProgress?: boolean,
	lastSyncedAt?: number,
	isExpired?: boolean,
): "syncing" | "synced" | "expired" | "idle" {
	if (isExpired) return "expired"
	if (syncInProgress) return "syncing"
	if (lastSyncedAt) return "synced"
	return "idle"
}

interface SyncStatusBadgeProps {
	syncInProgress?: boolean
	lastSyncedAt?: number
	isExpired?: boolean
	className?: string
}

export function SyncStatusBadge({
	syncInProgress,
	lastSyncedAt,
	isExpired,
	className,
}: SyncStatusBadgeProps) {
	const status = deriveStatus(syncInProgress, lastSyncedAt, isExpired)

	return (
		<div className={cn("flex items-center gap-1.5", className)}>
			<div
				className={cn(
					"size-[6px] rounded-full",
					status === "syncing" && "bg-[#4BA0FA] animate-pulse",
					status === "synced" && "bg-[#00AC3F]",
					status === "expired" && "bg-[#EF4444]",
					status === "idle" && "bg-[#737373]",
				)}
			/>
			{status === "syncing" && (
				<span
					className={cn(
						dmSans125ClassName(),
						"font-medium text-[13px] tracking-[-0.13px] text-[#4BA0FA]",
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
							"font-medium text-[13px] tracking-[-0.13px] text-[#00AC3F]",
						)}
					>
						Synced
					</span>
					<div className="size-[3px] rounded-full bg-[#737373]" />
					<span
						className={cn(
							dmSans125ClassName(),
							"font-medium text-[12px] tracking-[-0.12px] text-[#737373]",
						)}
					>
						{formatRelativeTime(lastSyncedAt)}
					</span>
				</>
			)}
			{status === "expired" && (
				<span
					className={cn(
						dmSans125ClassName(),
						"font-medium text-[13px] tracking-[-0.13px] text-[#EF4444]",
					)}
				>
					Disconnected
				</span>
			)}
			{status === "idle" && (
				<span
					className={cn(
						dmSans125ClassName(),
						"font-medium text-[13px] tracking-[-0.13px] text-[#737373]",
					)}
				>
					Waiting for first sync
				</span>
			)}
		</div>
	)
}
