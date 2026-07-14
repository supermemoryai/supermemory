"use client"

import { useMemo, useState } from "react"
import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import { ArrowRight, Loader2, Mail, Plus, Trash2, Users } from "lucide-react"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"

const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

const inputClass =
	"bg-[#0F1217] border border-[rgba(82,89,102,0.2)] rounded-[12px] text-[#fafafa] text-[14px] placeholder:text-[#525D6E] h-12 shadow-none focus-visible:ring-0 focus-visible:border-[rgba(115,115,115,0.3)] transition-colors"

export interface TeamValues {
	invites: { email: string; role: "admin" | "member" }[]
	visibility: "team-private" | "org-shared"
	suggestChanges: boolean
}

interface Props {
	mode: "personal" | "team"
	isScale: boolean
	inviteDomain: string | null
	values: TeamValues
	onChange: (next: TeamValues) => void
	onContinue: () => void
	onSkip?: () => void
	onUpgrade: () => void
	submitting?: boolean
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

export function StepTeam({
	mode,
	inviteDomain,
	values,
	onChange,
	onContinue,
	onSkip,
	submitting,
}: Props) {
	const [draft, setDraft] = useState("")
	const domainOrFallback = (inviteDomain || "acme.com").trim().toLowerCase()

	const addInvites = (text: string) => {
		const found = text.match(EMAIL_RE) ?? []
		if (found.length === 0) return
		const existing = new Set(values.invites.map((i) => i.email.toLowerCase()))
		const next: { email: string; role: "admin" | "member" }[] = []
		for (const raw of found) {
			const email = raw.trim().toLowerCase()
			if (!email || existing.has(email)) continue
			existing.add(email)
			next.push({ email, role: "member" })
		}
		if (next.length === 0) {
			setDraft("")
			return
		}
		onChange({ ...values, invites: [...values.invites, ...next] })
		setDraft("")
	}

	const removeInvite = (email: string) => {
		onChange({
			...values,
			invites: values.invites.filter((i) => i.email !== email),
		})
	}

	const setRole = (email: string, role: "admin" | "member") => {
		onChange({
			...values,
			invites: values.invites.map((i) =>
				i.email === email ? { ...i, role } : i,
			),
		})
	}

	const domainBreakdown = useMemo(() => {
		const counts = new Map<string, number>()
		for (const inv of values.invites) {
			const at = inv.email.lastIndexOf("@")
			if (at < 0) continue
			const domain = inv.email.slice(at + 1).toLowerCase()
			counts.set(domain, (counts.get(domain) ?? 0) + 1)
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1])
	}, [values.invites])

	if (mode === "personal") {
		return (
			<div
				className="max-w-xl mx-auto rounded-[22px] bg-[#1B1F24] p-10 text-center"
				style={modalCardStyle}
			>
				<div
					className="size-12 rounded-[14px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center mx-auto"
					style={inputBevelStyle}
				>
					<Users className="size-5 text-[#737373]" />
				</div>
				<p
					className={cn(
						"text-[20px] font-semibold text-[#fafafa] mt-5",
						dmSans125ClassName(),
					)}
				>
					Going solo — for now
				</p>
				<p className="text-[14px] text-[#737373] mt-2 leading-[1.5] font-medium">
					You're in Personal mode, so there's no team step. Switch to Team in
					the top bar anytime to invite others.
				</p>
				<Button
					variant="insideOut"
					onClick={onContinue}
					className="mt-6 rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
				>
					Continue
					<ArrowRight className="size-3.5" />
				</Button>
			</div>
		)
	}

	const count = values.invites.length

	return (
		<div className="max-w-2xl mx-auto">
			<section
				className="rounded-[22px] bg-[#1B1F24] p-7 md:p-8"
				style={modalCardStyle}
			>
				<div className="flex items-start gap-4">
					<div
						className="size-12 rounded-[14px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center shrink-0"
						style={inputBevelStyle}
					>
						<Users className="size-5 text-[#fafafa]" />
					</div>
					<div className="min-w-0 flex-1">
						<p
							className={cn(
								"text-[20px] font-semibold text-[#fafafa]",
								dmSans125ClassName(),
							)}
						>
							Invite your team
						</p>
						<p className="text-[14px] text-[#737373] mt-1 leading-[1.5] font-medium">
							A brain gets sharper as more people contribute. You can also do
							this later.
						</p>
					</div>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault()
						addInvites(draft)
					}}
					className="mt-6 flex gap-2"
				>
					<div className="relative flex-1">
						<Mail className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
						<Input
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onPaste={(e) => {
								const pasted = e.clipboardData.getData("text")
								if (pasted && EMAIL_RE.test(pasted)) {
									e.preventDefault()
									addInvites(pasted)
								}
							}}
							placeholder={`alex@${domainOrFallback}, sam@${domainOrFallback}, …`}
							className={cn(inputClass, "pl-10")}
							style={inputBevelStyle}
						/>
					</div>
					<Button
						type="submit"
						variant="insideOut"
						disabled={!draft.trim()}
						className="rounded-full h-12 px-4 text-[13px] font-medium text-[#fafafa]"
					>
						<Plus className="size-4" />
						Add
					</Button>
				</form>

				<p className="text-[11px] text-[#525D6E] font-medium mt-2 pl-2">
					Paste multiple emails at once — we'll split them for you.
				</p>

				{count === 0 ? (
					<div className="mt-6 rounded-[14px] border border-dashed border-[rgba(82,89,102,0.3)] bg-[#14161A]/40 px-5 py-8 text-center">
						<p className="text-[13px] text-[#737373] font-medium">
							No invites yet.
						</p>
						<p className="text-[12px] text-[#525D6E] font-medium mt-1">
							Try{" "}
							<span className="text-[#A1A1AA]">alex@{domainOrFallback}</span>,{" "}
							<span className="text-[#A1A1AA]">sam@{domainOrFallback}</span>,
							etc.
						</p>
					</div>
				) : (
					<>
						<div className="mt-6 flex items-center justify-between gap-3 px-1">
							<p className="text-[10px] uppercase tracking-[0.08em] text-[#737373] font-semibold">
								{count} invite{count === 1 ? "" : "s"}
							</p>
							{domainBreakdown.length > 0 && (
								<div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#737373] font-medium">
									{domainBreakdown.slice(0, 3).map(([d, n]) => (
										<span
											key={d}
											className="px-2 py-0.5 rounded-full bg-[#0D121A] border border-[rgba(115,115,115,0.15)]"
										>
											{d} · {n}
										</span>
									))}
								</div>
							)}
						</div>
						<div className="mt-3 space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
							{values.invites.map((inv) => (
								<div
									key={inv.email}
									className="flex items-center gap-3 rounded-[12px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] px-3 py-2"
									style={inputBevelStyle}
								>
									<div className="size-7 rounded-full bg-[#0D121A] border border-[rgba(115,115,115,0.15)] flex items-center justify-center shrink-0">
										<span className="text-[11px] font-semibold text-[#A1A1AA] uppercase">
											{(inv.email[0] ?? "?").toUpperCase()}
										</span>
									</div>
									<span className="text-[13px] text-[#fafafa] flex-1 font-medium truncate">
										{inv.email}
									</span>
									<Select
										value={inv.role}
										onValueChange={(r) =>
											setRole(inv.email, r as "admin" | "member")
										}
									>
										<SelectTrigger className="w-24 h-7 bg-transparent border border-[rgba(82,89,102,0.2)] rounded-full text-[#A1A1AA] text-[11px] font-medium px-3 shadow-none focus:ring-0">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="bg-[#14161A] border-[rgba(82,89,102,0.2)] rounded-[12px]">
											<SelectItem
												value="member"
												className="text-[#fafafa] focus:bg-[#1B1F24] text-[13px]"
											>
												Member
											</SelectItem>
											<SelectItem
												value="admin"
												className="text-[#fafafa] focus:bg-[#1B1F24] text-[13px]"
											>
												Admin
											</SelectItem>
										</SelectContent>
									</Select>
									<button
										type="button"
										onClick={() => removeInvite(inv.email)}
										className="text-[#737373] hover:text-[#fafafa] p-1 transition-colors"
										aria-label={`Remove ${inv.email}`}
									>
										<Trash2 className="size-4" />
									</button>
								</div>
							))}
						</div>
					</>
				)}

				<div className="mt-6 flex items-center justify-end gap-[22px] border-t border-white/[0.06] pt-5">
					<button
						type="button"
						onClick={onSkip ?? onContinue}
						disabled={submitting}
						className="text-[#737373] font-medium text-[14px] hover:text-[#999] transition-colors disabled:opacity-50"
					>
						Skip for now
					</button>
					<Button
						variant="insideOut"
						onClick={onContinue}
						disabled={submitting}
						className="rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
					>
						{submitting ? (
							<>
								Sending…
								<Loader2 className="size-3.5 animate-spin" />
							</>
						) : (
							<>
								{count > 0
									? `Send ${count} invite${count === 1 ? "" : "s"}`
									: "Continue"}
								<ArrowRight className="size-3.5" />
							</>
						)}
					</Button>
				</div>
			</section>
		</div>
	)
}
