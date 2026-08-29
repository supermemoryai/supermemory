"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LogoFull } from "@ui/assets/Logo"
import { Button } from "@ui/components/button"
import { AlertTriangle, ChevronRight, Loader2, RotateCw } from "lucide-react"
import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import {
	type BrainEntryOrganization,
	resolveCompanyBrainEntry,
} from "@/lib/company-brain-entry"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { generateOrgSlug } from "@/components/onboarding-brain/types"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

export default function BrainEntryPage() {
	const router = useRouter()
	const { user, org, organizations, isRestoring, setActiveOrg } = useAuth()
	const { email = null } = user ?? {}
	const [error, setError] = useState<string | null>(null)
	const [choices, setChoices] = useState<BrainEntryOrganization[] | null>(null)
	const [closed, setClosed] = useState(false)
	const [attempt, setAttempt] = useState(0)
	const startedRef = useRef(false)

	const continueWithOrganization = useCallback(
		async (organization: BrainEntryOrganization) => {
			if (org?.id !== organization.id) {
				await setActiveOrg(organization.slug)
			}
			const status = await fetch(`${BACKEND}/brain/slack/status`, {
				credentials: "include",
				headers: { "X-App-Source": "nova" },
			})
				.then((res) => (res.ok ? res.json() : null))
				.catch(() => null)
			if (status?.connected) {
				router.replace("/")
				return
			}
			window.location.href = `${BACKEND}/brain/slack/oauth/install`
		},
		[org?.id, router, setActiveOrg],
	)

	const run = useCallback(async () => {
		const organizationsWithActiveMetadata = (organizations ?? []).map(
			(organization) =>
				organization.id === org?.id
					? { ...organization, metadata: org.metadata }
					: organization,
		)
		const decision = resolveCompanyBrainEntry(
			org?.id,
			organizationsWithActiveMetadata,
		)

		if (decision.action === "use" || decision.action === "switch") {
			await continueWithOrganization(decision.organization)
			return
		}
		if (decision.action === "choose") {
			setChoices(decision.organizations)
			return
		}
		setClosed(true)
	}, [continueWithOrganization, org, organizations])

	const handleChoice = useCallback(
		(organization: BrainEntryOrganization) => {
			setChoices(null)
			setError(null)
			continueWithOrganization(organization).catch((e) => {
				startedRef.current = false
				console.error("Company Brain organization selection failed:", e)
				setError(e instanceof Error ? e.message : "Something went wrong.")
			})
		},
		[continueWithOrganization],
	)

	// Sole caller of run(): the guard is only released on failure, so a dep change
	// mid-flight can't kick off a second org creation.
	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt retriggers the retry
	useEffect(() => {
		if (!user || organizations === null || isRestoring || startedRef.current)
			return
		startedRef.current = true
		run().catch((e) => {
			startedRef.current = false
			console.error("Brain entry failed:", e)
			setError(e instanceof Error ? e.message : "Something went wrong.")
		})
	}, [user, organizations, isRestoring, run, attempt])

	return (
		<EntryShell>
			{closed ? (
				<section
					className="w-full max-w-md rounded-[22px] bg-[#1B1F24] p-8 text-center"
					style={modalCardStyle}
				>
					<p
						className={cn(
							"text-[20px] font-semibold text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						New signups are paused
					</p>
					<p className="mt-2 text-[14px] font-medium leading-[1.5] text-[#737373]">
						Company Brain isn't accepting new workspaces right now. If you have
						questions, reach us at support@supermemory.com.
					</p>
					<Button
						variant="insideOut"
						onClick={() => router.replace("/")}
						className="mt-6 rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
					>
						Go to Supermemory
					</Button>
				</section>
			) : choices ? (
				<section
					className="w-full max-w-md rounded-[22px] bg-[#1B1F24] p-6 text-left md:p-8"
					style={modalCardStyle}
				>
					<p
						className={cn(
							"text-[20px] font-semibold text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						Choose your Company Brain
					</p>
					<p className="mt-1.5 text-[14px] font-medium leading-[1.5] text-[#737373]">
						You're a member of more than one workspace. Pick the one to open.
					</p>

					<div className="mt-6 flex flex-col gap-2">
						{choices.map((organization) => (
							<button
								key={organization.id}
								type="button"
								onClick={() => handleChoice(organization)}
								style={inputBevelStyle}
								className="group flex w-full items-center gap-3 rounded-[14px] border border-[rgba(82,89,102,0.2)] bg-[#14161A] px-3 py-3 text-left transition-colors hover:bg-[#1E2228] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA0FA]/60"
							>
								<span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[rgba(115,115,115,0.15)] bg-[#0D121A] text-[13px] font-semibold uppercase text-[#A1A1AA]">
									{(organization.name.trim()[0] ?? "?").toUpperCase()}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-[14px] font-medium text-[#fafafa]">
										{organization.name}
									</span>
									{generateOrgSlug(organization.name) !== organization.slug && (
										<span className="mt-0.5 block truncate text-[12px] font-medium text-[#525D6E]">
											{organization.slug}
										</span>
									)}
								</span>
								<ChevronRight className="size-4 shrink-0 text-[#525D6E] transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-[#A1A1AA]" />
							</button>
						))}
					</div>

					{email && (
						<p className="mt-5 border-t border-white/[0.06] pt-4 text-[12px] font-medium text-[#525D6E]">
							Signed in as {email}
						</p>
					)}
				</section>
			) : error ? (
				<section
					className="w-full max-w-md rounded-[22px] bg-[#1B1F24] p-8 text-center"
					style={modalCardStyle}
				>
					<div
						className="mx-auto flex size-12 items-center justify-center rounded-[14px] border border-[rgba(82,89,102,0.2)] bg-[#14161A]"
						style={inputBevelStyle}
					>
						<AlertTriangle className="size-5 text-[#E5A94B]" />
					</div>
					<p
						className={cn(
							"mt-5 text-[20px] font-semibold text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						Couldn't set up your Company Brain
					</p>
					<p className="mt-2 text-[14px] font-medium leading-[1.5] text-[#737373]">
						{error}
					</p>
					<Button
						variant="insideOut"
						onClick={() => {
							setError(null)
							setAttempt((a) => a + 1)
						}}
						className="mt-6 rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
					>
						<RotateCw className="size-3.5" />
						Try again
					</Button>
				</section>
			) : (
				<div className="flex flex-col items-center text-center">
					<div className="relative flex size-14 items-center justify-center">
						<span className="absolute inset-0 animate-ping rounded-[18px] bg-[#4BA0FA]/10" />
						<span
							className="absolute inset-0 rounded-[18px] border border-[rgba(82,89,102,0.2)] bg-[#14161A]"
							style={inputBevelStyle}
						/>
						<Loader2 className="relative size-5 animate-spin text-[#4BA0FA]" />
					</div>
					<p
						className={cn(
							"mt-6 text-[20px] font-semibold text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						Setting up your Company Brain
					</p>
					<p className="mt-2 max-w-sm text-[14px] font-medium leading-[1.5] text-[#737373]">
						Preparing your workspace, then we'll connect it to Slack.
					</p>
				</div>
			)}
		</EntryShell>
	)
}

function EntryShell({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={cn(
				"relative min-h-dvh overflow-hidden bg-[#05080D] text-[#fafafa]",
				dmSansClassName(),
			)}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 select-none"
				style={{
					background:
						"radial-gradient(ellipse 80% 60% at 50% 40%, rgba(75,160,250,0.08) 0%, rgba(34,97,202,0.04) 35%, transparent 70%)",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 select-none"
				style={{
					backgroundImage:
						"radial-gradient(circle at center, rgba(105,167,240,0.22) 1px, transparent 1px)",
					backgroundSize: "28px 28px",
					maskImage:
						"radial-gradient(ellipse at center, black 0%, black 40%, transparent 90%)",
					WebkitMaskImage:
						"radial-gradient(ellipse at center, black 0%, black 40%, transparent 90%)",
				}}
			/>
			<header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 py-4 md:px-10">
				<LogoFull className="h-5 text-[#fafafa] md:h-6" />
			</header>
			<main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-20 md:px-10">
				{children}
			</main>
		</div>
	)
}
