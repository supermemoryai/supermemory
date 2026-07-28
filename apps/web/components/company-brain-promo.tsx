"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, XIcon } from "lucide-react"
import { Logo } from "@ui/assets/Logo"
import { Button } from "@repo/ui/components/button"
import { cn } from "@lib/utils"
import { analytics } from "@/lib/analytics"
import { dmSansClassName } from "@/lib/fonts"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"

const DISMISS_KEY = "supermemory-company-brain-promo-dismissed-v1"

export function CompanyBrainPromo() {
	const router = useRouter()
	const hasCompanyBrain = useHasCompanyBrain()
	const [dismissed, setDismissed] = useState(true)

	useEffect(() => {
		if (hasCompanyBrain) return
		try {
			setDismissed(localStorage.getItem(DISMISS_KEY) === "1")
		} catch {
			setDismissed(false)
		}
	}, [hasCompanyBrain])

	const visible = !hasCompanyBrain && !dismissed

	useEffect(() => {
		if (visible) analytics.companyBrainPromoSeen()
	}, [visible])

	if (!visible) return null

	const dismiss = () => {
		setDismissed(true)
		try {
			localStorage.setItem(DISMISS_KEY, "1")
		} catch {}
		analytics.companyBrainPromoDismissed()
	}

	return (
		<div
			className={cn(
				"flex items-center gap-4 rounded-xl bg-surface-card/60 px-4 py-4 backdrop-blur-md",
				"shadow-[0_12px_40px_rgba(0,0,0,0.22)]",
				dmSansClassName(),
			)}
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0562ef]">
				<Logo className="h-4 w-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[15px] font-semibold text-[#fafafa]">
					Give your team a Company Brain
				</p>
				<p className="text-[13px] text-[#a1a1a1]">
					Lives in your Slack. Answers from your team's tools, and brings things
					up before you ask.
				</p>
			</div>
			<Button
				className={cn(
					"rounded-full! h-9! min-h-9 shrink-0 gap-1.5 px-3 font-medium",
					dmSansClassName(),
				)}
				onClick={() => {
					analytics.companyBrainPromoClicked({ source: "dashboard_card" })
					router.push("/onboarding?new=1&mode=team")
				}}
				variant="headers"
			>
				Set it up
				<ArrowRight className="size-4 shrink-0" />
			</Button>
			<button
				aria-label="Dismiss"
				type="button"
				onClick={dismiss}
				className="shrink-0 rounded-full p-1.5 text-[#737373] transition-colors hover:text-[#fafafa]"
			>
				<XIcon className="size-4" />
			</button>
		</div>
	)
}
