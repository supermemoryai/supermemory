"use client"

import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { Logo } from "@ui/assets/Logo"
import { ArrowRight, Check, LoaderIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useSearchParams } from "next/navigation"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import { SlackMark } from "@/components/brain-connector-icons"
import { dmSans125ClassName } from "@/lib/fonts"
import { getBackendUrl } from "@/lib/url-helpers"

const GRADIENT_BG =
	"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)"
const GRADIENT_SHADOW =
	"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)"

type LinkPreview = {
	status: "ready"
	orgName: string
	teamId: string
	teamName: string | null
	slackDisplayName: string | null
	slackEmail: string | null
	signedInEmail: string
	isOrgMember: boolean
	requiresRelink: boolean
}

type PageState =
	| { kind: "loading" }
	| { kind: "ready"; preview: LinkPreview }
	| { kind: "linking"; preview: LinkPreview }
	| { kind: "linked"; orgName: string; teamId: string }
	| {
			kind: "error"
			reason: "expired" | "used" | "invalid" | "not_in_org" | "unknown"
	  }

const ERROR_COPY: Record<
	Extract<PageState, { kind: "error" }>["reason"],
	{ title: string; body: string }
> = {
	expired: {
		title: "This link has expired",
		body: "Return to Slack and ask Company Brain again to generate a fresh account link.",
	},
	used: {
		title: "This link was already used",
		body: "Your account may already be connected. Return to Slack and try your request again.",
	},
	invalid: {
		title: "We couldn't verify this link",
		body: "Return to Slack and use the latest link sent by Company Brain.",
	},
	not_in_org: {
		title: "This account isn't in the workspace",
		body: "Sign in with a Supermemory account that already belongs to this organization, or ask an admin to add you.",
	},
	unknown: {
		title: "We couldn't finish the connection",
		body: "Nothing was changed. Please try again, or return to Slack for a fresh link.",
	},
}

function loginRedirectUrl(): string {
	const redirect = window.location.href
	return `/login?redirect=${encodeURIComponent(redirect)}`
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
	return (await response.json().catch(() => ({}))) as Record<string, unknown>
}

export default function SlackAccountLinkPage() {
	const params = useSearchParams()
	const token = params.get("token")
	const { session, user, isSessionPending } = useAuth()
	const [state, setState] = useState<PageState>({ kind: "loading" })

	const loadPreview = useCallback(async () => {
		if (!token) {
			setState({ kind: "error", reason: "invalid" })
			return
		}
		const response = await fetch(
			`${getBackendUrl()}/brain/slack/account-link/${encodeURIComponent(token)}`,
			{
				credentials: "include",
				headers: { "X-App-Source": "nova" },
			},
		)
		const body = await readJson(response)
		if (!response.ok) {
			const reason = body.status
			setState({
				kind: "error",
				reason:
					reason === "expired" || reason === "used" || reason === "invalid"
						? reason
						: "unknown",
			})
			return
		}
		setState({ kind: "ready", preview: body as LinkPreview })
	}, [token])

	useEffect(() => {
		if (isSessionPending) return
		if (!session) {
			window.location.replace(loginRedirectUrl())
			return
		}
		void loadPreview().catch(() => {
			setState({ kind: "error", reason: "unknown" })
		})
	}, [isSessionPending, session, loadPreview])

	const confirmLink = async (preview: LinkPreview) => {
		if (!token) return
		setState({ kind: "linking", preview })
		try {
			const response = await fetch(
				`${getBackendUrl()}/brain/slack/account-link/${encodeURIComponent(token)}`,
				{
					method: "POST",
					credentials: "include",
					headers: { "X-App-Source": "nova" },
				},
			)
			const body = await readJson(response)
			if (!response.ok) {
				const reason = body.status
				setState({
					kind: "error",
					reason:
						reason === "not_in_org" ||
						reason === "expired" ||
						reason === "used" ||
						reason === "invalid"
							? reason
							: "unknown",
				})
				return
			}
			setState({
				kind: "linked",
				orgName:
					typeof body.orgName === "string" ? body.orgName : preview.orgName,
				teamId: preview.teamId,
			})
		} catch {
			setState({ kind: "error", reason: "unknown" })
		}
	}

	const switchAccount = async () => {
		await authClient.signOut()
		window.location.assign(loginRedirectUrl())
	}

	const recheck = () => {
		setState({ kind: "loading" })
		void loadPreview().catch(() => {
			setState({ kind: "error", reason: "unknown" })
		})
	}

	return (
		<CardShell>
			<AnimatePresence mode="wait">
				{state.kind === "loading" ? (
					<Fade key="loading">
						<Card>
							<div className="flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 text-center">
								<LoaderIcon className="size-5 animate-spin text-[#9AA0A6]" />
								<p className="text-[13px] text-[#737373]">
									Verifying your secure link…
								</p>
							</div>
						</Card>
					</Fade>
				) : null}

				{state.kind === "ready" || state.kind === "linking" ? (
					<Fade key="ready">
						<Card>
							<div className="px-6 pt-7 pb-5 text-center">
								<ConnectingHeader />
								<h1 className="mt-5 text-[19px] font-semibold tracking-[-0.2px] text-[#FAFAFA]">
									{state.preview.isOrgMember
										? `Link Slack to ${state.preview.orgName}`
										: `This account isn't in ${state.preview.orgName}`}
								</h1>
								<p className="mx-auto mt-1 max-w-[340px] text-[13px] text-[#737373]">
									{state.preview.isOrgMember
										? "Company Brain will recognize you by your Slack identity, even when your emails differ."
										: `Switch to a Supermemory account that belongs to ${state.preview.orgName}, or ask an admin to add ${state.preview.signedInEmail}.`}
								</p>
							</div>

							<div className="mx-6 h-px bg-white/[0.06]" />
							<InfoRow
								label="Slack"
								name={
									state.preview.slackDisplayName ||
									state.preview.teamName ||
									"Slack account"
								}
								detail={
									state.preview.slackEmail ||
									state.preview.teamName ||
									undefined
								}
							/>
							<div className="mx-6 h-px bg-white/[0.06]" />
							<InfoRow
								label="Supermemory"
								name={user?.name || "Signed-in account"}
								detail={state.preview.signedInEmail}
								warn={!state.preview.isOrgMember}
							/>
							<div className="mx-6 h-px bg-white/[0.06]" />

							{state.preview.isOrgMember && state.preview.requiresRelink ? (
								<p className="px-6 pt-4 text-[12px] leading-5 text-[#5C6470]">
									This Slack identity is linked to another Supermemory account.
									Confirming will replace that link for {state.preview.orgName}.
								</p>
							) : null}

							<div className="flex items-center justify-between gap-3 px-6 py-4">
								{state.preview.isOrgMember ? (
									<>
										<TextButton
											disabled={state.kind === "linking"}
											onClick={() => void switchAccount()}
										>
											Switch account
										</TextButton>
										<GradientButton
											disabled={state.kind === "linking"}
											onClick={() => void confirmLink(state.preview)}
										>
											{state.kind === "linking" ? (
												<LoaderIcon className="size-4 animate-spin" />
											) : (
												<>
													<Check className="size-4" />
													{state.preview.requiresRelink
														? "Replace and link"
														: "Confirm link"}
												</>
											)}
										</GradientButton>
									</>
								) : (
									<>
										<TextButton onClick={recheck}>
											I've been added — check again
										</TextButton>
										<NeutralButton onClick={() => void switchAccount()}>
											Switch account
										</NeutralButton>
									</>
								)}
							</div>

							<p className="px-6 pb-4 text-center text-[11px] text-[#5C5C5C]">
								Signed in as {state.preview.signedInEmail}
							</p>
						</Card>
					</Fade>
				) : null}

				{state.kind === "linked" ? (
					<Fade key="linked">
						<Card>
							<div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
								<div className="flex size-12 items-center justify-center rounded-[13px] bg-[#0B0D11] text-emerald-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
									<Check className="size-6" />
								</div>
								<h1 className="mt-5 text-[19px] font-semibold tracking-[-0.2px] text-[#FAFAFA]">
									Slack now knows who you are
								</h1>
								<p className="mt-1 max-w-[320px] text-[13px] text-[#737373]">
									Your account is linked to {state.orgName}. Return to Slack and
									retry your Company Brain request.
								</p>
								<a
									className={cn(
										"relative mt-6 flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-[10px] px-6",
										"text-[14px] font-medium tracking-[-0.14px] text-[#FAFAFA]",
										"transition-opacity hover:opacity-90",
									)}
									href={`slack://open?team=${encodeURIComponent(state.teamId)}`}
									style={{
										background: GRADIENT_BG,
										boxShadow: GRADIENT_SHADOW,
									}}
								>
									Return to Slack
									<ArrowRight className="size-4" />
									<div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
								</a>
							</div>
						</Card>
					</Fade>
				) : null}

				{state.kind === "error" ? (
					<Fade key="error">
						<Card>
							<ErrorState
								reason={state.reason}
								onSwitchAccount={() => void switchAccount()}
							/>
						</Card>
					</Fade>
				) : null}
			</AnimatePresence>
		</CardShell>
	)
}

function CardShell({ children }: { children: ReactNode }) {
	return (
		<main className="relative flex min-h-dvh items-center justify-center bg-[#08090C] p-4">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"radial-gradient(60% 50% at 50% 0%, rgba(75,160,250,0.05), transparent 70%)",
				}}
			/>
			<div
				className={cn("relative w-full max-w-[440px]", dmSans125ClassName())}
			>
				{children}
			</div>
		</main>
	)
}

function Card({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-col overflow-hidden rounded-[14px] bg-[#14161A] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
			{children}
		</div>
	)
}

function Fade({ children }: { children: ReactNode }) {
	return (
		<motion.div
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			initial={{ opacity: 0 }}
			transition={{ duration: 0.18 }}
		>
			{children}
		</motion.div>
	)
}

function ConnectingHeader() {
	return (
		<div className="flex items-center justify-center gap-3">
			<div className="flex size-12 items-center justify-center rounded-[13px] bg-[#0B0D11] text-[#FAFAFA] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
				<Logo className="h-6 w-auto text-white" />
			</div>
			<div className="flex items-center gap-1">
				{["a", "b", "c"].map((k, i) => (
					<span
						className="size-1.5 animate-pulse rounded-full bg-[#525660]"
						key={k}
						style={{
							animationDelay: `${i * 220}ms`,
							animationDuration: "1100ms",
						}}
					/>
				))}
			</div>
			<div className="flex size-12 items-center justify-center rounded-[13px] bg-[#0B0D11] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
				<SlackMark className="size-6" />
			</div>
		</div>
	)
}

function InfoRow({
	label,
	name,
	detail,
	warn,
}: {
	label: string
	name: string
	detail?: string
	warn?: boolean
}) {
	return (
		<div className="flex items-center justify-between gap-3 px-6 py-3.5">
			<div className="min-w-0">
				<span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#737373]">
					{label}
				</span>
				<p className="truncate text-[14px] font-medium text-[#FAFAFA]">
					{name}
				</p>
				{detail ? (
					<p className="truncate text-[12px] text-[#737373]">{detail}</p>
				) : null}
			</div>
			{warn ? (
				<span className="shrink-0 rounded-[7px] bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-300">
					Not a member
				</span>
			) : null}
		</div>
	)
}

function TextButton({
	children,
	onClick,
	disabled,
}: {
	children: ReactNode
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			className="rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-[#9AA0A6] transition-colors hover:text-[#FAFAFA] disabled:opacity-50"
			disabled={disabled}
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	)
}

function NeutralButton({
	children,
	onClick,
	disabled,
}: {
	children: ReactNode
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			className={cn(
				"flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#FAFAFA] px-5",
				"text-[13px] font-medium text-[#0B0D11]",
				"cursor-pointer transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50",
			)}
			disabled={disabled}
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	)
}

function GradientButton({
	children,
	onClick,
	disabled,
}: {
	children: ReactNode
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			className={cn(
				"relative flex h-11 min-w-[150px] shrink-0 items-center justify-center gap-2 rounded-[10px] px-6",
				"text-[14px] font-medium tracking-[-0.14px] text-[#FAFAFA]",
				"cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
			)}
			disabled={disabled}
			onClick={onClick}
			style={{ background: GRADIENT_BG, boxShadow: GRADIENT_SHADOW }}
			type="button"
		>
			{children}
			<div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
		</button>
	)
}

function ErrorState({
	reason,
	onSwitchAccount,
}: {
	reason: Extract<PageState, { kind: "error" }>["reason"]
	onSwitchAccount: () => void
}) {
	const copy = ERROR_COPY[reason]
	return (
		<div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
			<div className="flex size-12 items-center justify-center rounded-[13px] bg-[#0B0D11] text-amber-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
				<SlackMark className="size-6" />
			</div>
			<h1 className="mt-5 text-[19px] font-semibold tracking-[-0.2px] text-[#FAFAFA]">
				{copy.title}
			</h1>
			<p className="mt-1 max-w-[320px] text-[13px] text-[#737373]">
				{copy.body}
			</p>
			{reason === "not_in_org" ? (
				<div className="mt-6">
					<NeutralButton onClick={onSwitchAccount}>
						Switch account
					</NeutralButton>
				</div>
			) : (
				<a
					className="mt-6 flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/[0.08] bg-[#0B0D11] px-5 text-[13px] font-medium text-[#FAFAFA] transition-colors hover:bg-[#1B1E25]"
					href="slack://open"
				>
					Return to Slack
					<ArrowRight className="size-4" />
				</a>
			)}
		</div>
	)
}
