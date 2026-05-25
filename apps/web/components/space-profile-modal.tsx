"use client"

import { dmSansClassName } from "@/lib/fonts"
import { SpaceProfileContent } from "@/components/space-profile-panel"
import { cn } from "@lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"

type SpaceProfileModalProps = {
	containerTag: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function SpaceProfileModal({
	containerTag,
	open,
	onOpenChange,
}: SpaceProfileModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"w-[94%]! max-w-[440px]! max-h-[82dvh] border-none bg-[#14161A] p-4 rounded-[22px]",
					"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
					dmSansClassName(),
				)}
			>
				<DialogTitle className="sr-only">Space Profile</DialogTitle>
				<div className="flex min-h-[420px] flex-col">
					<SpaceProfileContent containerTag={containerTag} />
				</div>
			</DialogContent>
		</Dialog>
	)
}
