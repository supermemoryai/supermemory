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
				showCloseButton={false}
				className={cn(
					"w-[94%]! max-w-[440px]! max-h-[82dvh] border border-white/[0.08] bg-[#1B1F24] p-4 rounded-[22px]",
					"shadow-[0_2.842px_14.211px_rgba(0,0,0,0.25),inset_0.711px_0.711px_0.711px_rgba(255,255,255,0.10)]",
					dmSansClassName(),
				)}
			>
				<DialogTitle className="sr-only">Space Profile</DialogTitle>
				<div className="flex min-h-[420px] flex-col">
					<SpaceProfileContent
						containerTag={containerTag}
						onClose={() => onOpenChange(false)}
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
}
