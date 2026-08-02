"use client"

import { cn } from "@lib/utils"
import { Hourglass, TriangleAlert, X } from "lucide-react"
import { useSettingsModal } from "@/components/settings/settings-modal"
import { useBrainTrial } from "@/hooks/use-brain-trial"
import { dmSansClassName } from "@/lib/fonts"

export function BrainTrialPill({ className }: { className?: string }) {
	const trial = useBrainTrial()
	const { openSettings } = useSettingsModal()

	if (trial.state === "none") return null

	const ended = trial.state === "ended"
	const days = trial.daysRemaining
	const closing = !ended && days != null && days <= 3
	const label = ended
		? "Trial ended · Activate"
		: days != null
			? `Trial · ${days} day${days === 1 ? "" : "s"} left`
			: "Free trial"
	const Icon = ended ? X : closing ? TriangleAlert : Hourglass

	return (
		<button
			type="button"
			onClick={() => openSettings("billing")}
			aria-label={ended ? "Trial ended — activate Scale" : label}
			className={cn(
				"inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-medium transition-colors",
				ended
					? "border-[#E5735A]/30 bg-[#E5735A]/10 text-[#E5735A] hover:bg-[#E5735A]/15"
					: closing
						? "border-[#E5A45A]/30 bg-[#E5A45A]/10 text-[#E5A45A] hover:bg-[#E5A45A]/15"
						: "border-white/[0.08] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white/90",
				dmSansClassName(),
				className,
			)}
		>
			<Icon className="size-3" />
			{label}
		</button>
	)
}
