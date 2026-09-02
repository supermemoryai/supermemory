"use client"

import { cn } from "@lib/utils"
import { analytics } from "@/lib/analytics"
import { COMPANY_BRAIN_CAL_HREF, type SetupCallSurface } from "@/lib/cal"
import { dmSans125ClassName } from "@/lib/fonts"

export function SetupCallButton({
	className,
	surface,
	children,
}: {
	className?: string
	surface: SetupCallSurface
	children?: React.ReactNode
}) {
	return (
		<a
			href={COMPANY_BRAIN_CAL_HREF}
			target="_blank"
			rel="noreferrer"
			onClick={() => analytics.brainSetupCallClicked({ surface })}
			className={cn(
				dmSans125ClassName(),
				"inline-flex items-center justify-center rounded-full border border-white/[0.08] bg-transparent px-4 py-2.5 text-[13px] font-medium text-[#E4E4E7] transition-colors hover:bg-white/[0.06] hover:text-[#FAFAFA]",
				className,
			)}
		>
			{children ?? "Set up Company Brain with us"}
		</a>
	)
}
