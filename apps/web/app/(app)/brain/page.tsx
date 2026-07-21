"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { SHARED_TEAM_BRAIN_TAG } from "@lib/constants"
import { cn } from "@lib/utils"
import { analytics } from "@/lib/analytics"
import { dmSansClassName } from "@/lib/fonts"
import {
	detectModeFromEmail,
	generateOrgSlug,
	workspaceDomainFromEmail,
	workspaceNameFromDomain,
	workspaceNameFromEmail,
	type BrainMetadata,
} from "@/components/onboarding-brain/types"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

// No forms: sign up → org auto-created → Slack install. The bot asks the rest.
export default function BrainEntryPage() {
	const router = useRouter()
	const { user, org, organizations, setActiveOrg, refetchOrganizations } =
		useAuth()
	const { email = null } = user ?? {}
	const [error, setError] = useState<string | null>(null)
	const [attempt, setAttempt] = useState(0)
	const startedRef = useRef(false)

	const run = useCallback(async () => {
		if (organizations && organizations.length > 0) {
			const active =
				org ?? organizations.find((o) => o.slug) ?? organizations[0]
			if (!org && active?.slug) await setActiveOrg(active.slug)
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
			return
		}

		// Personal email → shell org; the Slack workspace resolves identity later.
		const domain =
			detectModeFromEmail(email) === "team"
				? workspaceDomainFromEmail(email)
				: null
		const name =
			(domain
				? workspaceNameFromDomain(domain)
				: workspaceNameFromEmail(email)) || "Company Brain"
		const metadata: BrainMetadata & { signupSource: string } = {
			signupSource: "consumer",
			brainOnboardingVersion: "v1",
			brainMode: "team",
			brainWorkspaceName: name,
			brainWorkspaceDomain: domain,
			// Always the shared Team Brain; the CB UI never selects a slug space.
			brainContainerTag: SHARED_TEAM_BRAIN_TAG,
		}
		const result = await authClient.organization.create({
			name,
			slug: generateOrgSlug(name),
			metadata,
		})
		if (result.error || !result.data?.slug) {
			throw new Error(result.error?.message || "Could not create workspace.")
		}
		await setActiveOrg(result.data.slug)
		await refetchOrganizations()
		analytics.onboardingWorkspaceCreated({
			mode: "team",
			has_about: false,
			has_domain: Boolean(domain),
		})
		window.location.href = `${BACKEND}/brain/slack/oauth/install`
	}, [email, org, organizations, setActiveOrg, refetchOrganizations, router])

	// Sole caller of run(): the guard is only released on failure, so a dep change
	// mid-flight can't kick off a second org creation.
	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt retriggers the retry
	useEffect(() => {
		if (!user || organizations === null || startedRef.current) return
		startedRef.current = true
		run().catch((e) => {
			startedRef.current = false
			console.error("Brain entry failed:", e)
			setError(e instanceof Error ? e.message : "Something went wrong.")
		})
	}, [user, organizations, run, attempt])

	return (
		<div
			className={cn(
				"flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#05080D] px-6 text-center",
				dmSansClassName(),
			)}
		>
			{error ? (
				<>
					<p className="text-[15px] font-medium text-[#FAFAFA]">
						Couldn't set up your Company Brain
					</p>
					<p className="max-w-sm text-[13px] text-[#8A94A6]">{error}</p>
					<button
						type="button"
						onClick={() => {
							setError(null)
							setAttempt((a) => a + 1)
						}}
						className="rounded-full bg-white px-5 py-2 text-[13px] font-semibold text-[#1D1C1D] hover:bg-white/95"
					>
						Try again
					</button>
				</>
			) : (
				<>
					<Loader2 className="size-6 animate-spin text-[#4BA0FA]" />
					<p className="text-[14px] font-medium text-[#8A94A6]">
						Setting up your Company Brain…
					</p>
				</>
			)}
		</div>
	)
}
