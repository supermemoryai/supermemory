"use client"

import {
	useState,
	useRef,
	useCallback,
	useEffect,
	useMemo,
	type RefObject,
	type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@lib/auth-context"
import { Logo } from "@ui/assets/Logo"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { $fetch } from "@lib/api"
import { authClient } from "@lib/auth"
import NovaOrb from "@/components/nova/nova-orb"
import { IntegrationGridCard } from "@/components/integrations/integration-grid-card"
import { TeamInviteBeat } from "@/components/onboarding/team-invite-beat"
import { CHROME_EXTENSION_URL } from "@repo/lib/constants"
import { ChromeIcon } from "@/components/integration-icons"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	Check,
	ChevronLeft,
} from "lucide-react"
import { analytics } from "@/lib/analytics"
import { consumePendingConnectUrl } from "@/lib/constants"

type DetectedSource = "x" | "linkedin" | "resume" | null
type SubmittedSource = "x" | "linkedin" | "resume"
type Step = 1 | 2 | 3
type DocState = "idle" | "processing" | "done" | "failed"
type AccountLookupStatus = "checking" | "found" | "not_found" | "error"
type AccountLookup = {
	source: "x" | "linkedin"
	status: AccountLookupStatus
	message: string
}
type DocStatus =
	| "unknown"
	| "queued"
	| "extracting"
	| "chunking"
	| "embedding"
	| "indexing"
	| "done"
	| "failed"

const TOTAL_STEPS = 3

function XIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24H16.17l-4.71-6.23-5.4 6.23H2.74l7.73-8.84L1.25 2.25H8.08l4.25 5.62 5.91-5.62Zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
		</svg>
	)
}

function LinkedInIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M20.45 20.45h-3.55v-5.57c0-1.33-.027-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.046c.477-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29zM5.34 7.43a2.06 2.06 0 0 1-2.06-2.06 2.06 2.06 0 1 1 2.06 2.06zm1.78 13.02H3.56V9h3.56v11.45zM22.23 0H1.77C.792 0 0 .774 0 1.73v20.54C0 23.23.792 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .774 23.2 0 22.22 0h.003z" />
		</svg>
	)
}

function SubmitArrow() {
	return (
		<svg width="12" height="9" viewBox="0 0 12 9" fill="none">
			<title>Submit</title>
			<path
				d="M8.05 9.6L6.93 8.5L9 6.45L9.63 6.04L9.54 5.79L8.8 5.91H0.02V4.31H8.8L9.54 4.43L9.63 4.18L9 3.77L6.93 1.72L8.05 0.6L11.98 4.53V5.69L8.05 9.6Z"
				fill="#FAFAFA"
			/>
		</svg>
	)
}

function detectSource(value: string): DetectedSource {
	const v = value.trim().toLowerCase()
	if (!v) return null
	if (v.includes("linkedin.com/in/") || v.includes("linkedin.com/pub/"))
		return "linkedin"
	if (v.includes("x.com/") || v.includes("twitter.com/") || v.startsWith("@"))
		return "x"
	if (/^[a-z0-9_]{1,50}$/i.test(v)) return "x"
	return null
}

function generateUsername(name: string) {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/(^_|_$)/g, "") || "user"
	return `${base}${Math.floor(100000 + Math.random() * 900000)}`
}

function generateOrgSlug(name: string) {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "") || "org"
	return `${base}-${Math.floor(100000 + Math.random() * 900000)}`
}

const SOURCE_ICON: Record<
	"x" | "linkedin",
	React.FC<{ className?: string }>
> = {
	x: XIcon,
	linkedin: LinkedInIcon,
}

const SOURCE_LABEL: Record<"x" | "linkedin", string> = {
	x: "X profile detected - checking account",
	linkedin: "LinkedIn profile detected - checking account",
}

const SOURCE_NAME: Record<"x" | "linkedin", string> = {
	x: "X",
	linkedin: "LinkedIn",
}

type SmartStep = {
	title: string
	description: string
	icon: ReactNode
	isExternal?: boolean
	onOpen: () => void
}

const connectionsIcon = (
	<div className="flex items-center -space-x-1">
		<GoogleDrive className="size-5" />
		<Notion className="size-5" />
		<OneDrive className="size-5" />
	</div>
)

/** Capability cards shown on step 2, led by the highest-leverage one for the source. */
function buildNextSteps(
	source: SubmittedSource,
	router: ReturnType<typeof useRouter>,
): SmartStep[] {
	const track = (integration: string) =>
		analytics.onboardingIntegrationClicked({ integration })

	const importBookmarks: SmartStep = {
		title: "Import your bookmarks",
		description: "Bring in your X bookmarks and turn them into memories",
		icon: <img src="/onboarding/x.png" alt="X" className="size-10" />,
		onOpen: () => {
			track("import_x")
			void router.push("/?view=import")
		},
	}
	const chromeExt: SmartStep = {
		title: "Chrome extension",
		description: "Save any webpage and sync ChatGPT memories",
		icon: <ChromeIcon className="size-14" />,
		isExternal: true,
		onOpen: () => {
			track("chrome")
			window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer")
		},
	}
	const connectTools: SmartStep = {
		title: "Connect your tools",
		description: "Link Notion, Google Drive, or OneDrive to import docs",
		icon: connectionsIcon,
		onOpen: () => {
			track("connections")
			void router.push("/?add=connect")
		},
	}
	const connectAI: SmartStep = {
		title: "Connect to AI",
		description: "Use your memory in Cursor, Claude, and more via MCP",
		icon: (
			<img src="/onboarding/mcp.png" alt="MCP" className="size-14 h-auto" />
		),
		onOpen: () => {
			track("mcp")
			void router.push("/?view=integrations")
		},
	}

	switch (source) {
		case "x":
			return [importBookmarks, chromeExt, connectAI]
		case "linkedin":
			return [chromeExt, connectTools, connectAI]
		case "resume":
			return [connectTools, chromeExt, connectAI]
	}
}

function isAccountSource(source: DetectedSource): source is "x" | "linkedin" {
	return source === "x" || source === "linkedin"
}

function useInitialInputFocus(inputRef: RefObject<HTMLInputElement | null>) {
	useEffect(() => {
		const t = setTimeout(() => inputRef.current?.focus(), 500)
		return () => clearTimeout(t)
	}, [inputRef])
}

function useAccountLookup({
	detected,
	active,
	value,
}: {
	detected: DetectedSource
	active: boolean
	value: string
}) {
	const [accountLookup, setAccountLookup] = useState<AccountLookup | null>(null)

	useEffect(() => {
		if (!active) return

		const source = isAccountSource(detected) ? detected : null
		const trimmedValue = value.trim()

		if (!source || !trimmedValue) {
			setAccountLookup(null)
			return
		}

		const controller = new AbortController()
		setAccountLookup({
			source,
			status: "checking",
			message: SOURCE_LABEL[source],
		})

		const timeout = setTimeout(async () => {
			try {
				const params = new URLSearchParams({
					source,
					value: trimmedValue,
				})
				const response = await fetch(
					`/api/onboarding/account-status?${params.toString()}`,
					{ signal: controller.signal },
				)
				const data: {
					found?: boolean
					handle?: string
					reason?: string
					verified?: boolean
				} = await response.json().catch(() => ({}))

				if (controller.signal.aborted) return

				if (response.ok && data.found === true) {
					const account =
						source === "x" && data.handle ? ` @${data.handle}` : ""
					setAccountLookup({
						source,
						status: "found",
						message: `${SOURCE_NAME[source]} account${account} found - press Enter to continue`,
					})
					return
				}

				if (
					(response.ok && data.found === false) ||
					data.reason === "invalid"
				) {
					setAccountLookup({
						source,
						status: "not_found",
						message: `${SOURCE_NAME[source]} account not found. Check the link and try again.`,
					})
					return
				}

				setAccountLookup({
					source,
					status: "error",
					message: `Could not verify ${SOURCE_NAME[source]} account. You can still continue.`,
				})
			} catch (err) {
				if (controller.signal.aborted) return
				console.error(err)
				setAccountLookup({
					source,
					status: "error",
					message: `Could not verify ${SOURCE_NAME[source]} account. You can still continue.`,
				})
			}
		}, 450)

		return () => {
			clearTimeout(timeout)
			controller.abort()
		}
	}, [detected, active, value])

	return accountLookup
}

function usePollingCleanup(
	pollingRef: RefObject<ReturnType<typeof setInterval> | null>,
) {
	useEffect(() => {
		return () => {
			if (pollingRef.current) clearInterval(pollingRef.current)
		}
	}, [pollingRef])
}

/** Animated pill, top-right, once the background save lands. Click to jump to the doc. */
function SavedToast({
	docState,
	memoriesCount,
	onSeeMemories,
	onRetry,
}: {
	docState: DocState
	memoriesCount: number
	onSeeMemories: () => void
	onRetry: () => void
}) {
	return (
		<AnimatePresence>
			{docState === "done" && (
				<motion.button
					key="saved"
					type="button"
					initial={{ opacity: 0, y: -8, scale: 0.96 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: -8 }}
					transition={{ type: "spring", stiffness: 360, damping: 24 }}
					onClick={onSeeMemories}
					className="fixed right-6 top-16 z-50 flex items-center gap-3 rounded-2xl border border-[#2261CA]/40 bg-[#080E18]/95 px-4 py-3 text-left backdrop-blur cursor-pointer hover:border-[#2261CA]/70 transition-colors"
				>
					<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4BA0FA]/15">
						<Check className="size-4 text-[#4BA0FA]" />
					</span>
					<span className="flex flex-col">
						<span className="text-sm font-medium text-white">
							Your memory is saved
						</span>
						<span className="text-xs text-[#6BB0FF]">
							{memoriesCount > 0
								? `${memoriesCount} memories · See it →`
								: "Click to see it →"}
						</span>
					</span>
				</motion.button>
			)}
			{docState === "failed" && (
				<motion.button
					key="failed"
					type="button"
					initial={{ opacity: 0, y: -8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -8 }}
					onClick={onRetry}
					className="fixed right-6 top-16 z-50 flex items-center gap-2 rounded-2xl border border-[#FF8A8A]/30 bg-[#080E18]/95 px-4 py-3 text-sm text-[#FF8A8A] backdrop-blur cursor-pointer hover:border-[#FF8A8A]/60 transition-colors"
				>
					<AlertCircle className="size-4" />
					Couldn&apos;t save — tap to retry
				</motion.button>
			)}
		</AnimatePresence>
	)
}

export default function OnboardingPage() {
	const router = useRouter()
	const { user, organizations, refetchOrganizations, setActiveOrg } = useAuth()

	const [step, setStep] = useState<Step>(1)
	const [value, setValue] = useState("")
	const [detected, setDetected] = useState<DetectedSource>(null)
	const [resumeFile, setResumeFile] = useState<File | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [submittedSource, setSubmittedSource] =
		useState<SubmittedSource | null>(null)
	const [docState, setDocState] = useState<DocState>("idle")
	const [_docStatus, setDocStatus] = useState<DocStatus>("queued")
	const [memoriesCount, setMemoriesCount] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const fileRef = useRef<HTMLInputElement>(null)
	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const skippingRef = useRef(false)

	const goToMemories = useCallback(() => {
		router.push("/?view=list")
	}, [router])

	const goHomeOrPendingConnect = useCallback(() => {
		const pendingPath = consumePendingConnectUrl()
		router.push(pendingPath ?? "/")
	}, [router])

	const nextSteps = useMemo(
		() => (submittedSource ? buildNextSteps(submittedSource, router) : []),
		[submittedSource, router],
	)

	useInitialInputFocus(inputRef)
	const accountLookup = useAccountLookup({
		detected,
		active: step === 1,
		value,
	})
	usePollingCleanup(pollingRef)

	const handleChange = (v: string) => {
		setValue(v)
		setDetected(detectSource(v))
	}

	const ensureOrg = useCallback(async () => {
		if (organizations && organizations.length > 0) return
		const name = user?.name || user?.email || "Personal"
		const slug = generateOrgSlug(name)
		const result = await authClient.organization.create({
			name,
			slug,
			metadata: { signupSource: "consumer" },
		})
		await setActiveOrg(result.data?.slug ?? slug)
		if (user?.name) {
			await authClient.updateUser({
				displayUsername: user.name,
				username: generateUsername(user.name),
			})
		}
		await refetchOrganizations()
	}, [user, organizations, refetchOrganizations, setActiveOrg])

	const handleSkip = useCallback(async () => {
		if (skippingRef.current) return
		skippingRef.current = true
		try {
			await ensureOrg()
			const pendingPath = consumePendingConnectUrl()
			router.push(pendingPath ?? "/")
		} catch (err) {
			console.error(err)
			skippingRef.current = false
		}
	}, [ensureOrg, router])

	const pollDocument = useCallback((docId: string) => {
		const maxAttempts = 60
		let attempt = 0

		pollingRef.current = setInterval(async () => {
			attempt++
			if (attempt > maxAttempts) {
				if (pollingRef.current) clearInterval(pollingRef.current)
				setDocState("failed")
				return
			}

			try {
				const res = await $fetch("@get/documents/:id", {
					params: { id: docId },
					disableValidation: true,
				})

				if (!res.data) return

				const doc = res.data as {
					status?: DocStatus
					memories?: { memory: string; title?: string }[]
					title?: string
				}

				const s = doc.status ?? "queued"
				setDocStatus(s)
				if (doc.memories) setMemoriesCount(doc.memories.length)

				if (s === "done") {
					if (pollingRef.current) clearInterval(pollingRef.current)
					setDocState("done")
				} else if (s === "failed") {
					if (pollingRef.current) clearInterval(pollingRef.current)
					setDocState("failed")
				}
			} catch {
				// keep polling on transient errors
			}
		}, 1500)
	}, [])

	/** Kick off the save in the background and move the user into the wizard. */
	const startProcessing = useCallback(
		async (source: SubmittedSource, resumeFileOverride?: File) => {
			setSubmittedSource(source)
			setDocState("processing")
			setDocStatus("queued")
			setMemoriesCount(0)
			setStep(2)

			try {
				await ensureOrg()

				let docId: string | undefined

				if (source === "x" || source === "linkedin") {
					const raw = value.trim()
					const content = raw.startsWith("http")
						? raw
						: source === "x"
							? `https://x.com/${raw.replace(/^@/, "")}`
							: `https://${raw}`
					const res = await $fetch("@post/documents", {
						body: {
							content,
							metadata: { sm_source: "onboarding" },
						},
					})
					docId = (res.data as { id?: string } | undefined)?.id
				} else if (source === "resume") {
					const file = resumeFileOverride ?? resumeFile
					if (!file) throw new Error("No resume file selected")
					const formData = new FormData()
					formData.append("file", file)
					const uploadRes = await fetch(
						`${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/documents/file`,
						{ method: "POST", body: formData, credentials: "include" },
					)
					if (!uploadRes.ok) throw new Error("Resume upload failed")
					const uploadData = await uploadRes.json()
					docId = uploadData?.id
				}

				if (docId) {
					pollDocument(docId)
				} else {
					setDocState("done")
				}
			} catch (err) {
				console.error(err)
				setDocState("failed")
			}
		},
		[value, resumeFile, ensureOrg, pollDocument],
	)

	const retryProcessing = useCallback(() => {
		if (pollingRef.current) clearInterval(pollingRef.current)
		setDocState("idle")
		setStep(1)
	}, [])

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const f = e.dataTransfer.files[0]
		if (f?.type === "application/pdf") {
			setResumeFile(f)
			startProcessing("resume", f)
		}
	}

	const hasDetectedAccount = detected === "x" || detected === "linkedin"
	const currentAccountLookup =
		accountLookup?.source === detected ? accountLookup : null
	const isCheckingAccount =
		hasDetectedAccount &&
		(!currentAccountLookup || currentAccountLookup.status === "checking")
	const canSubmit = Boolean(
		hasDetectedAccount &&
			currentAccountLookup &&
			currentAccountLookup.status !== "checking" &&
			currentAccountLookup.status !== "not_found",
	)

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: full-surface drag-and-drop for resume PDF
		<div
			className={cn(
				"relative min-h-screen bg-black flex flex-col overflow-x-hidden overflow-y-auto",
				dmSansClassName(),
			)}
			onDragOver={(e) => {
				e.preventDefault()
				setIsDragging(true)
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
		>
			<AnimatePresence>
				{isDragging && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center border-2 border-dashed border-white/20 bg-black/80 backdrop-blur-sm"
					>
						<p className="text-white text-lg font-medium">
							Drop your PDF resume
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			<SavedToast
				docState={docState}
				memoriesCount={memoriesCount}
				onSeeMemories={goToMemories}
				onRetry={retryProcessing}
			/>

			<div className="flex items-center justify-between px-6 py-5 shrink-0 z-10">
				<Logo className="h-7" />
				<button
					type="button"
					onClick={handleSkip}
					className="text-[#525966] text-sm hover:text-white transition-colors cursor-pointer"
				>
					Skip for now →
				</button>
			</div>

			<div className="flex flex-1 flex-col items-center justify-center gap-10 pb-16 min-h-0 w-full">
				<AnimatePresence mode="wait">
					{/* ── STEP 1 · INPUT ── */}
					{step === 1 && (
						<motion.div
							key="step-1"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0, transition: { duration: 0.2 } }}
							transition={{ duration: 0.5 }}
							className="flex flex-col items-center gap-8 w-full max-w-[480px] px-6"
						>
							<NovaOrb size={180} />

							<h1 className="text-white text-[32px] font-medium leading-[110%] text-center">
								Let NOVA know about you
							</h1>

							<div className="w-full space-y-3">
								<div className="relative flex items-center">
									<AnimatePresence>
										{detected && detected !== "resume" && (
											<motion.span
												initial={{ opacity: 0, scale: 0.8 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.8 }}
												transition={{ duration: 0.15 }}
												className="absolute left-3 flex items-center pointer-events-none"
											>
												{(() => {
													const Icon = SOURCE_ICON[detected as "x" | "linkedin"]
													return <Icon className="size-3.5 text-[#6BB0FF]" />
												})()}
											</motion.span>
										)}
									</AnimatePresence>

									<input
										ref={inputRef}
										type="text"
										value={value}
										onChange={(e) => handleChange(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter" && canSubmit)
												startProcessing(detected as "x" | "linkedin")
										}}
										placeholder="Paste an X handle, LinkedIn URL, or drop a PDF"
										className={cn(
											"w-full py-3 bg-[#070E1B] border rounded-xl text-white text-sm placeholder:text-[#525966] focus:outline-none transition-all",
											detected && detected !== "resume"
												? "pl-8 pr-11"
												: "px-4 pr-11",
											detected
												? "border-[#2261CA]/50 focus:border-[#2261CA]"
												: "border-[#52596633] focus:border-white/20",
										)}
									/>

									<AnimatePresence>
										{isCheckingAccount && (
											<motion.span
												initial={{ opacity: 0, scale: 0.8 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.8 }}
												transition={{ duration: 0.15 }}
												className="absolute right-3 flex items-center pointer-events-none"
											>
												<Loader2 className="size-4 animate-spin text-[#6BB0FF]" />
											</motion.span>
										)}
									</AnimatePresence>

									{canSubmit && (
										<motion.button
											type="button"
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											onClick={() =>
												startProcessing(detected as "x" | "linkedin")
											}
											className="absolute right-1 rounded-xl size-8 flex items-center justify-center border-[0.5px] border-[#161F2C] hover:scale-[0.95] active:scale-[0.95] transition-transform cursor-pointer"
											style={{
												background:
													"linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
											}}
										>
											<SubmitArrow />
										</motion.button>
									)}
								</div>

								<AnimatePresence>
									{detected && detected !== "resume" && (
										<motion.p
											initial={{ opacity: 0, y: -4 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -4 }}
											transition={{ duration: 0.2 }}
											className={cn(
												"flex items-center gap-1.5 text-xs pl-1",
												currentAccountLookup?.status === "found" &&
													"text-[#65D08C]",
												currentAccountLookup?.status === "not_found" &&
													"text-[#FF8A8A]",
												currentAccountLookup?.status === "error" &&
													"text-[#F0B86A]",
												(!currentAccountLookup ||
													currentAccountLookup.status === "checking") &&
													"text-[#6BB0FF]",
											)}
										>
											{currentAccountLookup?.status === "found" && (
												<CheckCircle2 className="size-3.5 shrink-0" />
											)}
											{currentAccountLookup?.status === "not_found" && (
												<AlertCircle className="size-3.5 shrink-0" />
											)}
											{currentAccountLookup?.status === "error" && (
												<AlertCircle className="size-3.5 shrink-0" />
											)}
											{isCheckingAccount && (
												<Loader2 className="size-3.5 shrink-0 animate-spin" />
											)}
											<span>
												{currentAccountLookup?.message ??
													SOURCE_LABEL[detected as "x" | "linkedin"]}
											</span>
										</motion.p>
									)}
								</AnimatePresence>

								{!detected && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.6 }}
										className="flex items-center justify-center gap-4"
									>
										{[
											{
												label: "@yourhandle",
												action: () => {
													handleChange("@")
													inputRef.current?.focus()
												},
											},
											{
												label: "linkedin.com/in/you",
												action: () => {
													handleChange("linkedin.com/in/")
													inputRef.current?.focus()
												},
											},
											{
												label: "Drop a PDF resume",
												action: () => fileRef.current?.click(),
											},
										].map((chip) => (
											<button
												key={chip.label}
												type="button"
												onClick={chip.action}
												className="text-xs text-[#525966] hover:text-[#8B9DB5] transition-colors cursor-pointer"
											>
												{chip.label}
											</button>
										))}
									</motion.div>
								)}
							</div>

							<input
								ref={fileRef}
								type="file"
								accept=".pdf"
								className="hidden"
								onChange={(e) => {
									const f = e.target.files?.[0]
									if (f) {
										setResumeFile(f)
										startProcessing("resume", f)
									}
								}}
							/>
						</motion.div>
					)}

					{/* ── STEP 2 · CAPABILITIES ── */}
					{step === 2 && (
						<motion.div
							key="step-2"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
							transition={{ duration: 0.4 }}
							className="flex flex-col items-center gap-8 w-full max-w-2xl px-6"
						>
							<NovaOrb size={96} className="blur-[2px]" />

							<div className="text-center space-y-2">
								<p className="text-white text-2xl font-medium leading-tight tracking-tight">
									Here&apos;s what you can do with Nova
								</p>
								<p className="text-sm text-[#6b7c91] leading-relaxed">
									We&apos;re saving your first memory in the background. Explore
									while it finishes.
								</p>
							</div>

							<div className="grid w-full gap-3 sm:grid-cols-3">
								{nextSteps.map((card) => (
									<IntegrationGridCard
										key={card.title}
										title={card.title}
										description={card.description}
										icon={card.icon}
										isExternal={card.isExternal}
										onClick={card.onOpen}
									/>
								))}
							</div>
						</motion.div>
					)}

					{/* ── STEP 3 · TEAM ── */}
					{step === 3 && (
						<motion.div
							key="step-3"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
							transition={{ duration: 0.4 }}
							className="flex flex-col items-center gap-6 w-full max-w-[460px] px-6"
						>
							<TeamInviteBeat />
						</motion.div>
					)}
				</AnimatePresence>

				{/* ── WIZARD NAV (steps 2 & 3) ── */}
				{step > 1 && (
					<div className="flex flex-col items-center gap-5 w-full max-w-2xl px-6">
						<div className="flex items-center gap-2">
							{Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((d) => (
								<span
									key={d}
									className={cn(
										"h-1.5 rounded-full transition-all duration-300",
										d === step ? "w-6 bg-[#4BA0FA]" : "w-1.5 bg-white/15",
									)}
								/>
							))}
						</div>

						<div className="relative flex items-center justify-center w-full">
							{step === 3 && (
								<button
									type="button"
									onClick={() => setStep(2)}
									className="absolute left-0 flex items-center gap-1 text-sm text-[#6b7c91] hover:text-white transition-colors cursor-pointer"
								>
									<ChevronLeft className="size-4" />
									Back
								</button>
							)}

							<button
								type="button"
								onClick={() =>
									step === 2 ? setStep(3) : goHomeOrPendingConnect()
								}
								className="rounded-xl px-6 py-2.5 text-sm font-medium text-white cursor-pointer hover:scale-[0.98] active:scale-[0.96] transition-transform border-[0.5px] border-[#2261CA]/40"
								style={{
									background:
										"linear-gradient(180deg, #0D1E3A -26.14%, #060C18 100%)",
								}}
							>
								{step === 2 ? "Next →" : "Finish →"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
