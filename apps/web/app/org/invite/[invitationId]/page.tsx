"use client"

import { authClient, useSession } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { Loader, Users, XCircle } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { dmSans125ClassName } from "@/lib/fonts"

type InvitationData = {
	id: string
	email: string
	role: string
	status: string
	expiresAt: string
	organizationName: string
	organizationSlug: string
	organizationId: string
	inviterEmail?: string
}

type InviteState =
	| "loading"
	| "no_session"
	| "ready"
	| "not_found"
	| "expired"
	| "already_accepted"
	| "wrong_account"

const pageWrapperClass =
	"flex items-center justify-center min-h-screen bg-background p-4"
const cardClass = cn(
	"bg-[#14161A] rounded-[14px] p-6 w-full max-w-[400px]",
	"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
)

function FullPageSpinner() {
	return (
		<div className="flex items-center justify-center min-h-screen bg-background">
			<div className="size-6 border-2 border-[#4BA0FA] border-t-transparent rounded-full animate-spin" />
		</div>
	)
}

function PrimaryButton({
	children,
	onClick,
	disabled,
}: {
	children: React.ReactNode
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"relative w-full h-11 rounded-[10px] flex items-center justify-center",
				"text-[#FAFAFA] font-medium text-[14px] tracking-[-0.14px]",
				"cursor-pointer transition-opacity hover:opacity-90",
				"disabled:opacity-60 disabled:cursor-not-allowed",
				dmSans125ClassName(),
			)}
			style={{
				background:
					"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)",
				boxShadow:
					"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)",
			}}
		>
			{children}
			<div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_1px_1px_2px_1px_#1A88FF]" />
		</button>
	)
}

function SecondaryButton({
	children,
	onClick,
	disabled,
}: {
	children: React.ReactNode
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"w-full flex items-center justify-center gap-2 rounded-full h-10 px-4",
				"bg-[#0D121A] border border-[#1E293B] text-[#FAFAFA]",
				"text-[13px] font-medium cursor-pointer transition-colors hover:bg-[#1E293B]",
				"disabled:opacity-60 disabled:cursor-not-allowed",
				dmSans125ClassName(),
			)}
		>
			{children}
		</button>
	)
}

function IconTile({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex size-10 items-center justify-center rounded-lg border border-[#1E293B] bg-[#080B0F]">
			{children}
		</div>
	)
}

function Title({ children }: { children: React.ReactNode }) {
	return (
		<h2 className={dmSans125ClassName("font-semibold text-[18px] text-[#FAFAFA]")}>
			{children}
		</h2>
	)
}

function Subtitle({ children }: { children: React.ReactNode }) {
	return (
		<p className={dmSans125ClassName("text-[13px] text-[#737373] mt-1")}>
			{children}
		</p>
	)
}

function StatusCard({
	icon,
	title,
	description,
	actionLabel,
	onAction,
}: {
	icon: React.ReactNode
	title: string
	description: string
	actionLabel: string
	onAction: () => void
}) {
	return (
		<div className={pageWrapperClass}>
			<div className={cardClass}>
				<div className="flex flex-col items-center gap-5">
					<IconTile>{icon}</IconTile>
					<div className="text-center">
						<Title>{title}</Title>
						<Subtitle>{description}</Subtitle>
					</div>
					<SecondaryButton onClick={onAction}>{actionLabel}</SecondaryButton>
				</div>
			</div>
		</div>
	)
}

export default function InvitePage() {
	const params = useParams<{ invitationId: string }>()
	const invitationId = params.invitationId
	const { data: session, isPending: sessionPending } = useSession()
	const { setActiveOrg, refetchOrganizations } = useAuth()
	const router = useRouter()

	const [state, setState] = useState<InviteState>("loading")
	const [invitation, setInvitation] = useState<InvitationData | null>(null)
	const [accepting, setAccepting] = useState(false)
	const [declining, setDeclining] = useState(false)

	useEffect(() => {
		if (sessionPending) return
		if (!session) {
			setState("no_session")
			return
		}
		let cancelled = false
		;(async () => {
			const { data, error } = await authClient.organization.getInvitation({
				query: { id: invitationId },
			})
			if (cancelled) return
			if (error) {
				setState(error.status === 403 ? "wrong_account" : "not_found")
				return
			}
			if (!data) {
				setState("not_found")
				return
			}
			const inv = data as unknown as InvitationData
			if (inv.status === "accepted") setState("already_accepted")
			else if (inv.status === "canceled" || inv.status === "rejected")
				setState("not_found")
			else if (new Date(inv.expiresAt) < new Date()) setState("expired")
			else {
				setInvitation(inv)
				setState("ready")
			}
		})()
		return () => {
			cancelled = true
		}
	}, [session, sessionPending, invitationId])

	const handleAccept = useCallback(async () => {
		setAccepting(true)
		try {
			const { error } = await authClient.organization.acceptInvitation({
				invitationId,
			})
			if (error) {
				toast.error(error.message ?? "Failed to accept invitation")
				return
			}
			if (invitation?.organizationSlug) {
				await setActiveOrg(invitation.organizationSlug)
			}
			await refetchOrganizations()
			toast.success(`You've joined ${invitation?.organizationName ?? "the team"}`)
			router.push("/")
		} finally {
			setAccepting(false)
		}
	}, [invitationId, invitation, setActiveOrg, refetchOrganizations, router])

	const handleDecline = useCallback(async () => {
		setDeclining(true)
		try {
			const { error } = await authClient.organization.rejectInvitation({
				invitationId,
			})
			if (error) {
				toast.error(error.message ?? "Failed to decline invitation")
				return
			}
			toast.success("Invitation declined")
			router.push("/")
		} finally {
			setDeclining(false)
		}
	}, [invitationId, router])

	if (state === "loading") return <FullPageSpinner />

	if (state === "no_session") {
		const loginHref = `/login?redirect=${encodeURIComponent(
			typeof window !== "undefined" ? window.location.href : "",
		)}`
		return (
			<div className={pageWrapperClass}>
				<div className={cardClass}>
					<div className="flex flex-col items-center gap-5">
						<IconTile>
							<Users className="size-5 text-[#4BA0FA]" />
						</IconTile>
						<div className="text-center">
							<Title>You're not logged in</Title>
							<Subtitle>Log in to view and accept this invitation.</Subtitle>
						</div>
						<PrimaryButton onClick={() => router.push(loginHref)}>
							Log in
						</PrimaryButton>
					</div>
				</div>
			</div>
		)
	}

	if (state === "wrong_account") {
		return (
			<StatusCard
				icon={<XCircle className="size-5 text-red-400" />}
				title="This invitation isn't for you"
				description={`It was sent to a different email${
					session?.user?.email ? ` than ${session.user.email}` : ""
				}.`}
				actionLabel="Go to dashboard"
				onAction={() => router.push("/")}
			/>
		)
	}

	if (
		state === "not_found" ||
		state === "expired" ||
		state === "already_accepted"
	) {
		const copy = {
			not_found: {
				title: "Invitation not found",
				body: "This invitation doesn't exist or has been revoked.",
			},
			expired: {
				title: "Invitation expired",
				body: "Ask your team admin to send a new one.",
			},
			already_accepted: {
				title: "Already joined",
				body: "You've already accepted this invitation.",
			},
		}[state]
		return (
			<StatusCard
				icon={<Users className="size-5 text-[#4BA0FA]" />}
				title={copy.title}
				description={copy.body}
				actionLabel="Go to dashboard"
				onAction={() => router.push("/")}
			/>
		)
	}

	return (
		<div className={pageWrapperClass}>
			<div className={cardClass}>
				<div className="flex flex-col items-center gap-5">
					<IconTile>
						<Users className="size-5 text-[#4BA0FA]" />
					</IconTile>
					<div className="text-center">
						<Title>{invitation?.organizationName}</Title>
						<Subtitle>
							You've been invited to join{" "}
							<strong className="text-[#A3A3A3]">
								{invitation?.organizationName}
							</strong>{" "}
							as {invitation?.role}.
						</Subtitle>
						{invitation?.inviterEmail && (
							<p
								className={dmSans125ClassName(
									"text-[12px] text-[#737373] mt-2",
								)}
							>
								Invited by {invitation.inviterEmail}
							</p>
						)}
						{session?.user?.email && (
							<p
								className={dmSans125ClassName("text-[12px] text-[#737373] mt-1")}
							>
								Signed in as {session.user.email}
							</p>
						)}
					</div>
					<div className="flex w-full flex-col gap-2.5">
						<PrimaryButton
							onClick={handleAccept}
							disabled={accepting || declining}
						>
							{accepting ? (
								<>
									<Loader className="size-4 animate-spin mr-2" />
									Accepting…
								</>
							) : (
								"Accept invitation"
							)}
						</PrimaryButton>
						<SecondaryButton
							onClick={handleDecline}
							disabled={declining || accepting}
						>
							{declining ? (
								<>
									<Loader className="size-4 animate-spin" />
									Declining…
								</>
							) : (
								"Decline"
							)}
						</SecondaryButton>
					</div>
				</div>
			</div>
		</div>
	)
}
