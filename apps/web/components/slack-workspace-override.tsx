"use client"

import { SlackMark } from "@/components/brain-connector-icons"
import { dmSans125ClassName } from "@/lib/fonts"
import { getBackendUrl } from "@/lib/url-helpers"
import {
	getSafeAppDestination,
	getSafeSlackOverrideDestination,
	inspectSlackWorkspaceOverride,
	isSlackOverrideConfirmationValid,
	resolveSlackWorkspaceOverride,
	type SlackWorkspaceOverrideError,
	type SlackWorkspaceOverrideRequest,
} from "@/lib/slack-workspace-override"
import { cn } from "@lib/utils"
import { Logo } from "@ui/assets/Logo"
import {
	AlertCircle,
	Check,
	Clock3,
	History,
	LoaderCircle,
	RefreshCw,
	ShieldCheck,
	TriangleAlert,
	X,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

type ScreenState =
	| { kind: "loading" }
	| { kind: "checking"; indeterminateAction: boolean }
	| { kind: "pending"; request: SlackWorkspaceOverrideRequest }
	| {
			kind: "terminal"
			error: SlackWorkspaceOverrideError
			indeterminateAction?: boolean
	  }

const restartHref = `${getBackendUrl()}/brain/slack/oauth/install`

function CardShell({ children }: { children: React.ReactNode }) {
	return (
		<main
			className={cn(
				"relative flex h-dvh overflow-y-auto bg-[#08090C] p-4 text-[#FAFAFA]",
				dmSans125ClassName(),
			)}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(75,160,250,0.06),transparent_70%)]"
			/>
			<div className="relative mx-auto my-auto w-full max-w-[460px] shrink-0 overflow-hidden rounded-[14px] bg-[#14161A] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
				{children}
			</div>
		</main>
	)
}

function ConnectingHeader() {
	return (
		<div
			aria-label="Supermemory connecting to Slack"
			className="flex items-center justify-center gap-3"
			role="img"
		>
			<div className="flex size-12 items-center justify-center rounded-[13px] bg-[#0B0D11] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
				<Logo className="h-6 w-auto text-white" />
			</div>
			<div aria-hidden="true" className="flex gap-[5px]">
				{[0, 1, 2].map((dot) => (
					<span className="size-1.5 rounded-full bg-[#525660]" key={dot} />
				))}
			</div>
			<div className="flex size-12 items-center justify-center rounded-[13px] bg-[#0B0D11] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
				<SlackMark className="size-6" />
			</div>
		</div>
	)
}

function LoadingState({ checking = false }: { checking?: boolean }) {
	return (
		<CardShell>
			<div className="flex min-h-44 items-center justify-center p-8">
				<output className="flex items-center gap-3 text-[13px] text-[#9AA0A6]">
					<LoaderCircle
						aria-hidden="true"
						className="size-5 animate-spin text-[#C73B1B] motion-reduce:animate-none"
					/>
					{checking
						? "Checking the current reassignment status…"
						: "Loading Slack reassignment request…"}
				</output>
			</div>
		</CardShell>
	)
}

const terminalContent = {
	expired: {
		title: "This request has expired",
		body: "Your Slack authorization timed out before you confirmed. Supermemory did not reassign the workspace. To reassign it, restart from Slack — you’ll re-authorize as part of that flow.",
		icon: Clock3,
	},
	cancelled: {
		title: "This request was cancelled",
		body: "Supermemory did not reassign the workspace. Slack authorization already happened, so the prior connection may need to be authorized again.",
		icon: X,
	},
	workspace_changed: {
		title: "The Slack connection changed",
		body: "The connection changed while this page was open. Supermemory did not apply this request. Start a new install from Slack to continue safely.",
		icon: History,
	},
	unauthorized: {
		title: "Sign in to continue",
		body: "The admin who started this request must sign in to the original Supermemory organization and restart or complete the flow.",
		icon: ShieldCheck,
	},
	forbidden: {
		title: "This request needs the original admin",
		body: "The admin who started this request must use the original Supermemory organization. If their role changed, restart from Slack after restoring access.",
		icon: ShieldCheck,
	},
	not_found: {
		title: "This request is unavailable",
		body: "It may be invalid or no longer available. Supermemory did not reassign a workspace from this page. Start a new install from Slack.",
		icon: AlertCircle,
	},
	invalid_request: {
		title: "This request is invalid",
		body: "This page needs a valid Slack reassignment request. Start the install again from Slack.",
		icon: AlertCircle,
	},
	unknown: {
		title: "This request could not be loaded",
		body: "Supermemory did not reassign the workspace. Start the install again from Slack.",
		icon: AlertCircle,
	},
	network_error: {
		title: "The request status is unknown",
		body: "Supermemory could not verify whether the last action completed. Check the current status before taking another action.",
		icon: AlertCircle,
	},
} as const

function TerminalState({
	error,
	indeterminateAction = false,
	loginHref,
	onRetry,
}: {
	error: SlackWorkspaceOverrideError
	indeterminateAction?: boolean
	loginHref: string
	onRetry?: () => void
}) {
	const content =
		terminalContent[error.code as keyof typeof terminalContent] ??
		terminalContent.unknown
	const body =
		error.code === "network_error" && !indeterminateAction
			? "Supermemory could not load the current request status. Check the status before taking an action."
			: content.body
	const Icon = content.icon
	const stateRef = useRef<HTMLElement>(null)

	useEffect(() => {
		stateRef.current?.focus()
	}, [])

	return (
		<CardShell>
			<section
				aria-live="assertive"
				aria-labelledby="override-state-title"
				className="px-7 py-8 text-center"
				ref={stateRef}
				role="alert"
				tabIndex={-1}
			>
				<div className="mx-auto flex size-[52px] items-center justify-center rounded-[14px] bg-[#0B0D11] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
					<Icon aria-hidden="true" className="size-[26px] text-[#C79A2E]" />
				</div>
				<h1
					className="mt-5 text-[19px] font-semibold tracking-[-0.2px]"
					id="override-state-title"
				>
					{content.title}
				</h1>
				<p className="mx-auto mt-2.5 max-w-[350px] text-[13px] leading-[1.55] text-[#9AA0A6]">
					{body}
				</p>
				<div className="mt-6 flex flex-col gap-3">
					{error.code === "network_error" && onRetry && (
						<button
							className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-white text-[14px] font-semibold text-[#1D1C1D] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
							onClick={onRetry}
							type="button"
						>
							<RefreshCw aria-hidden="true" className="size-4" /> Check status
						</button>
					)}
					{error.code === "unauthorized" ? (
						<a
							className="flex h-11 items-center justify-center rounded-[12px] bg-white text-[14px] font-semibold text-[#1D1C1D] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
							href={loginHref}
						>
							Sign in to continue
						</a>
					) : error.code !== "network_error" ? (
						<a
							className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-white text-[14px] font-semibold text-[#1D1C1D] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
							href={restartHref}
							referrerPolicy="no-referrer"
						>
							<RefreshCw aria-hidden="true" className="size-4" /> Start over
							from Slack
						</a>
					) : null}
					<a
						className="rounded-lg py-1 text-[12px] text-[#737373] transition-colors hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						href="/"
					>
						Go to Supermemory
					</a>
				</div>
			</section>
		</CardShell>
	)
}

function PendingState({
	request,
	onTerminal,
	onIndeterminate,
}: {
	request: SlackWorkspaceOverrideRequest
	onTerminal: (error: SlackWorkspaceOverrideError) => void
	onIndeterminate: () => void
}) {
	const [confirmation, setConfirmation] = useState("")
	const [submitting, setSubmitting] = useState<"confirm" | "cancel" | null>(
		null,
	)
	const [error, setError] = useState<SlackWorkspaceOverrideError | null>(null)
	const errorRef = useRef<HTMLParagraphElement>(null)
	const valid = isSlackOverrideConfirmationValid(confirmation, request.teamName)

	useEffect(() => {
		const remaining = new Date(request.expiresAt).getTime() - Date.now()
		if (!Number.isFinite(remaining)) return
		if (remaining <= 0) {
			onTerminal({ code: "expired", status: 410 })
			return
		}
		const timeout = window.setTimeout(
			() => onTerminal({ code: "expired", status: 410 }),
			remaining,
		)
		return () => window.clearTimeout(timeout)
	}, [request.expiresAt, onTerminal])

	const showError = useCallback((nextError: SlackWorkspaceOverrideError) => {
		setError(nextError)
		setSubmitting(null)
		requestAnimationFrame(() => errorRef.current?.focus())
	}, [])

	const submitAction = async (action: "confirm" | "cancel") => {
		if (submitting || (action === "confirm" && !valid)) return
		setSubmitting(action)
		setError(null)
		const result = await resolveSlackWorkspaceOverride(
			request.requestId,
			action,
			action === "confirm" ? confirmation : undefined,
		)
		if (result.kind === "error") {
			if (result.error.code === "network_error") return onIndeterminate()
			if (
				result.error.code !== "invalid_confirmation" &&
				result.error.code !== "unknown"
			) {
				return onTerminal(result.error)
			}
			return showError(result.error)
		}
		if (result.kind === "connected") {
			window.location.assign(
				getSafeSlackOverrideDestination(
					result.destination,
					result.teamName,
					window.location.origin,
				),
			)
			return
		}
		window.location.assign(
			getSafeAppDestination(result.destination, "/", window.location.origin),
		)
	}

	const isFieldError = error?.code === "invalid_confirmation"
	const errorCopy = isFieldError
		? `Type ${request.teamName} or OVERRIDE to confirm.`
		: error
			? "Supermemory couldn’t reassign the workspace, so it did not reassign it. Restart from Slack if this request no longer works."
			: null

	return (
		<CardShell>
			<section aria-labelledby="override-title">
				<header className="px-6 pt-7 pb-5 text-center">
					<ConnectingHeader />
					<h1
						className="mt-5 text-[20px] font-semibold tracking-[-0.2px]"
						id="override-title"
					>
						This Slack is connected elsewhere
					</h1>
					<p className="mt-2.5 text-[13px] leading-5 text-[#737373]">
						The{" "}
						<strong className="font-semibold text-[#FAFAFA]">
							{request.teamName}
						</strong>{" "}
						workspace is already linked to a different Company Brain.
					</p>
				</header>

				<div className="mx-6 h-px bg-white/[0.06]" />
				<div className="flex items-center gap-3 px-6 py-3.5">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.06]">
						<SlackMark className="size-5" />
					</div>
					<div className="min-w-0">
						<p className="truncate text-[15px] font-semibold">
							{request.teamName}
						</p>
						<p className="mt-0.5 truncate text-[12px] text-[#737373]">
							Reassigning to “{request.targetOrgName}”
						</p>
					</div>
				</div>
				<div className="mx-6 h-px bg-white/[0.06]" />

				<div className="mx-6 mt-4 rounded-[14px] bg-[#101822] p-4 shadow-[inset_1.313px_1.313px_3.938px_rgba(0,0,0,0.7)]">
					<p className="flex items-center gap-2 text-[13px] font-semibold">
						<TriangleAlert
							aria-hidden="true"
							className="size-[15px] text-[#F2755A]"
						/>
						Overriding replaces the current connection
					</p>
					<ul className="mt-2.5 flex flex-col gap-2 text-[12.5px] leading-[1.45] text-[#A1A1AA]">
						<li className="flex gap-2">
							<X
								aria-hidden="true"
								className="mt-px size-3.5 shrink-0 text-[#5C6470]"
							/>
							<span>
								The currently connected Company Brain will stop receiving future
								DMs and channel activity from this workspace.
							</span>
						</li>
						<li className="flex gap-2">
							<ShieldCheck
								aria-hidden="true"
								className="mt-px size-3.5 shrink-0 text-[#5C6470]"
							/>
							<span>
								The Slack bot will answer from{" "}
								<strong className="font-semibold text-[#FAFAFA]">
									{request.targetOrgName}
								</strong>{" "}
								and act on its connected apps.
							</span>
						</li>
						<li className="flex gap-2">
							<History
								aria-hidden="true"
								className="mt-px size-3.5 shrink-0 text-[#5C6470]"
							/>
							<span>
								Only future Slack Company Brain activity moves. Supermemory has
								not reassigned the workspace yet.
							</span>
						</li>
					</ul>
				</div>

				<p className="mx-6 mt-3.5 flex gap-2 text-[12.5px] leading-[1.5] text-[#A1A1AA]">
					<Check
						aria-hidden="true"
						className="mt-px size-3.5 shrink-0 text-[#3E8E5A]"
					/>
					<span>
						<strong className="font-semibold text-[#FAFAFA]">
							Supermemory hasn’t reassigned this workspace.
						</strong>{" "}
						Slack authorization already happened, so Slack may have refreshed
						the prior credentials.
					</span>
				</p>

				<form
					className="px-6 pt-[18px]"
					onSubmit={(event) => {
						event.preventDefault()
						void submitAction("confirm")
					}}
				>
					<label
						className="block text-[13px] text-[#A1A1AA]"
						htmlFor="slack-override-confirmation"
					>
						Type{" "}
						<code className="rounded-[5px] bg-white/[0.05] px-1.5 py-px font-mono text-[#FAFAFA]">
							{request.teamName}
						</code>{" "}
						or{" "}
						<code className="rounded-[5px] bg-white/[0.05] px-1.5 py-px font-mono text-[#FAFAFA]">
							OVERRIDE
						</code>{" "}
						to reassign.
					</label>
					<div className="relative mt-2.5">
						<input
							aria-describedby={errorCopy ? "slack-override-error" : undefined}
							aria-invalid={isFieldError}
							autoComplete="off"
							className={cn(
								"h-11 w-full rounded-[12px] border bg-[#0D121A] px-4 pr-11 font-mono text-[14px] tracking-[0.02em] text-white shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] outline-none transition-colors placeholder:text-[#525D6E] focus:border-[#C73B1B]/55 focus:ring-2 focus:ring-[#C73B1B]/15 disabled:opacity-60",
								valid ? "border-[#3E8E5A]/55" : "border-white/[0.08]",
								isFieldError && "border-red-400/70",
							)}
							disabled={submitting !== null}
							id="slack-override-confirmation"
							onChange={(event) => {
								setConfirmation(event.target.value)
								if (isFieldError) setError(null)
							}}
							placeholder="Workspace name or OVERRIDE"
							spellCheck={false}
							value={confirmation}
						/>
						{valid && (
							<Check
								aria-hidden="true"
								className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-[#3E8E5A]"
							/>
						)}
					</div>
					{errorCopy && (
						<p
							className="mt-3 flex gap-2 text-[13px] leading-[1.45] text-red-400 outline-none"
							id="slack-override-error"
							ref={errorRef}
							tabIndex={-1}
						>
							<AlertCircle
								aria-hidden="true"
								className="mt-px size-[15px] shrink-0"
							/>
							{errorCopy}
						</p>
					)}
					<div className="flex flex-col-reverse gap-2 py-[18px] sm:flex-row sm:items-center sm:justify-between">
						<button
							className="min-h-11 rounded-[10px] px-3 text-[13px] font-medium text-[#9AA0A6] transition-colors hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
							disabled={submitting !== null}
							onClick={() => void submitAction("cancel")}
							type="button"
						>
							{submitting === "cancel"
								? "Cancelling…"
								: "Cancel without reassigning"}
						</button>
						<button
							className={cn(
								"flex min-h-11 min-w-[190px] items-center justify-center gap-2 rounded-[12px] bg-[#0D121A] px-5 text-[14px] font-semibold shadow-[inset_1.313px_1.313px_3.938px_rgba(0,0,0,0.7)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C73B1B] disabled:cursor-not-allowed disabled:opacity-45",
								valid &&
									"bg-[linear-gradient(180deg,rgba(199,59,27,0.16),rgba(199,59,27,0.06))] ring-1 ring-[#C73B1B]/35 hover:bg-[linear-gradient(180deg,rgba(199,59,27,0.24),rgba(199,59,27,0.1))]",
							)}
							disabled={!valid || submitting !== null}
							type="submit"
						>
							{submitting === "confirm" ? (
								<>
									<LoaderCircle
										aria-hidden="true"
										className="size-4 animate-spin text-[#C73B1B] motion-reduce:animate-none"
									/>
									Overriding…
								</>
							) : (
								<>
									<span
										aria-hidden="true"
										className="size-1.5 rounded-full bg-[#C73B1B] shadow-[0_0_6px_rgba(199,59,27,0.7)]"
									/>
									{error ? "Try again" : "Override connection"}
								</>
							)}
						</button>
					</div>
				</form>
			</section>
		</CardShell>
	)
}

export function SlackWorkspaceOverride() {
	const requestId = useSearchParams().get("request")?.trim() ?? ""
	const [screen, setScreen] = useState<ScreenState>(
		requestId
			? { kind: "loading" }
			: { kind: "terminal", error: { code: "invalid_request", status: null } },
	)
	const shouldInspect = screen.kind === "loading" || screen.kind === "checking"
	const indeterminateAction =
		screen.kind === "checking" ? screen.indeterminateAction : false
	const loginHref = `/login?redirect=${encodeURIComponent(
		`/slack/workspace-override${requestId ? `?request=${encodeURIComponent(requestId)}` : ""}`,
	)}`

	const checkStatus = useCallback(
		(afterIndeterminateAction: boolean) => {
			if (!requestId) return
			setScreen({
				kind: "checking",
				indeterminateAction: afterIndeterminateAction,
			})
		},
		[requestId],
	)

	useEffect(() => {
		if (!requestId || !shouldInspect) return
		let active = true
		void inspectSlackWorkspaceOverride(requestId).then((result) => {
			if (!active) return
			if (result.kind === "pending") {
				setScreen({ kind: "pending", request: result.request })
			} else if (result.kind === "connected") {
				window.location.assign(
					getSafeSlackOverrideDestination(
						result.destination,
						result.teamName,
						window.location.origin,
					),
				)
			} else if (result.kind === "cancelled") {
				setScreen({
					kind: "terminal",
					error: { code: "cancelled", status: 200 },
				})
			} else {
				setScreen({
					kind: "terminal",
					error: result.error,
					indeterminateAction,
				})
			}
		})
		return () => {
			active = false
		}
	}, [indeterminateAction, requestId, shouldInspect])

	if (screen.kind === "loading") return <LoadingState />
	if (screen.kind === "checking") return <LoadingState checking />
	if (screen.kind === "terminal")
		return (
			<TerminalState
				error={screen.error}
				indeterminateAction={screen.indeterminateAction}
				loginHref={loginHref}
				onRetry={() => checkStatus(screen.indeterminateAction ?? false)}
			/>
		)
	return (
		<PendingState
			onIndeterminate={() => checkStatus(true)}
			onTerminal={(error) => setScreen({ kind: "terminal", error })}
			request={screen.request}
		/>
	)
}
