"use client"

import { useState } from "react"
import { cn } from "@lib/utils"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { Loader2, XIcon } from "lucide-react"
import { Button } from "@ui/components/button"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogDescription,
} from "@repo/ui/components/dialog"

const PROVIDER_LABELS: Record<string, string> = {
	"google-drive": "Google Drive",
	notion: "Notion",
	onedrive: "OneDrive",
	gmail: "Gmail",
	github: "GitHub",
	"web-crawler": "Web Crawler",
	s3: "S3",
}

interface RemoveConnectionDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	providerName?: string
	provider?: string
	documentCount?: number
	onConfirm: (deleteDocuments: boolean) => void
	isDeleting: boolean
}

export function RemoveConnectionDialog({
	open,
	onOpenChange,
	providerName,
	provider,
	documentCount = 0,
	onConfirm,
	isDeleting,
}: RemoveConnectionDialogProps) {
	const [action, setAction] = useState<"keep" | "delete">("keep")
	const displayName =
		providerName || (provider ? PROVIDER_LABELS[provider] : "this connection")

	const handleConfirm = () => {
		onConfirm(action === "delete")
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!isDeleting) {
					onOpenChange(o)
					if (!o) setAction("keep")
				}
			}}
		>
			<DialogContent
				className={cn(
					"w-[90%]! max-w-[500px]! border-none bg-[#1B1F24] flex flex-col p-4 gap-4 rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<div className="flex flex-col gap-4">
					<div className="flex justify-between items-start gap-4">
						<div className="pl-1 space-y-1 flex-1">
							<DialogTitle
								className={cn(
									"font-semibold text-[#fafafa]",
									dmSans125ClassName(),
								)}
							>
								Remove connection
							</DialogTitle>
							<DialogDescription className="text-[#737373] font-medium text-[16px] leading-[1.35]">
								What would you like to do with the{" "}
								{documentCount > 0 ? (
									<>
										<span className="text-[#fafafa] font-medium">
											{documentCount}
										</span>{" "}
										memories from{" "}
									</>
								) : (
									<>memories from </>
								)}
								<span className="text-[#fafafa] font-medium">
									{displayName}
								</span>
								?
							</DialogDescription>
						</div>
						<DialogPrimitive.Close
							disabled={isDeleting}
							className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border border-[rgba(115,115,115,0.2)] shrink-0"
							style={{
								boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
							}}
						>
							<XIcon stroke="#737373" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>

					<div className="space-y-3">
						<button
							type="button"
							onClick={() => setAction("keep")}
							className={cn(
								"flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-colors w-full text-left",
								action === "keep"
									? "bg-[#14161A] border border-[rgba(82,89,102,0.3)]"
									: "bg-[#14161A]/50 border border-transparent hover:border-[rgba(82,89,102,0.2)]",
							)}
							style={{
								boxShadow:
									action === "keep"
										? "0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08)"
										: "none",
							}}
						>
							<div
								className={cn(
									"w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
									action === "keep" ? "border-blue-500" : "border-[#737373]",
								)}
							>
								{action === "keep" && (
									<div className="w-2 h-2 rounded-full bg-blue-500" />
								)}
							</div>
							<div className="flex flex-col">
								<span className="text-[#fafafa] text-sm font-medium">
									Remove connection only
								</span>
								<span className="text-[#737373] text-xs">
									Disconnect the integration but keep all imported memories
								</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => setAction("delete")}
							className={cn(
								"flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-colors w-full text-left",
								action === "delete"
									? "bg-[#14161A] border border-[rgba(220,38,38,0.3)]"
									: "bg-[#14161A]/50 border border-transparent hover:border-[rgba(82,89,102,0.2)]",
							)}
							style={{
								boxShadow:
									action === "delete"
										? "0px 1px 2px 0px rgba(87,0,0,0.1), inset 0px 0px 0px 1px rgba(67,43,43,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08)"
										: "none",
							}}
						>
							<div
								className={cn(
									"w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
									action === "delete" ? "border-red-500" : "border-[#737373]",
								)}
							>
								{action === "delete" && (
									<div className="w-2 h-2 rounded-full bg-red-500" />
								)}
							</div>
							<div className="flex flex-col">
								<span className="text-[#fafafa] text-sm font-medium">
									Remove connection and memories
								</span>
								<span className="text-[#737373] text-xs">
									Permanently delete all memories imported from this connection
								</span>
							</div>
						</button>
					</div>

					<div className="flex items-center justify-end gap-2 pt-1">
						<Button
							variant="ghost"
							disabled={isDeleting}
							onClick={() => {
								onOpenChange(false)
								setAction("keep")
							}}
							className="text-[#737373] cursor-pointer rounded-full"
						>
							Cancel
						</Button>
						<Button
							variant="insideOut"
							disabled={isDeleting}
							onClick={handleConfirm}
							className={cn(
								action === "delete" &&
									"bg-red-600! hover:bg-red-700! text-white",
							)}
						>
							{isDeleting ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Removing...
								</>
							) : action === "delete" ? (
								"Remove & delete memories"
							) : (
								"Remove connection"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
