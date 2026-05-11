"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet"
import { useSyncRuns } from "@/hooks/use-sync-runs"
import type { SyncRun } from "@/hooks/use-sync-runs"
import {
	formatRelativeTime,
	TRIGGER_TYPE_LABELS,
} from "@/components/settings/sync-utils"
import type { ConnectionResponseSchema } from "@repo/validation/api"
import type { z } from "zod"

type Connection = z.infer<typeof ConnectionResponseSchema>

const PROVIDER_TITLES: Record<string, string> = {
	"google-drive": "Google Drive",
	notion: "Notion",
	onedrive: "OneDrive",
	gmail: "Gmail",
	github: "GitHub",
	"web-crawler": "Web Crawler",
	s3: "S3",
}

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
	completed: { dot: "bg-[#00AC3F]", text: "text-[#00AC3F]" },
	failed: { dot: "bg-[#EF4444]", text: "text-[#EF4444]" },
	running: { dot: "bg-[#4BA0FA] animate-pulse", text: "text-[#4BA0FA]" },
}

function SyncRunCard({ run }: { run: SyncRun }) {
	const colors = STATUS_COLORS[run.status] ?? {
		dot: "bg-[#4BA0FA] animate-pulse",
		text: "text-[#4BA0FA]",
	}

	return (
		<div className="bg-[#14161A] rounded-[12px] p-4 border border-[rgba(82,89,102,0.2)] flex flex-col gap-2">
			{/* Top row: status + trigger + time */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className={cn("size-[7px] rounded-full", colors.dot)} />
					<span
						className={cn(
							dmSans125ClassName(),
							"font-medium text-[14px]",
							colors.text,
						)}
					>
						{run.status.charAt(0).toUpperCase() + run.status.slice(1)}
					</span>
					<span
						className={cn(
							dmSans125ClassName(),
							"text-[12px] text-[#737373] bg-[#1A1D24] rounded-full px-2 py-0.5",
						)}
					>
						{TRIGGER_TYPE_LABELS[run.triggerType] ?? run.triggerType}
					</span>
				</div>
				<span
					className={cn(dmSans125ClassName(), "text-[12px] text-[#737373]")}
				>
					{formatRelativeTime(run.startedAt)}
				</span>
			</div>

			{/* Middle row: item counts */}
			{(run.itemsProcessed > 0 || run.itemsFailed > 0) && (
				<div
					className={cn(
						dmSans125ClassName(),
						"flex items-center gap-1 text-[13px]",
					)}
				>
					<span className="text-[#737373]">{run.itemsProcessed} processed</span>
					{run.itemsFailed > 0 && (
						<span className="text-[#EF4444]">· {run.itemsFailed} failed</span>
					)}
				</div>
			)}

			{/* Bottom row: error message */}
			{run.error && (
				<p
					className={cn(
						dmSans125ClassName(),
						"text-[13px] text-[#EF4444]/80 break-words line-clamp-3",
					)}
				>
					{run.error}
				</p>
			)}
		</div>
	)
}

interface SyncHistorySheetProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	connection: Connection | null
}

export function SyncHistorySheet({
	open,
	onOpenChange,
	connection,
}: SyncHistorySheetProps) {
	const {
		data: syncRuns,
		isLoading,
		error,
		refetch,
	} = useSyncRuns(open && connection ? connection.id : "")

	const providerTitle = connection
		? (PROVIDER_TITLES[connection.provider] ?? connection.provider)
		: ""
	const email = connection?.email ?? ""

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="bg-[#0D0F14] border-l border-[#1A1D24] w-[400px] sm:max-w-[400px] gap-0 overflow-hidden p-0 [&>button]:text-[#737373] [&>button]:hover:text-[#FAFAFA]"
			>
				<SheetHeader className="px-6 pt-6 pb-4 border-b border-[#1A1D24]">
					<SheetTitle
						className={cn(dmSans125ClassName(), "text-[#FAFAFA] text-[18px]")}
					>
						Sync History
					</SheetTitle>
					<SheetDescription
						className={cn(dmSans125ClassName(), "text-[#737373] text-[14px]")}
					>
						{providerTitle}
						{email ? ` · ${email}` : ""}
					</SheetDescription>
				</SheetHeader>

				<div className="px-6 py-4 overflow-y-auto flex-1 flex flex-col gap-3">
					{isLoading && (
						<div className="flex items-center justify-center py-12">
							<div className="size-6 border-2 border-[#737373] border-t-transparent rounded-full animate-spin" />
						</div>
					)}

					{error && !isLoading && (
						<div className="flex flex-col items-center justify-center py-12 gap-2">
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[14px] text-[#737373]",
								)}
							>
								Failed to load sync history
							</p>
							<button
								type="button"
								onClick={() => refetch()}
								className={cn(
									dmSans125ClassName(),
									"text-[14px] text-[#4BA0FA] hover:text-[#4BA0FA]/80 underline cursor-pointer",
								)}
							>
								Try again
							</button>
						</div>
					)}

					{!isLoading && !error && syncRuns && syncRuns.length === 0 && (
						<div className="flex items-center justify-center py-12">
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[14px] text-[#737373]",
								)}
							>
								No sync runs yet
							</p>
						</div>
					)}

					{!isLoading &&
						!error &&
						syncRuns &&
						syncRuns.length > 0 &&
						syncRuns.map((run) => <SyncRunCard key={run.id} run={run} />)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
