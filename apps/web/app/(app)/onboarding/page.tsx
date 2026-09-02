"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@lib/auth-context"
import { authClient } from "@lib/auth"
import { SHARED_TEAM_BRAIN_TAG } from "@lib/constants"
import { analytics } from "@/lib/analytics"
import { hasCompanyBrain } from "@/lib/billing-utils"
import { resolveCompanyBrainEntry } from "@/lib/company-brain-entry"
import { BrainShell } from "@/components/onboarding-brain/shell"
import {
	StepAbout,
	type AboutValues,
} from "@/components/onboarding-brain/step-about"
import {
	StepSources,
	type SourcesValues,
} from "@/components/onboarding-brain/step-sources"
import { StepIngest } from "@/components/onboarding-brain/step-ingest"
import { CompanyBrainOnboarding } from "@/components/onboarding-brain/company-brain-onboarding"
import {
	StepTeam,
	type TeamValues,
} from "@/components/onboarding-brain/step-team"
import {
	BRAIN_STEPS,
	type BrainMetadata,
	type BrainMode,
	type BrainStep,
	containerTagFromWorkspace,
	detectModeFromEmail,
	generateOrgSlug,
	generateUsername,
	workspaceDomainFromEmail,
	workspaceNameFromDomain,
	workspaceNameFromEmail,
	type CompanyBrainConfirmResult,
} from "@/components/onboarding-brain/types"

const STORAGE_KEY = "supermemory-brain-onboarding-v1"
const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const countsAsConnectedSource = (state: unknown) =>
	state === "connected" || state === "waitlist"

const getErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof Error && error.message) return error.message
	if (typeof error === "string" && error.trim()) return error
	if (typeof error === "object" && error !== null && "message" in error) {
		const message = (error as { message?: unknown }).message
		if (typeof message === "string" && message.trim()) return message
	}
	return fallback
}

const getWorkspaceCreationErrorCopy = (message: string) => {
	const limit = message.match(/maximum number of workspaces \((\d+)\)/i)?.[1]
	if (limit) {
		return {
			title: "Workspace limit reached",
			description: `You can own up to ${limit} workspaces. Delete one in Settings or contact support@supermemory.com for a higher limit.`,
		}
	}
	return {
		title: "Couldn't create workspace",
		description: message,
	}
}

export default function BrainOnboardingPage() {
	const router = useRouter()
	const params = useSearchParams()
	const queryClient = useQueryClient()
	const { user, org, organizations, setActiveOrg, refetchOrganizations } =
		useAuth()

	// `?new=1` forces creating an additional org even when the user already has one.
	const forceCreate = params?.get("new") === "1"
	// ensureOrg strips `new` once the org exists, so latch it for `finish`'s reload.
	const forcedCreateRef = useRef(forceCreate)
	if (forceCreate) forcedCreateRef.current = true
	const nameParam = params?.get("name")?.trim() || ""

	const stepFromUrl = (params?.get("step") as BrainStep | null) ?? "about"
	const initialStep: BrainStep = BRAIN_STEPS.includes(stepFromUrl)
		? stepFromUrl
		: "about"

	const [step, setStep] = useState<BrainStep>(initialStep)

	// `?mode=team` wins over email detection so a personal-domain user arriving
	// from a "set up a Company Brain" CTA doesn't land in personal onboarding.
	const modeParam = params?.get("mode") === "team" ? "team" : null
	const detectedMode = useMemo(
		() => modeParam ?? detectModeFromEmail(user?.email),
		[modeParam, user?.email],
	)
	const suggestedWorkspaceName = useMemo(
		() => workspaceNameFromEmail(user?.email),
		[user?.email],
	)
	const domain = useMemo(
		() => workspaceDomainFromEmail(user?.email),
		[user?.email],
	)
	const [mode, setMode] = useState<BrainMode>(detectedMode)

	const hasCompanyBrainOrg = useMemo(
		() =>
			(organizations ?? []).some((o) =>
				hasCompanyBrain(
					(o as { metadata?: Record<string, unknown> | string | null })
						.metadata,
				),
			),
		[organizations],
	)
	useEffect(() => {
		if (mode === "team" && organizations != null && !hasCompanyBrainOrg) {
			setMode("personal")
		}
	}, [mode, organizations, hasCompanyBrainOrg])
	const [about, setAbout] = useState<AboutValues>({
		name: user?.name ?? "",
		about: "",
		workspaceName: nameParam || suggestedWorkspaceName,
		workspaceDomain: domain ?? "",
	})
	const [sources, setSources] = useState<SourcesValues>({
		connected: {},
		driveScope: "selective",
	})
	const [team, setTeam] = useState<TeamValues>({
		invites: [],
		visibility: "team-private",
		suggestChanges: false,
	})

	useEffect(() => {
		if (forceCreate) return
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			if (!raw) return
			const cached = JSON.parse(raw) as {
				mode?: BrainMode
				about?: AboutValues
				sources?: SourcesValues
				team?: TeamValues
			}
			if (cached.mode && !modeParam) setMode(cached.mode)
			if (cached.about) setAbout((a) => ({ ...a, ...cached.about }))
			if (cached.sources) setSources((s) => ({ ...s, ...cached.sources }))
			if (cached.team) setTeam((t) => ({ ...t, ...cached.team }))
		} catch {}
	}, [forceCreate, modeParam])

	useEffect(() => {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ mode, about, sources, team }),
			)
		} catch {}
	}, [mode, about, sources, team])

	const navTrigger = useRef<"user" | "auto">("auto")
	const startedRef = useRef(false)
	useEffect(() => {
		if (startedRef.current) return
		startedRef.current = true
		analytics.onboardingStarted({
			mode: detectedMode,
			entry_step: initialStep,
		})
		analytics.onboardingStepViewed({
			step: initialStep,
			index: BRAIN_STEPS.indexOf(initialStep),
			trigger: "auto",
		})
	}, [detectedMode, initialStep])

	const firstStepRender = useRef(true)
	useEffect(() => {
		// Skip the mount run — the gated effect above fires the initial view.
		if (firstStepRender.current) {
			firstStepRender.current = false
			return
		}
		analytics.onboardingStepViewed({
			step,
			index: BRAIN_STEPS.indexOf(step),
			trigger: navTrigger.current,
		})
		navTrigger.current = "auto"
	}, [step])

	const setStepAndUrl = useCallback(
		(next: BrainStep) => {
			navTrigger.current = "user"
			setStep(next)
			const url = new URL(window.location.href)
			url.searchParams.set("step", next)
			router.replace(url.pathname + url.search, { scroll: false })
		},
		[router],
	)

	// Team/company-brain routes everything into the shared Team Brain that
	// provisioning creates (sm_org_shared) — not a workspace-name slug space.
	const containerTag = useMemo(
		() =>
			mode === "team"
				? SHARED_TEAM_BRAIN_TAG
				: containerTagFromWorkspace(
						about.workspaceName || suggestedWorkspaceName,
						mode,
					),
		[about.workspaceName, suggestedWorkspaceName, mode],
	)

	const isScale = useMemo(() => {
		const plan = (org?.metadata as Record<string, unknown> | undefined)?.plan
		return plan === "scale" || plan === "scale_yearly"
	}, [org])

	// Personal onboarding has no team step — drop it from the flow + stepper.
	const steps = useMemo<BrainStep[]>(
		() =>
			mode === "team" ? BRAIN_STEPS : BRAIN_STEPS.filter((s) => s !== "team"),
		[mode],
	)

	const finish = useCallback(async () => {
		analytics.onboardingCompleted({
			mode,
			steps_completed: BRAIN_STEPS.length,
			sources_connected: Object.values(sources.connected).filter(
				countsAsConnectedSource,
			).length,
			invites_sent: team.invites.filter((i) => i.email.trim()).length,
		})
		try {
			localStorage.removeItem(STORAGE_KEY)
		} catch {}
		// Extra org from settings: hard-reload so org-scoped caches don't show the previous org's data.
		if (forcedCreateRef.current) {
			window.location.href = "/?onboarded=1"
			return
		}
		router.push("/?onboarded=1")
	}, [router, mode, sources, team])

	const goNext = useCallback(() => {
		const idx = steps.indexOf(step)
		analytics.onboardingStepCompleted({ step, index: idx })
		const next = steps[idx + 1]
		if (!next) {
			finish()
			return
		}
		setStepAndUrl(next)
	}, [step, steps, setStepAndUrl, finish])

	// If the current step isn't valid for the mode (e.g. switched to personal),
	// fall back to the last valid step.
	useEffect(() => {
		if (!steps.includes(step)) {
			setStepAndUrl(steps[steps.length - 1] ?? "about")
		}
	}, [steps, step, setStepAndUrl])

	const [creatingOrg, setCreatingOrg] = useState(false)
	const creatingOrgRef = useRef(false)

	const ensureOrg = useCallback(
		async (
			domainOverride?: string,
			createEvenIfExisting = false,
		): Promise<boolean> => {
			if (
				!createEvenIfExisting &&
				!forceCreate &&
				organizations &&
				organizations.length > 0
			)
				return false
			const name = (
				domainOverride
					? workspaceNameFromDomain(domainOverride)
					: about.workspaceName || suggestedWorkspaceName
			).trim()
			const slug = generateOrgSlug(name)
			const metadata: BrainMetadata & { signupSource: string } = {
				signupSource: "consumer",
				brainOnboardingVersion: "v1",
				brainMode: "personal",
				brainWorkspaceName: name,
				brainWorkspaceDomain: null,
				brainContainerTag: containerTag,
				...(about.about.trim() ? { brainAbout: about.about.trim() } : {}),
			}
			const result = await authClient.organization.create({
				name,
				slug,
				metadata,
			})
			if (result.error || !result.data?.slug) {
				throw new Error(
					getErrorMessage(result.error, "Organization was not created."),
				)
			}
			await setActiveOrg(result.data.slug)
			if (about.name.trim()) {
				await authClient.updateUser({
					name: about.name.trim(),
					displayUsername: about.name.trim(),
					username: generateUsername(about.name),
				})
			}
			await refetchOrganizations()
			analytics.onboardingWorkspaceCreated({
				mode,
				has_about: Boolean(about.about.trim()),
				has_domain: Boolean(
					mode === "team" && (about.workspaceDomain || domain),
				),
			})
			// Drop new=1 so a reload or back+Continue reuses this org instead of creating a duplicate.
			if (forceCreate) {
				const url = new URL(window.location.href)
				url.searchParams.delete("new")
				url.searchParams.delete("name")
				router.replace(url.pathname + url.search, { scroll: false })
			}
			return true
		},
		[
			organizations,
			about,
			suggestedWorkspaceName,
			mode,
			domain,
			containerTag,
			setActiveOrg,
			refetchOrganizations,
			forceCreate,
			router,
		],
	)

	const handleAboutContinue = useCallback(async () => {
		if (creatingOrgRef.current) return
		creatingOrgRef.current = true
		setCreatingOrg(true)
		try {
			await ensureOrg()
			goNext()
		} catch (e) {
			const message = getErrorMessage(e, "Organization was not created.")
			console.error("Failed to create organization:", e)
			analytics.onboardingWorkspaceCreateFailed({
				error: message,
			})
			const errorCopy = getWorkspaceCreationErrorCopy(message)
			toast.error(errorCopy.title, {
				description: errorCopy.description,
				duration: 8000,
				action: {
					label: "Open Settings",
					onClick: () => router.push("/settings"),
				},
			})
			if (forceCreate && (organizations?.length ?? 0) > 0) {
				router.replace("/")
			}
		} finally {
			creatingOrgRef.current = false
			setCreatingOrg(false)
		}
	}, [ensureOrg, goNext, forceCreate, organizations, router])
	const isCompanyBrain = mode === "team" && hasCompanyBrainOrg

	const handleBrainConfirm = useCallback(
		async (
			confirmedDomain: string,
			organizationId?: string,
		): Promise<CompanyBrainConfirmResult> => {
			if (creatingOrgRef.current) return { ok: false }
			creatingOrgRef.current = true
			setCreatingOrg(true)
			try {
				const workspaceName = workspaceNameFromDomain(confirmedDomain)
				setAbout((a) => ({
					...a,
					workspaceDomain: confirmedDomain,
					workspaceName: workspaceName || a.workspaceName,
				}))
				const signupsPaused = () => {
					toast.error("New Company Brain signups are paused", {
						description: "Questions? Reach us at support@supermemory.com.",
					})
					return { ok: false as const }
				}
				const orgCreated = false
				if (forceCreate) {
					return signupsPaused()
				}
				if (organizationId) {
					const selected = organizations?.find(
						(organization) => organization.id === organizationId,
					)
					if (!selected) return { ok: false }
					if (selected.id !== org?.id) await setActiveOrg(selected.slug)
				} else {
					const organizationsWithActiveMetadata = (organizations ?? []).map(
						(organization) =>
							organization.id === org?.id
								? { ...organization, metadata: org.metadata }
								: organization,
					)
					const decision = resolveCompanyBrainEntry(
						org?.id,
						organizationsWithActiveMetadata,
						confirmedDomain,
					)
					if (decision.action === "choose") {
						return {
							ok: false,
							choices: decision.organizations.map((organization) => ({
								id: organization.id,
								name: organization.name,
							})),
						}
					}
					if (decision.action === "switch") {
						await setActiveOrg(decision.organization.slug)
					} else if (decision.action === "create") {
						return signupsPaused()
					}
				}
				// Re-entering onboarding on an existing org ("Try onboarding") must
				// kick research from the client. New orgs rely on the signup hook after
				// provisioning — a duplicate /start races and can strand the DO task.
				if (!orgCreated) {
					const started = await fetch(`${BACKEND}/brain/research/start`, {
						method: "POST",
						credentials: "include",
						headers: {
							"content-type": "application/json",
							"X-App-Source": "nova",
						},
						body: JSON.stringify({ domain: confirmedDomain }),
					})
						.then((res) => res.ok)
						.catch(() => false)
					// Don't advance into the research phase if it never started, else the
					// poller sits on empty state until timeout.
					if (!started) {
						toast.error("Couldn't start research", {
							description: "Please try again in a moment.",
						})
						return { ok: false }
					}
				}
				queryClient.invalidateQueries({ queryKey: ["brain-research-status"] })
				// ensureOrg already fires this when it creates the org; only emit here
				// for the existing-org path to avoid a duplicate event.
				if (!orgCreated) {
					analytics.onboardingWorkspaceCreated({
						mode: "team",
						has_about: false,
						has_domain: Boolean(confirmedDomain),
					})
				}
				return { ok: true, serverSchedulesResearch: orgCreated }
			} catch (e) {
				const message = getErrorMessage(e, "Organization was not created.")
				console.error("Failed to create organization:", e)
				analytics.onboardingWorkspaceCreateFailed({ error: message })
				const errorCopy = getWorkspaceCreationErrorCopy(message)
				toast.error(errorCopy.title, {
					description: errorCopy.description,
					duration: 8000,
					action: {
						label: "Open Settings",
						onClick: () => router.push("/settings"),
					},
				})
				return { ok: false }
			} finally {
				creatingOrgRef.current = false
				setCreatingOrg(false)
			}
		},
		[forceCreate, org, organizations, queryClient, setActiveOrg, router],
	)

	const [sendingInvites, setSendingInvites] = useState(false)
	const sendingInvitesRef = useRef(false)

	const handleTeamContinue = useCallback(async () => {
		if (sendingInvitesRef.current) return
		const pending = team.invites.filter((i) => i.email.trim())
		if (pending.length === 0) {
			analytics.onboardingTeamSkipped()
			goNext()
			return
		}
		sendingInvitesRef.current = true
		setSendingInvites(true)
		try {
			if (!org?.id) throw new Error("No active organization")
			const results = await Promise.allSettled(
				pending.map((inv) =>
					authClient.organization.inviteMember({
						email: inv.email.trim().toLowerCase(),
						role: inv.role,
						organizationId: org.id,
						resend: true,
					}),
				),
			)
			const failed = results.filter(
				(r) =>
					r.status === "rejected" ||
					(r.status === "fulfilled" && Boolean(r.value?.error)),
			).length
			analytics.onboardingInvitesSent({
				sent: pending.length - failed,
				failed,
			})
			if (failed > 0) {
				toast.error(
					`${failed} of ${pending.length} invite${pending.length === 1 ? "" : "s"} couldn't be sent.`,
				)
			} else {
				toast.success(
					`Sent ${pending.length} invite${pending.length === 1 ? "" : "s"}.`,
				)
			}
		} catch (e) {
			console.error("Failed to send invites:", e)
			toast.error("Couldn't send invites. You can invite teammates later.")
		} finally {
			sendingInvitesRef.current = false
			setSendingInvites(false)
			goNext()
		}
	}, [team.invites, org, goNext])

	const mcpUrl = "https://mcp.supermemory.ai/mcp"

	if (mode === "team" && organizations == null) {
		return null
	}

	if (isCompanyBrain) {
		return (
			<CompanyBrainOnboarding
				name={about.name || user?.name || ""}
				avatarUrl={user?.image ?? null}
				domain={about.workspaceDomain || domain || ""}
				submitting={creatingOrg}
				onConfirm={handleBrainConfirm}
				onDone={finish}
				onUsePersonal={() => {
					analytics.onboardingModeSelected({ mode: "personal" })
					setMode("personal")
					setStepAndUrl("about")
				}}
			/>
		)
	}

	// Team mode returns above, so everything below is the personal flow.
	return (
		<BrainShell step={step} steps={steps} domain={null}>
			{step === "about" && (
				<StepAbout
					mode={mode}
					domain={domain}
					suggestedWorkspaceName={suggestedWorkspaceName}
					defaultName={user?.name ?? ""}
					avatarUrl={user?.image ?? null}
					values={about}
					onChange={setAbout}
					onContinue={handleAboutContinue}
					submitting={creatingOrg}
				/>
			)}
			{step === "sources" && (
				<StepSources
					containerTag={containerTag}
					mode={mode}
					values={sources}
					onChange={setSources}
					onContinue={goNext}
				/>
			)}
			{step === "ingest" && (
				<StepIngest mode={mode} mcpUrl={mcpUrl} onContinue={goNext} />
			)}
			{step === "team" && (
				<StepTeam
					mode={mode}
					isScale={isScale}
					inviteDomain={about.workspaceDomain || domain || null}
					values={team}
					onChange={setTeam}
					onContinue={handleTeamContinue}
					onSkip={() => {
						analytics.onboardingTeamSkipped()
						goNext()
					}}
					submitting={sendingInvites}
					onUpgrade={() => router.push("/settings/billing")}
				/>
			)}
		</BrainShell>
	)
}
