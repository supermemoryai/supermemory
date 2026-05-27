"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import NovaOrb from "@/components/nova/nova-orb"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { Plus, Check, Loader2 } from "lucide-react"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const W = 300
const H = 200
const CX = W / 2
const CY = H / 2
const R = 74

function orbPoint(index: number, total: number) {
	const angle = (-90 + (360 / Math.max(total, 1)) * index) * (Math.PI / 180)
	return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) }
}

export function TeamInviteBeat() {
	const { org } = useAuth()
	const [emails, setEmails] = useState<string[]>([])
	const [draft, setDraft] = useState("")
	const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
	const [error, setError] = useState("")

	const addEmail = useCallback(() => {
		const e = draft.trim().toLowerCase()
		if (!EMAIL_RE.test(e)) {
			setError("Enter a valid email")
			return
		}
		if (emails.includes(e)) {
			setDraft("")
			return
		}
		setEmails((prev) => [...prev, e])
		setDraft("")
		setError("")
	}, [draft, emails])

	const sendInvites = useCallback(async () => {
		if (emails.length === 0 || !org?.id) return
		setStatus("sending")
		setError("")
		const results = await Promise.allSettled(
			emails.map((email) =>
				authClient.organization.inviteMember({
					email,
					role: "member",
					organizationId: org.id,
					resend: true,
				}),
			),
		)
		const failed = results.filter((r) => r.status === "rejected").length
		if (failed === emails.length) {
			setError("Could not send invites. Try again later.")
			setStatus("idle")
			return
		}
		setStatus("sent")
	}, [emails, org?.id])

	return (
		<div className="w-full rounded-2xl border border-[#0D121A] bg-[#080B0F] p-5">
			<div className="text-center space-y-1">
				<p className="text-white text-base font-medium">
					Make Nova a team brain
				</p>
				<p className={cn("text-xs text-[#6b7c91]", dmSansClassName())}>
					One memory for your whole team. Add a few people to share it.
				</p>
			</div>

			<div className="relative mx-auto mt-4" style={{ width: W, height: H }}>
				<svg
					className="absolute inset-0"
					width={W}
					height={H}
					viewBox={`0 0 ${W} ${H}`}
					aria-hidden="true"
				>
					<title>Team constellation</title>
					<AnimatePresence>
						{emails.map((email, i) => {
							const p = orbPoint(i, emails.length)
							return (
								<motion.line
									key={email}
									x1={CX}
									y1={CY}
									x2={p.x}
									y2={p.y}
									stroke="#2261CA"
									strokeWidth={1}
									initial={{ opacity: 0 }}
									animate={{ opacity: 0.5 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.3 }}
								/>
							)
						})}
					</AnimatePresence>
				</svg>

				<div className="absolute" style={{ left: CX - 44, top: CY - 44 }}>
					<NovaOrb size={88} />
				</div>

				<AnimatePresence>
					{emails.map((email, i) => {
						const p = orbPoint(i, emails.length)
						return (
							<motion.div
								key={email}
								layout
								initial={{ scale: 0, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0, opacity: 0 }}
								transition={{ type: "spring", stiffness: 380, damping: 22 }}
								className="absolute flex items-center justify-center"
								style={{ left: p.x - 16, top: p.y - 16, width: 32, height: 32 }}
							>
								<NovaOrb size={32} />
								<span className="absolute text-[11px] font-semibold text-white uppercase">
									{email[0]}
								</span>
							</motion.div>
						)
					})}
				</AnimatePresence>
			</div>

			{status === "sent" ? (
				<div className="mt-2 flex items-center justify-center gap-2 text-sm text-[#65D08C]">
					<Check className="size-4" />
					<span>
						Invited {emails.length} {emails.length === 1 ? "person" : "people"}
					</span>
				</div>
			) : (
				<div className="mt-2 space-y-2">
					<div className="flex items-center gap-2">
						<input
							type="email"
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault()
									addEmail()
								}
							}}
							placeholder="teammate@company.com"
							className="flex-1 rounded-xl border border-[#52596633] bg-[#070E1B] px-3 py-2.5 text-sm text-white placeholder:text-[#525966] focus:border-[#2261CA] focus:outline-none"
						/>
						<button
							type="button"
							onClick={addEmail}
							aria-label="Add teammate"
							className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#52596633] text-[#8B9DB5] hover:border-[#2261CA]/50 hover:text-white transition-colors cursor-pointer"
						>
							<Plus className="size-4" />
						</button>
					</div>

					{error && <p className="text-xs text-[#FF8A8A] pl-1">{error}</p>}

					{emails.length > 0 && (
						<button
							type="button"
							onClick={sendInvites}
							disabled={status === "sending"}
							className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white cursor-pointer hover:scale-[0.98] active:scale-[0.96] transition-transform border-[0.5px] border-[#2261CA]/40 disabled:opacity-60 disabled:hover:scale-100"
							style={{
								background:
									"linear-gradient(180deg, #0D1E3A -26.14%, #060C18 100%)",
							}}
						>
							{status === "sending" && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Send {emails.length} {emails.length === 1 ? "invite" : "invites"}
						</button>
					)}
				</div>
			)}
		</div>
	)
}
