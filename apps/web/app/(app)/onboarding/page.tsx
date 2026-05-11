"use client"

import {
	useState,
	useRef,
	useCallback,
	useEffect,
	useMemo,
	type Dispatch,
	type RefObject,
	type ReactNode,
	type SetStateAction,
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
import Image from "next/image"
import { IntegrationGridCard } from "@/components/integrations/integration-grid-card"
import {
	CHROME_EXTENSION_URL,
	RAYCAST_EXTENSION_URL,
	ADD_MEMORY_SHORTCUT_URL,
} from "@repo/lib/constants"
import {
	ChromeIcon,
	AppleShortcutsIcon,
	RaycastIcon,
} from "@/components/integration-icons"
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons"
import {
	Sparkles,
	ChevronLeft,
	ChevronRight,
	AlertCircle,
	CheckCircle2,
	Loader2,
} from "lucide-react"
import { analytics } from "@/lib/analytics"

type DetectedSource = "x" | "linkedin" | "resume" | null
type Status = "idle" | "processing" | "done" | "error"
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

type SpotlightItem = {
	id: string
	title: string
	description: string
	icon: ReactNode
	pro?: boolean
	onOpen: () => void
}

type SpotlightCategoryId = "coding" | "productivity" | "agents"

const SPOTLIGHT_CATEGORY_TABS: { id: SpotlightCategoryId; label: string }[] = [
	{ id: "coding", label: "Coding" },
	{ id: "productivity", label: "Productivity" },
	{ id: "agents", label: "Agents" },
]

const SPOTLIGHT_CATEGORY_ORDER: SpotlightCategoryId[] =
	SPOTLIGHT_CATEGORY_TABS.map((t) => t.id)

function spotlightPluginCornerIcon(src: string, alt: string) {
	return (
		<Image
			src={src}
			alt={alt}
			width={40}
			height={40}
			className="size-10 rounded"
		/>
	)
}

const spotlightConnectionsIcon = (
	<div className="flex items-center -space-x-1">
		<GoogleDrive className="size-5" />
		<Notion className="size-5" />
		<OneDrive className="size-5" />
	</div>
)

function buildSpotlightCatalog(
	router: ReturnType<typeof useRouter>,
): Record<SpotlightCategoryId, SpotlightItem[]> {
	const track = (integration: string) =>
		analytics.onboardingIntegrationClicked({ integration })

	const openPluginsPanel = () => {
		void router.push("/?view=plugins")
	}

	return {
		coding: [
			{
				id: "mcp",
				title: "Connect to AI",
				description:
					"Set up MCP to use your memory in Cursor, Claude, and more",
				icon: (
					<img src="/onboarding/mcp.png" alt="MCP" className="size-20 h-auto" />
				),
				onOpen: () => {
					track("mcp")
					void router.push("/?view=integrations")
				},
			},
			{
				id: "coding-claude-supermemory",
				title: "Claude Supermemory",
				description:
					"Persistent memory for Claude Code — context and decisions across sessions.",
				icon: spotlightPluginCornerIcon(
					"/images/plugins/claude-code.svg",
					"Claude Supermemory",
				),
				pro: true,
				onOpen: () => {
					track("plugin_claude_supermemory")
					openPluginsPanel()
				},
			},
			{
				id: "coding-opencode",
				title: "OpenCode",
				description:
					"Memory layer for OpenCode — search past sessions and inject context.",
				icon: spotlightPluginCornerIcon(
					"/images/plugins/opencode.svg",
					"OpenCode",
				),
				pro: true,
				onOpen: () => {
					track("plugin_opencode")
					openPluginsPanel()
				},
			},
			{
				id: "connections",
				title: "Connections",
				description:
					"Link Notion, Google Drive, or OneDrive to import your docs",
				icon: spotlightConnectionsIcon,
				pro: true,
				onOpen: () => {
					track("connections")
					void router.push("/?add=connect")
				},
			},
		],
		productivity: [
			{
				id: "chrome",
				title: "Chrome Extension",
				description:
					"Save any webpage, import bookmarks, sync ChatGPT memories",
				icon: <ChromeIcon className="size-14" />,
				onOpen: () => {
					window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer")
					analytics.onboardingChromeExtensionClicked({ source: "onboarding" })
				},
			},
			{
				id: "raycast",
				title: "Raycast",
				description: "Add and search memories from Raycast on Mac",
				icon: <RaycastIcon className="size-10" />,
				onOpen: () => {
					track("raycast")
					window.open(RAYCAST_EXTENSION_URL, "_blank", "noopener,noreferrer")
				},
			},
			{
				id: "shortcuts",
				title: "Apple Shortcuts",
				description: "Add memories directly from iPhone, iPad or Mac",
				icon: <AppleShortcutsIcon />,
				onOpen: () => {
					track("shortcuts")
					window.open(ADD_MEMORY_SHORTCUT_URL, "_blank", "noopener,noreferrer")
				},
			},
			{
				id: "import",
				title: "Import Bookmarks",
				description: "Bring in X/Twitter bookmarks and turn them into memories",
				icon: <img src="/onboarding/x.png" alt="X" className="size-10" />,
				onOpen: () => {
					track("import_x")
					void router.push("/?view=import")
				},
			},
		],
		agents: [
			{
				id: "agents-openclaw",
				title: "OpenClaw",
				description:
					"Multi-platform memory for OpenClaw — Telegram, WhatsApp, Discord, Slack, and more.",
				icon: spotlightPluginCornerIcon(
					"/images/plugins/openclaw.svg",
					"OpenClaw",
				),
				pro: true,
				onOpen: () => {
					track("plugin_openclaw")
					openPluginsPanel()
				},
			},
			{
				id: "agents-hermes",
				title: "Hermes",
				description:
					"Memory layer for the Hermes agent — recall, capture, and user profile.",
				icon: spotlightPluginCornerIcon("/images/plugins/hermes.svg", "Hermes"),
				onOpen: () => {
					track("plugin_hermes")
					openPluginsPanel()
				},
			},
			{
				id: "agents-claude-supermemory",
				title: "Claude Supermemory",
				description:
					"Persistent memory for Claude Code — context and decisions across sessions.",
				icon: spotlightPluginCornerIcon(
					"/images/plugins/claude-code.svg",
					"Claude Supermemory",
				),
				pro: true,
				onOpen: () => {
					track("plugin_claude_supermemory")
					openPluginsPanel()
				},
			},
			{
				id: "agents-opencode",
				title: "OpenCode",
				description:
					"Memory layer for OpenCode — search past sessions and inject context.",
				icon: spotlightPluginCornerIcon(
					"/images/plugins/opencode.svg",
					"OpenCode",
				),
				pro: true,
				onOpen: () => {
					track("plugin_opencode")
					openPluginsPanel()
				},
			},
			{
				id: "console-api",
				title: "Console & API",
				description:
					"API keys, orgs, and the hosted API for production agent workloads",
				icon: <Sparkles className="size-10" />,
				onOpen: () => {
					track("console_api")
					window.open(
						"https://console.supermemory.ai",
						"_blank",
						"noopener,noreferrer",
					)
				},
			},
		],
	}
}

function isAccountSource(source: DetectedSource): source is "x" | "linkedin" {
	return source === "x" || source === "linkedin"
}

function useSpotlightAutoRotation(
	status: Status,
	pauseSpotlight: boolean,
	setSpotlightCategory: Dispatch<SetStateAction<SpotlightCategoryId>>,
) {
	useEffect(() => {
		if (status !== "processing") return
		if (pauseSpotlight) return
		const n = SPOTLIGHT_CATEGORY_ORDER.length
		if (n <= 1) return
		const t = setInterval(() => {
			setSpotlightCategory((cur) => {
				const i = SPOTLIGHT_CATEGORY_ORDER.indexOf(cur)
				const from = i >= 0 ? i : 0
				const next = (from + 1) % n
				return SPOTLIGHT_CATEGORY_ORDER[next] ?? cur
			})
		}, 8000)
		return () => clearInterval(t)
	}, [status, pauseSpotlight, setSpotlightCategory])
}

function useInitialInputFocus(inputRef: RefObject<HTMLInputElement | null>) {
	useEffect(() => {
		const t = setTimeout(() => inputRef.current?.focus(), 500)
		return () => clearTimeout(t)
	}, [inputRef])
}

function useAccountLookup({
	detected,
	status,
	value,
}: {
	detected: DetectedSource
	status: Status
	value: string
}) {
	const [accountLookup, setAccountLookup] = useState<AccountLookup | null>(null)

	useEffect(() => {
		if (status !== "idle") return

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
	}, [detected, status, value])

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

function useDoneAnimation(
	status: Status,
	setStampLanded: Dispatch<SetStateAction<boolean>>,
	setVisibleSnippets: Dispatch<SetStateAction<number>>,
) {
	useEffect(() => {
		if (status !== "done") return
		setStampLanded(false)
		setVisibleSnippets(0)
		const t1 = setTimeout(() => setStampLanded(true), 400)
		const t2 = setTimeout(() => setVisibleSnippets(1), 900)
		const t3 = setTimeout(() => setVisibleSnippets(2), 1200)
		const t4 = setTimeout(() => setVisibleSnippets(3), 1500)
		return () => {
			clearTimeout(t1)
			clearTimeout(t2)
			clearTimeout(t3)
			clearTimeout(t4)
		}
	}, [status, setStampLanded, setVisibleSnippets])
}

export default function OnboardingPage() {
	const router = useRouter()
	const { user, organizations, refetchOrganizations, setActiveOrg } = useAuth()

	const [value, setValue] = useState("")
	const [detected, setDetected] = useState<DetectedSource>(null)
	const [resumeFile, setResumeFile] = useState<File | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [status, setStatus] = useState<Status>("idle")
	const [_docStatus, setDocStatus] = useState<DocStatus>("queued")
	const [memoriesCount, setMemoriesCount] = useState(0)
	const [memorySnippets, setMemorySnippets] = useState<string[]>([])
	const [docTitle, setDocTitle] = useState("")
	const [errorMsg, setErrorMsg] = useState("")
	const [stampLanded, setStampLanded] = useState(false)
	const [visibleSnippets, setVisibleSnippets] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const fileRef = useRef<HTMLInputElement>(null)
	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const skippingRef = useRef(false)
	const [spotlightCategory, setSpotlightCategory] =
		useState<SpotlightCategoryId>("productivity")
	const [pauseSpotlight, setPauseSpotlight] = useState(false)

	const spotlightCatalog = useMemo(
		() => buildSpotlightCatalog(router),
		[router],
	)
	const categoryCards = spotlightCatalog[spotlightCategory] ?? []

	const bumpSpotlightCategory = useCallback(
		(delta: number) => {
			const n = SPOTLIGHT_CATEGORY_ORDER.length
			if (n === 0) return
			const i = SPOTLIGHT_CATEGORY_ORDER.indexOf(spotlightCategory)
			const from = i >= 0 ? i : 0
			const next = (from + delta + n) % n
			const id = SPOTLIGHT_CATEGORY_ORDER[next]
			if (id) setSpotlightCategory(id)
		},
		[spotlightCategory],
	)

	useSpotlightAutoRotation(status, pauseSpotlight, setSpotlightCategory)
	useInitialInputFocus(inputRef)
	const accountLookup = useAccountLookup({ detected, status, value })
	usePollingCleanup(pollingRef)
	useDoneAnimation(status, setStampLanded, setVisibleSnippets)

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
			router.push("/")
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
				setErrorMsg("Processing is taking too long. Try again later.")
				setStatus("error")
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

				if (doc.memories) {
					setMemoriesCount(doc.memories.length)
					setMemorySnippets(
						doc.memories
							.slice(0, 3)
							.map((m: { memory: string; title?: string }) => m.memory)
							.filter(Boolean),
					)
				}
				if (doc.title) setDocTitle(doc.title)

				if (s === "done") {
					if (pollingRef.current) clearInterval(pollingRef.current)
					await new Promise((r) => setTimeout(r, 600))
					setStatus("done")
				} else if (s === "failed") {
					if (pollingRef.current) clearInterval(pollingRef.current)
					setErrorMsg("Processing failed. You can skip and try later.")
					setStatus("error")
				}
			} catch {
				// keep polling on transient errors
			}
		}, 1500)
	}, [])

	const handleSubmit = useCallback(
		async (source: "x" | "linkedin" | "resume", resumeFileOverride?: File) => {
			setStatus("processing")
			setSpotlightCategory("productivity")
			setPauseSpotlight(false)
			setDocStatus("queued")
			setMemoriesCount(0)
			setDocTitle("")

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
					await new Promise((r) => setTimeout(r, 2000))
					setStatus("done")
				}
			} catch (err) {
				console.error(err)
				setErrorMsg("Something went wrong. You can skip and try later.")
				setStatus("error")
			}
		},
		[value, resumeFile, ensureOrg, pollDocument],
	)

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const f = e.dataTransfer.files[0]
		if (f?.type === "application/pdf") {
			setResumeFile(f)
			handleSubmit("resume", f)
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
				"relative min-h-screen bg-black flex flex-col overflow-x-hidden",
				status === "processing" ? "overflow-y-auto" : "overflow-hidden",
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

			<div
				className={cn(
					"flex flex-1 flex-col pb-16 min-h-0 w-full",
					status === "processing"
						? "items-stretch justify-start pt-2"
						: "items-center justify-center",
				)}
			>
				<AnimatePresence mode="wait">
					{/* ── IDLE ── */}
					{status === "idle" && (
						<motion.div
							key="idle"
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
												handleSubmit(detected as "x" | "linkedin")
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
											onClick={() => handleSubmit(detected as "x" | "linkedin")}
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
										handleSubmit("resume", f)
									}
								}}
							/>
						</motion.div>
					)}

					{/* ── PROCESSING ── */}
					{status === "processing" && (
						<motion.div
							key="processing"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.35 }}
							className="flex flex-col items-center w-full max-w-xl mx-auto px-6 pb-20 gap-10"
						>
							<NovaOrb size={88} className="blur-[3px]" />

							<div className="text-center space-y-2 max-w-sm">
								<p className="text-white text-2xl font-medium leading-tight tracking-tight">
									Finishing your first save
								</p>
								<p className="text-sm text-[#6b7c91] leading-relaxed">
									Most finish in under a minute. Below is optional: ways to add
									more later.
								</p>
							</div>

							<div className="w-full flex flex-col gap-5">
								{/* biome-ignore lint/a11y/noStaticElementInteractions: pause category rotation on hover/focus within */}
								<div
									className="flex flex-col gap-4 outline-none"
									onMouseEnter={() => setPauseSpotlight(true)}
									onMouseLeave={() => setPauseSpotlight(false)}
									onFocus={() => setPauseSpotlight(true)}
									onBlur={(e) => {
										if (
											!e.currentTarget.contains(e.relatedTarget as Node | null)
										) {
											setPauseSpotlight(false)
										}
									}}
								>
									<div className="flex items-center justify-center gap-1 sm:gap-2">
										<button
											type="button"
											id="onboarding-spotlight-category-prev"
											aria-label="Previous category"
											onClick={() => bumpSpotlightCategory(-1)}
											className="rounded-full p-2 text-[#5c6d82] hover:text-white hover:bg-white/5 cursor-pointer transition-colors shrink-0"
										>
											<ChevronLeft className="size-5" />
										</button>
										<div
											className="flex flex-wrap justify-center gap-2 flex-1 min-w-0"
											role="tablist"
											aria-label="Integration categories"
										>
											{SPOTLIGHT_CATEGORY_TABS.map((tab) => (
												<button
													key={tab.id}
													type="button"
													role="tab"
													aria-selected={spotlightCategory === tab.id}
													onClick={() => setSpotlightCategory(tab.id)}
													className={cn(
														"rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer",
														spotlightCategory === tab.id
															? "bg-white/12 text-white"
															: "text-[#6b7c91] hover:text-[#9aadbf]",
													)}
												>
													{tab.label}
												</button>
											))}
										</div>
										<button
											type="button"
											id="onboarding-spotlight-category-next"
											aria-label="Next category"
											onClick={() => bumpSpotlightCategory(1)}
											className="rounded-full p-2 text-[#5c6d82] hover:text-white hover:bg-white/5 cursor-pointer transition-colors shrink-0"
										>
											<ChevronRight className="size-5" />
										</button>
									</div>

									<div
										className="flex justify-center gap-2"
										id="onboarding-spotlight-category-dots"
									>
										{SPOTLIGHT_CATEGORY_TABS.map((tab) => (
											<button
												key={tab.id}
												type="button"
												aria-label={`Show ${tab.label}`}
												onClick={() => setSpotlightCategory(tab.id)}
												className={cn(
													"h-1.5 rounded-full transition-all duration-300",
													spotlightCategory === tab.id
														? "w-6 bg-[#4BA0FA]"
														: "w-1.5 bg-white/15 hover:bg-white/30",
												)}
											/>
										))}
									</div>

									<AnimatePresence mode="wait">
										<motion.div
											key={spotlightCategory}
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -8 }}
											transition={{ duration: 0.2 }}
											className="grid gap-3 w-full max-w-3xl mx-auto sm:grid-cols-2"
										>
											{categoryCards.map((card) => (
												<IntegrationGridCard
													key={card.id}
													title={card.title}
													description={card.description}
													icon={card.icon}
													pro={card.pro}
													onClick={card.onOpen}
												/>
											))}
										</motion.div>
									</AnimatePresence>
								</div>

								<button
									type="button"
									id="onboarding-all-integrations"
									onClick={() => {
										analytics.onboardingIntegrationClicked({
											integration: "all_from_processing",
										})
										void router.push("/?view=integrations")
									}}
									className="text-center text-xs text-[#4d5d72] hover:text-[#8B9DB5] transition-colors cursor-pointer"
								>
									All integrations
								</button>
							</div>
						</motion.div>
					)}

					{/* ── DONE ── */}
					{status === "done" && (
						<motion.div
							key="done"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.4 }}
							className="flex flex-col items-center gap-6 text-center w-full max-w-[440px] px-6"
						>
							<div className="space-y-2">
								<p className="text-white text-2xl font-medium leading-tight">
									It&apos;s in your memory
								</p>
								<p className="text-sm text-[#8B9DB5] leading-relaxed">
									Your first save is ready. When you want more, use Integrations
									for browser, phone, editor, and AI tools, all in one place.
								</p>
							</div>

							{/* Document card with stamp */}
							<div className="relative w-full">
								{/* Clickable document card */}
								<motion.button
									type="button"
									initial={{ opacity: 0, y: 12 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4 }}
									onClick={() => router.push("/?view=list")}
									className="group w-full text-left bg-[#080E18] border border-[rgba(255,255,255,0.07)] rounded-2xl p-4 cursor-pointer hover:border-[rgba(255,255,255,0.14)] transition-colors"
								>
									{/* Faux document lines */}
									<div className="space-y-2.5 mb-4">
										<div className="h-2 w-3/5 rounded-full bg-[#1A2438]" />
										<div className="h-1.5 w-full rounded-full bg-[#131B2A]" />
										<div className="h-1.5 w-[90%] rounded-full bg-[#131B2A]" />
										<div className="h-1.5 w-4/5 rounded-full bg-[#131B2A]" />
										<div className="h-1.5 w-[92%] rounded-full bg-[#131B2A]" />
										<div className="h-1.5 w-3/5 rounded-full bg-[#131B2A]" />
									</div>
									<div className="flex items-center justify-between">
										<p className="text-[11px] text-[#3A4A5E] truncate pr-2">
											{docTitle || "Your document"}
										</p>
										<span className="shrink-0 text-[10px] font-medium text-[#4BA0FA] bg-[#4BA0FA]/10 rounded-full px-2 py-0.5">
											{memoriesCount} memories
										</span>
									</div>
									<p className="mt-2 text-[11px] text-[#2A3A50] group-hover:text-[#4A6A80] transition-colors">
										View in memories →
									</p>
								</motion.button>

								{/* Stamp */}
								<motion.div
									initial={{ y: -60, rotate: -18, scale: 1.1, opacity: 0 }}
									animate={
										stampLanded
											? { y: -28, rotate: -12, scale: 1, opacity: 1 }
											: { y: -60, rotate: -18, scale: 1.1, opacity: 0 }
									}
									transition={{ type: "spring", stiffness: 400, damping: 18 }}
									className="absolute -top-2 right-4 pointer-events-none"
								>
									<div className="relative flex items-center justify-center size-[72px]">
										{/* Ink ring ripple */}
										{stampLanded && (
											<motion.div
												initial={{ scale: 0.6, opacity: 0.5 }}
												animate={{ scale: 1.5, opacity: 0 }}
												transition={{ duration: 0.5, ease: "easeOut" }}
												className="absolute inset-0 rounded-full border border-[#4BA0FA]/40"
											/>
										)}
										<div
											className="size-[72px] rounded-full border-[2.5px] border-[#4BA0FA] bg-[#040810] flex flex-col items-center justify-center gap-0.5"
											style={{
												boxShadow: stampLanded
													? "0 0 16px rgba(75,160,250,0.25)"
													: "none",
											}}
										>
											<Logo className="size-4 text-[#4BA0FA]" />
											<span className="text-[7px] font-bold tracking-[0.18em] text-[#4BA0FA] uppercase">
												Memorized
											</span>
										</div>
									</div>
								</motion.div>
							</div>

							<button
								type="button"
								id="onboarding-done-integrations"
								onClick={() => {
									analytics.onboardingIntegrationClicked({
										integration: "all_from_done",
									})
									void router.push("/?view=integrations")
								}}
								className="w-full rounded-xl border border-white/[0.1] bg-[#080E18] px-4 py-2.5 text-sm font-medium text-[#8B9DB5] hover:text-white hover:border-[#2261CA]/30 cursor-pointer transition-colors"
							>
								Browse Integrations
							</button>

							{/* Memory snippets */}
							<div className="w-full space-y-2">
								<p className="text-[11px] text-[#3A4A5E] uppercase tracking-widest mb-3">
									Nova learned
								</p>
								{memorySnippets.slice(0, 3).map((snippet, i) => (
									<motion.div
										key={i}
										initial={{ opacity: 0, x: -8 }}
										animate={
											visibleSnippets > i
												? { opacity: 1, x: 0 }
												: { opacity: 0, x: -8 }
										}
										transition={{ duration: 0.35, ease: "easeOut" }}
										className="flex items-start gap-2 text-left"
									>
										<span className="mt-0.5 size-1.5 rounded-full bg-[#4BA0FA] shrink-0" />
										<p className="text-[13px] text-[#8B9DB5] leading-snug line-clamp-2">
											{snippet}
										</p>
									</motion.div>
								))}
							</div>

							{/* CTAs */}
							<div className="flex flex-col items-center gap-3 w-full">
								<button
									type="button"
									onClick={() => router.push("/?view=list")}
									className="w-full rounded-xl px-5 py-2.5 text-sm font-medium text-white cursor-pointer hover:scale-[0.98] active:scale-[0.96] transition-transform border-[0.5px] border-[#2261CA]/40"
									style={{
										background:
											"linear-gradient(180deg, #0D1E3A -26.14%, #060C18 100%)",
									}}
								>
									See your memories →
								</button>
								<button
									type="button"
									onClick={() => router.push("/")}
									className="text-sm text-[#3A4A5E] hover:text-[#6B7A8D] transition-colors cursor-pointer"
								>
									Go to home
								</button>
							</div>
						</motion.div>
					)}

					{/* ── ERROR ── */}
					{status === "error" && (
						<motion.div
							key="error"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex flex-col items-center gap-6 text-center max-w-sm px-6"
						>
							<p className="text-[#8B9DB5] text-sm">{errorMsg}</p>
							<div className="flex gap-3">
								<button
									type="button"
									onClick={() => {
										setStatus("idle")
										setDocStatus("queued")
										setErrorMsg("")
									}}
									className="rounded-xl border border-[#1E2530] px-4 py-2.5 text-sm text-white hover:border-[#4A4A4A] transition-colors cursor-pointer"
								>
									Try again
								</button>
								<button
									type="button"
									onClick={handleSkip}
									className="rounded-xl px-4 py-2.5 text-sm font-medium text-white cursor-pointer border-[0.5px] border-[#161F2C]"
									style={{
										background:
											"linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
									}}
								>
									Skip for now
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	)
}
