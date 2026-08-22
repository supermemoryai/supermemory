"use client"

import { ArrowRight, CreditCard } from "lucide-react"
import Link from "next/link"
import { useTrialStatus } from "@/hooks/use-trial-status"

export function TrialSetupBanner() {
	const { needsSetup, data } = useTrialStatus()
	if (!needsSetup) return null

	const endedTrial = data?.reason === "trial_ended"

	return (
		<div className="flex items-center justify-between gap-4 rounded-[14px] bg-[#191D24] px-4 py-3 ring-1 ring-[#4BA0FA]/20 sm:px-5">
			<div className="flex min-w-0 items-center gap-3">
				<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4BA0FA]/12">
					<CreditCard className="size-4 text-[#4BA0FA]" />
				</span>
				<div className="min-w-0">
					<p className="text-sm font-semibold text-fg-primary">
						{endedTrial
							? "Your Company Brain trial has ended"
							: "Finish setting up Company Brain"}
					</p>
					<p className="mt-0.5 truncate text-[12px] text-fg-muted">
						{endedTrial
							? "Move to Max or Scale to switch the brain back on."
							: "Add a card to start your 14-day trial. $0 today."}
					</p>
				</div>
			</div>
			<Link
				href={endedTrial ? "/?settings=billing" : "/onboarding"}
				className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1D1C1D] transition-transform hover:scale-[1.02]"
			>
				{endedTrial ? "Upgrade" : "Add card"}
				<ArrowRight className="size-3.5" />
			</Link>
		</div>
	)
}
