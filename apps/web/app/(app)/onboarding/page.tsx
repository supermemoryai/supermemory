"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@lib/auth-context"
import { authClient } from "@lib/auth"
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
	workspaceNameFromEmail,
} from "@/components/onboarding-brain/types"

const STORAGE_KEY = "supermemory-brain-onboarding-v1"

export default function BrainOnboardingPage() {
	const router = useRouter()
	const params = useSearchParams()
	const { user, org, organizations, setActiveOrg, refetchOrganizations } =
		useAuth()

	// `?new=1` forces creating an additional org even when the user already has one.
	const forceCreate = params?.get("new") === "1"
	const nameParam = params?.get("name")?.trim() || ""

	const stepFromUrl = (params?.get("step") as BrainStep | null) ?? "about"
	const initialStep: BrainStep = BRAIN_STEPS.includes(stepFromUrl)
		? stepFromUrl
		: "about"

	const [step, setStep] = useState<BrainStep>(initialStep)

	const detectedMode = useMemo(
		() => detectModeFromEmail(user?.email),
		[user?.email],
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
			if (cached.mode) setMode(cached.mode)
			if (cached.about) setAbout((a) => ({ ...a, ...cached.about }))
			if (cached.sources) setSources((s) => ({ ...s, ...cached.sources }))
			if (cached.team) setTeam((t) => ({ ...t, ...cached.team }))
		} catch {}
	}, [forceCreate])

	useEffect(() => {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ mode, about, sources, team }),
			)
		} catch {}
	}, [mode, about, sources, team])

	const setStepAndUrl = useCallback(
		(next: BrainStep) => {
			setStep(next)
			const url = new URL(window.location.href)
			url.searchParams.set("step", next)
			router.replace(url.pathname + url.search, { scroll: false })
		},
		[router],
	)

	const containerTag = useMemo(
		() =>
			containerTagFromWorkspace(
				about.workspaceName || suggestedWorkspaceName,
				mode,
			),
		[about.workspaceName, suggestedWorkspaceName, mode],
	)

	const isScale = useMemo(() => {
		const plan = (org?.metadata as Record<string, unknown> | undefined)?.plan
		return plan === "scale" || plan === "scale_yearly"
	}, [org])

	const finish = useCallback(async () => {
		try {
			localStorage.removeItem(STORAGE_KEY)
		} catch {}
		router.push("/?onboarded=1")
	}, [router])

	const goNext = useCallback(() => {
		const idx = BRAIN_STEPS.indexOf(step)
		const next = BRAIN_STEPS[idx + 1]
		if (!next) {
			finish()
			return
		}
		setStepAndUrl(next)
	}, [step, setStepAndUrl, finish])

	const [creatingOrg, setCreatingOrg] = useState(false)
	const creatingOrgRef = useRef(false)

	const ensureOrg = useCallback(async () => {
		if (!forceCreate && organizations && organizations.length > 0) return
		const name = (about.workspaceName || suggestedWorkspaceName).trim()
		const slug = generateOrgSlug(name)
		const metadata: BrainMetadata & { signupSource: string } = {
			signupSource: "consumer",
			brainOnboardingVersion: "v1",
			brainMode: mode,
			brainWorkspaceName: name,
			brainWorkspaceDomain:
				mode === "team" ? about.workspaceDomain || domain : null,
			brainContainerTag: containerTag,
			...(about.about.trim() ? { brainAbout: about.about.trim() } : {}),
		}
		const result = await authClient.organization.create({
			name,
			slug,
			metadata,
		})
		await setActiveOrg(result.data?.slug ?? slug)
		if (about.name.trim()) {
			await authClient.updateUser({
				name: about.name.trim(),
				displayUsername: about.name.trim(),
				username: generateUsername(about.name),
			})
		}
		await refetchOrganizations()
	}, [
		organizations,
		about,
		suggestedWorkspaceName,
		mode,
		domain,
		containerTag,
		setActiveOrg,
		refetchOrganizations,
		forceCreate,
	])

	const handleAboutContinue = useCallback(async () => {
		if (creatingOrgRef.current) return
		creatingOrgRef.current = true
		setCreatingOrg(true)
		try {
			await ensureOrg()
			goNext()
		} catch (e) {
			console.error("Failed to create organization:", e)
			toast.error("Couldn't create your workspace. Please try again.")
		} finally {
			creatingOrgRef.current = false
			setCreatingOrg(false)
		}
	}, [ensureOrg, goNext])

	const [sendingInvites, setSendingInvites] = useState(false)
	const sendingInvitesRef = useRef(false)

	const handleTeamContinue = useCallback(async () => {
		if (sendingInvitesRef.current) return
		const pending = team.invites.filter((i) => i.email.trim())
		if (pending.length === 0) {
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

	return (
		<BrainShell
			step={step}
			domain={mode === "team" ? about.workspaceDomain || domain : null}
		>
			{step === "about" && (
				<StepAbout
					mode={mode}
					onModeChange={setMode}
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
					workspaceName={about.workspaceName || suggestedWorkspaceName}
					mode={mode}
					values={sources}
					onChange={setSources}
					onContinue={goNext}
				/>
			)}
			{step === "ingest" && <StepIngest mcpUrl={mcpUrl} onContinue={goNext} />}
			{step === "team" && (
				<StepTeam
					mode={mode}
					isScale={isScale}
					inviteDomain={about.workspaceDomain || domain || null}
					values={team}
					onChange={setTeam}
					onContinue={handleTeamContinue}
					onSkip={goNext}
					submitting={sendingInvites}
					onUpgrade={() => router.push("/settings/billing")}
				/>
			)}
		</BrainShell>
	)
}
