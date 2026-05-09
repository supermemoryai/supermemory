"use client"

import { useState } from "react"
import { cn } from "@lib/utils"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { Loader2, XIcon } from "lucide-react"
import { Button } from "@ui/components/button"
import { Checkbox } from "@ui/components/checkbox"
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
	const [alsoDelete, setAlsoDelete] = useState(false)
	const displayName =
		providerName || (provider ? PROVIDER_LABELS[provider] : "this connection")

	const memoryNoun = documentCount === 1 ? "memory" : "memories"
	const hasMemories = documentCount > 0

	const handleConfirm = () => {
		onConfirm(alsoDelete)
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!isDeleting) {
					onOpenChange(o)
					if (!o) setAlsoDelete(false)
				}
			}}
		>
			<DialogContent
				className={cn(
					"w-[90%]! max-w-[480px]! border-none bg-[#1B1F24] flex flex-col p-5 gap-4 rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<div className="flex flex-col gap-3">
					<div className="flex justify-between items-center gap-4">
						<DialogTitle
							className={cn(
								"font-semibold text-[#fafafa] flex-1",
								dmSans125ClassName(),
							)}
						>
							Disconnect {displayName}?
						</DialogTitle>
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

					<DialogDescription className="text-[#737373] text-[14px] leading-[1.45]">
						{hasMemories ? (
							<>
								Sync stops. Your{" "}
								<span className="text-[#fafafa] font-medium">
									{documentCount} {memoryNoun}
								</span>{" "}
								stay in Supermemory.
							</>
						) : (
							<>Sync stops. No memories were imported from this connection.</>
						)}
					</DialogDescription>

					{hasMemories && (
						<label
							htmlFor="also-delete-memories"
							className="flex items-center gap-2.5 cursor-pointer text-[13px] py-1 select-none"
						>
							<Checkbox
								id="also-delete-memories"
								checked={alsoDelete}
								onCheckedChange={(checked) => setAlsoDelete(checked === true)}
								disabled={isDeleting}
							/>
							<span className="text-[#B5B8BD]">
								Also delete the {documentCount} imported {memoryNoun}{" "}
								<span className="text-[#737373] italic">(optional)</span>
							</span>
						</label>
					)}

					<div className="flex items-center justify-end gap-2 pt-1">
						<Button
							variant="ghost"
							disabled={isDeleting}
							onClick={() => {
								onOpenChange(false)
								setAlsoDelete(false)
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
								alsoDelete && "bg-red-600! hover:bg-red-700! text-white",
							)}
						>
							{isDeleting ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Disconnecting...
								</>
							) : alsoDelete ? (
								`Disconnect and delete ${memoryNoun}`
							) : (
								"Disconnect"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
