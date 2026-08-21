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
				"relative flex items-start gap-3 rounded-xl bg-surface-card/60 px-4 py-4 backdrop-blur-md sm:items-center sm:gap-4",
				"shadow-[0_12px_40px_rgba(0,0,0,0.22)]",
				dmSansClassName(),
			)}
		>
			<div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0562ef] sm:mt-0">
				<Logo className="h-4 w-5" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-2 sm:contents">
				<div className="min-w-0 pt-1 pr-7 sm:flex-1 sm:pt-0 sm:pr-0">
					<p className="text-[15px] font-semibold text-[#fafafa]">
						Give your team a Company Brain
					</p>
					<p className="text-[11px] leading-snug text-[#a1a1a1] sm:text-[13px] sm:leading-normal">
						Lives in your Slack. Answers from your team's tools, and brings
						things up before you ask.
					</p>
				</div>
				<Button
					className={cn(
						"h-9! min-h-9 w-fit shrink-0 self-end gap-1.5 rounded-full! px-3 font-medium sm:self-auto",
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
			</div>
			<button
				aria-label="Dismiss"
				type="button"
				onClick={dismiss}
				className="absolute right-2.5 top-2.5 shrink-0 rounded-full p-1.5 text-[#737373] transition-colors hover:text-[#fafafa] sm:static"
			>
				<XIcon className="size-4" />
			</button>
		</div>
	)
}
