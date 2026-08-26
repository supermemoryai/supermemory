"use client"

import { CalendarClock } from "lucide-react"
import { Button } from "@ui/components/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/tooltip"
import { cn } from "@lib/utils"
import { analytics } from "@/lib/analytics"
import { COMPANY_BRAIN_CAL_HREF } from "@/lib/cal"
import { useTrialStatus } from "@/hooks/use-trial-status"
import { dmSansClassName } from "@/lib/fonts"

export function SetupCallLink() {
	const { data } = useTrialStatus()
	if (!data?.active) return null

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					asChild
					variant="headers"
					className={cn(
						"size-9! min-h-9 min-w-9 shrink-0 rounded-full! border-[#161F2C]/90 px-0! text-muted-foreground hover:text-foreground",
						dmSansClassName(),
					)}
					aria-label="Book a setup call"
				>
					<a
						href={COMPANY_BRAIN_CAL_HREF}
						target="_blank"
						rel="noreferrer"
						onClick={() =>
							analytics.brainSetupCallClicked({ surface: "header" })
						}
					>
						<CalendarClock className="size-4 shrink-0" />
					</a>
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className={dmSansClassName()}>
				Book a setup call
			</TooltipContent>
		</Tooltip>
	)
}
