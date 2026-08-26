"use client"

import { Check } from "lucide-react"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"
import { cn } from "@lib/utils"
import { SlackMark } from "@/components/brain-connector-icons"
import { cardStyle, tileStyle } from "@/components/brain-home/connections-board"
import { analytics } from "@/lib/analytics"
import { COMPANY_BRAIN_CAL_HREF } from "@/lib/cal"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
const dismissKey = (orgId: string) => `sm_brain_setup_modal_dismissed:${orgId}`

const CALL_FEATURES = [
	"We install Slack with you, live",
	"Connect Gmail, Notion, Linear and the rest",
	"Wire up plugins and answer your questions",
]

export function BrainSetupModal({
	enabled,
	orgId,
}: {
	enabled: boolean
	orgId: string | undefined
}) {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		// Also closes if the org stops being eligible while the dialog is open.
		if (!enabled || !orgId) {
			setOpen(false)
			return
		}
		let dismissed = false
		try {
			dismissed = localStorage.getItem(dismissKey(orgId)) === "1"
		} catch {}
		if (dismissed) return
		setOpen(true)
		analytics.brainSetupModalSeen()
	}, [enabled, orgId])

	const close = () => {
		setOpen(false)
		if (!orgId) return
		try {
			localStorage.setItem(dismissKey(orgId), "1")
		} catch {}
	}

	return (
		<Dialog open={open} onOpenChange={(next) => !next && close()}>
			<DialogContent
				showCloseButton={false}
				className={cn(
					"w-[94%]! max-w-[520px]! rounded-[22px] border border-white/[0.08] bg-[#1B1F24] p-5",
					dmSansClassName(),
				)}
				style={cardStyle}
			>
				<DialogTitle className="sr-only">Get set up</DialogTitle>

				<div>
					<p
						className={cn(
							"text-[15px] font-semibold text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						Get set up
					</p>
					<p className="mt-0.5 text-[12px] font-medium text-[#737373]">
						Your brain is ready. Let's get it working where your team is.
					</p>
				</div>

				<div className="relative mt-4 overflow-hidden rounded-[14px] border border-[#2261CA66] bg-[#00173C] p-5 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
					<span className="absolute right-5 top-5 inline-flex h-[18px] items-center rounded-[3px] bg-[#4BA0FA] px-1.5 text-[10px] font-bold uppercase tracking-[0.36px] text-[#00171A]">
						Fastest
					</span>

					<p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#7E9BC4]">
						Setup call
					</p>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-2 text-[24px] font-bold leading-none tracking-[-0.34px] text-[#FAFAFA]",
						)}
					>
						Do it with us
					</p>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-2 text-[13px] leading-snug text-[#C8D0DA]",
						)}
					>
						30 minutes, live with our team. You leave with a working brain.
					</p>

					<ul className="mt-5 flex flex-col gap-3">
						{CALL_FEATURES.map((feature) => (
							<li
								className="flex items-start gap-2 text-[13px] leading-snug text-[#C8D0DA]"
								key={feature}
							>
								<Check className="mt-0.5 size-3.5 shrink-0 text-[#fafafa]" />
								<span>{feature}</span>
							</li>
						))}
					</ul>

					<a
						href={COMPANY_BRAIN_CAL_HREF}
						target="_blank"
						rel="noreferrer"
						onClick={() => {
							analytics.brainSetupCallClicked({ surface: "setup_modal" })
							analytics.brainSetupModalPicked({ choice: "call" })
							close()
						}}
						className={cn(
							dmSans125ClassName(),
							"mt-5 flex h-11 items-center justify-center rounded-[10px] bg-white text-[14px] font-semibold text-[#1D1C1D] transition-transform hover:scale-[1.01]",
						)}
					>
						Book a setup call
					</a>
				</div>

				<div className="mt-3 overflow-hidden rounded-[12px] bg-[#14161A]">
					<div className="flex min-h-[52px] items-center gap-3 px-3 py-2.5">
						<div
							className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[rgba(82,89,102,0.2)] bg-[#080B0F]"
							style={tileStyle}
						>
							<SlackMark className="size-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-[13px] font-semibold leading-none text-[#fafafa]">
								Add to Slack
							</p>
							<p className="mt-1 truncate text-[11px] font-medium leading-none text-[#737373]">
								Rather set it up yourself? Takes a minute.
							</p>
						</div>
						<a
							href={`${BACKEND}/brain/slack/oauth/install`}
							onClick={() => {
								analytics.brainSetupModalPicked({ choice: "slack" })
								close()
							}}
							className={cn(
								dmSans125ClassName(),
								"flex w-[88px] shrink-0 items-center justify-center rounded-full bg-[#0D121A] px-3 py-1.5 text-[12px] font-medium text-[#fafafa] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80",
							)}
						>
							Install
						</a>
					</div>
				</div>

				<button
					type="button"
					onClick={close}
					className="mx-auto mt-4 block text-[12px] font-medium text-[#737373] transition-colors hover:text-[#A1A1AA]"
				>
					I'll do it later
				</button>
			</DialogContent>
		</Dialog>
	)
}
