"use client"

import { Gmail, GoogleDrive, Granola, MCPIcon, Notion } from "@ui/assets/icons"
import { GradientLogo } from "@ui/assets/Logo"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { SlackMark } from "@/components/brain-connector-icons"
import { analytics } from "@/lib/analytics"
import { dmSans125ClassName } from "@/lib/fonts"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

export const CHECKOUT_RETURN_PARAM = "brainTrial"

const TRIAL_DAYS = 14
/** The only reminder that lands before the charge; 15 and 17 are post-trial. */
const REMINDER_DAY = 12
const MONTHLY_PRICE = "$100"

function checkoutReturnUrl(): string {
	const url = new URL(window.location.href)
	url.searchParams.set(CHECKOUT_RETURN_PARAM, "complete")
	return url.toString()
}

function dayOffset(days: number): string {
	const at = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
	return at.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const ORBIT = [
	{ key: "slack", r: 74, deg: 0, node: <SlackMark className="size-4" /> },
	{ key: "gmail", r: 74, deg: 128, node: <Gmail className="size-4" /> },
	{ key: "notion", r: 74, deg: 236, node: <Notion className="size-4" /> },
	{ key: "drive", r: 112, deg: 58, node: <GoogleDrive className="size-4" /> },
	{ key: "granola", r: 112, deg: 172, node: <Granola className="size-4" /> },
	{ key: "mcp", r: 112, deg: 296, node: <MCPIcon className="size-4" /> },
]

const SPIN = "motion-safe:animate-[spin_44s_linear_infinite]"
const SPIN_BACK = "motion-safe:animate-[spin_44s_linear_infinite_reverse]"

function BrainPanel() {
	return (
		<div className="relative hidden aspect-[3/2] w-[56%] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0B0E13] ring-1 ring-white/[0.06] md:flex">
			<span
				aria-hidden="true"
				className="pointer-events-none absolute size-44 rounded-full bg-[#4BA0FA]/15 blur-3xl"
			/>

			<div aria-hidden="true" className="relative size-[248px]">
				<span className="absolute left-1/2 top-1/2 size-[148px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]" />
				<span className="absolute left-1/2 top-1/2 size-[224px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />

				<div className={cn("absolute inset-0", SPIN)}>
					{ORBIT.map(({ key, r, deg, node }) => (
						<span
							key={key}
							style={{
								transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${r}px)`,
							}}
							className="absolute left-1/2 top-1/2 flex size-8 items-center justify-center rounded-full bg-[#161B22] ring-1 ring-white/10"
						>
							<span
								className={cn("flex", SPIN_BACK)}
								style={{ rotate: `${-deg}deg` }}
							>
								{node}
							</span>
						</span>
					))}
				</div>

				<GradientLogo className="absolute left-1/2 top-1/2 h-auto w-[68px] -translate-x-1/2 -translate-y-1/2" />
			</div>

			<p className="absolute inset-x-0 bottom-5 text-center text-[13px] font-medium text-[#8b8b8b]">
				Meet <span className="text-[#4BA0FA]">@supermemory</span>
			</p>
		</div>
	)
}

function TimelineRow({
	date,
	title,
	value,
	current,
}: {
	date: string
	title: string
	value?: string
	current?: boolean
}) {
	return (
		<li className="relative flex items-start gap-3 pl-[18px]">
			<span
				aria-hidden="true"
				className={cn(
					"absolute left-0 top-[5px] size-[7px] rounded-full",
					current
						? "bg-[#fafafa] ring-4 ring-[#fafafa]/10"
						: "bg-[#2b3138] ring-1 ring-white/15",
				)}
			/>
			<div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="text-[13px] font-medium text-[#fafafa]">{date}</span>
					<span className="text-[12px] leading-snug text-[#8b8b8b]">
						{title}
					</span>
				</div>
				{value ? (
					<span className="shrink-0 text-[14px] font-medium text-[#fafafa] tabular-nums">
						{value}
					</span>
				) : null}
			</div>
		</li>
	)
}

export function StepTrial({ onActive }: { onActive: () => void }) {
	const [starting, setStarting] = useState(false)

	const start = async () => {
		if (starting) return
		setStarting(true)
		analytics.brainTrialCheckoutStarted()
		try {
			const res = await fetch(`${BACKEND}/brain/trial/start`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ successUrl: checkoutReturnUrl() }),
			})
			const data = (await res.json()) as {
				checkoutUrl?: string | null
				status?: string
				error?: string
			}
			if (res.status === 409 || data.error === "trial_unavailable") {
				throw new Error(
					"This workspace has already used its free trial. Upgrade from billing to continue.",
				)
			}
			if (!res.ok) throw new Error(data.error ?? "Couldn't start the trial.")
			if (data.checkoutUrl) {
				window.location.href = data.checkoutUrl
				return
			}
			if (data.status === "already_active" || data.status === "attached") {
				onActive()
				return
			}
			throw new Error("Couldn't start the trial.")
		} catch (error) {
			console.error("Failed to start trial:", error)
			toast.error(
				error instanceof Error ? error.message : "Couldn't start the trial.",
			)
			setStarting(false)
		}
	}

	return (
		<div className="flex gap-6">
			<div className="flex min-w-0 flex-1 flex-col gap-5">
				<div className="flex flex-col gap-1.5">
					<h2
						className={cn(
							dmSans125ClassName(),
							"text-[22px] leading-tight font-medium text-[#fafafa]",
						)}
					>
						Start your {TRIAL_DAYS}-day free trial
					</h2>
					<p className="text-[13px] leading-relaxed text-[#8b8b8b]">
						Add a payment method to start. You will not be charged today. We
						will email you before your first payment.
					</p>
				</div>

				<ol className="relative flex flex-col gap-5 py-1">
					<span
						aria-hidden="true"
						className="absolute left-[3px] top-2.5 bottom-[22px] w-px bg-white/10"
					/>
					<TimelineRow
						date="Today"
						title="Full access to Company Brain"
						value="$0"
						current
					/>
					<TimelineRow
						date={dayOffset(REMINDER_DAY)}
						title="We email you before the charge"
					/>
					<TimelineRow
						date={dayOffset(TRIAL_DAYS)}
						title="Trial ends"
						value={`${MONTHLY_PRICE}/mo`}
					/>
				</ol>

				<div className="flex flex-col items-center gap-3">
					<Button
						variant="insideOut"
						onClick={start}
						disabled={starting}
						className="w-full justify-center rounded-full px-5 py-[11px] text-[13px] font-medium text-[#fafafa]"
					>
						{starting ? (
							<>
								Opening checkout…
								<Loader2 className="size-3.5 animate-spin" />
							</>
						) : (
							<>
								Start free trial
								<ArrowRight className="size-3.5" />
							</>
						)}
					</Button>
					<p className="flex items-center gap-1.5 text-[12px] text-[#737373]">
						<ShieldCheck className="size-3.5" />
						Secured by Stripe · Cancel in one click
					</p>
				</div>
			</div>

			<BrainPanel />
		</div>
	)
}
