"use client"

import { LogoFull } from "@ui/assets/Logo"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import {
	ArrowRight,
	Check,
	CheckCircle2,
	ChevronLeft,
	FolderOpen,
	Info,
	Loader2,
	Plus,
	X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { getSession, type AuthSession } from "@/lib/auth"
import {
	completeDesktopOnboarding,
	getDesktopOnboardingStatus,
	skipDesktopOnboarding,
	type DesktopOnboardingStep,
	updateDesktopOnboardingStatus,
} from "@/lib/onboarding"
import {
	chooseSmfsMountPath,
	getDefaultSmfsContainerTag,
	getSmfsState,
	mountSmfs,
	type SmfsStatus,
} from "@/lib/smfs"
import {
	sortDesktopToolCards,
	toDesktopToolCard,
	type DesktopToolCard,
} from "@/lib/tool-catalog"
import {
	connectDesktopTool,
	detectDesktopTools,
	type DesktopToolId,
	type DesktopToolPreview,
	previewConnectDesktopTool,
} from "@/lib/tools"

const STEPS: DesktopOnboardingStep[] = [
	"welcome",
	"tools",
	"filesystem",
	"done",
]

const STEP_LABELS: Record<DesktopOnboardingStep, string> = {
	welcome: "Welcome",
	tools: "Tools",
	filesystem: "Files",
	done: "Done",
}

const novaCardClassName =
	"group relative flex min-h-[190px] flex-col overflow-hidden rounded-[12px] bg-[#14161A] p-5 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] transition-colors hover:bg-[#16181D] focus-within:ring-2 focus-within:ring-[#4BA0FA]/45"

const novaIconBoxClassName =
	"flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]"

export default function DesktopOnboardingPage() {
	const router = useRouter()
	const [session, setSession] = useState<AuthSession | null>(null)
	const [authChecked, setAuthChecked] = useState(false)
	const [step, setStep] = useState<DesktopOnboardingStep>("welcome")
	const [connectedTools, setConnectedTools] = useState<DesktopToolId[]>([])

	useEffect(() => {
		let cancelled = false
		getSession()
			.then((nextSession) => {
				if (cancelled) return
				const status = getDesktopOnboardingStatus(nextSession)
				setSession(nextSession)
				setStep(status.lastStep === "done" ? "welcome" : status.lastStep)
				setConnectedTools(status.connectedTools)
				setAuthChecked(true)
			})
			.catch(() => {
				if (cancelled) return
				router.replace("/login")
			})
		return () => {
			cancelled = true
		}
	}, [router])

	const goToStep = useCallback(
		(nextStep: DesktopOnboardingStep) => {
			setStep(nextStep)
			updateDesktopOnboardingStatus({ lastStep: nextStep }, session)
		},
		[session],
	)

	const complete = useCallback(
		(nextConnectedTools = connectedTools) => {
			completeDesktopOnboarding(nextConnectedTools, session)
			router.replace("/")
		},
		[connectedTools, router, session],
	)

	const skip = useCallback(() => {
		skipDesktopOnboarding(step, session)
		router.replace("/")
	}, [router, session, step])

	if (!authChecked || !session) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#05080D] text-[#737B86] text-sm">
				<Loader2 className="mr-2 size-4 animate-spin" />
				Loading onboarding...
			</div>
		)
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-[#05080D] text-[#FAFAFA]">
			<div className="relative min-h-0 flex-1 overflow-auto">
				<NovaBackground />
				<header
					data-tauri-drag-region
					className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-6 pt-8 pb-4 md:px-10"
				>
					<LogoFull className="h-5 justify-self-start text-[#FAFAFA] md:h-6" />
					<div className="justify-self-center">
						<StepIndicator step={step} />
					</div>
					<button
						type="button"
						onClick={skip}
						className="justify-self-end rounded-full px-3 py-1.5 text-[#737373] text-xs transition-colors hover:bg-white/[0.05] hover:text-[#FAFAFA]"
					>
						Skip
					</button>
				</header>

				<main className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center px-4 py-8 md:px-10">
					{step === "welcome" ? (
						<WelcomeStep onContinue={() => goToStep("tools")} onSkip={skip} />
					) : null}
					{step === "tools" ? (
						<ToolsStep
							session={session}
							connectedTools={connectedTools}
							onConnectedToolsChange={setConnectedTools}
							onBack={() => goToStep("welcome")}
							onContinue={() => goToStep("filesystem")}
						/>
					) : null}
					{step === "filesystem" ? (
						<FilesystemStep
							onBack={() => goToStep("tools")}
							onContinue={() => goToStep("done")}
						/>
					) : null}
					{step === "done" ? (
						<DoneStep
							connectedCount={connectedTools.length}
							onBack={() => goToStep("filesystem")}
							onFinish={() => complete()}
						/>
					) : null}
				</main>
			</div>
		</div>
	)
}

function WelcomeStep({
	onContinue,
	onSkip,
}: {
	onContinue: () => void
	onSkip: () => void
}) {
	return (
		<section className="w-full max-w-3xl">
			<div className="space-y-5">
				<div className="space-y-3">
					<h1 className="max-w-3xl text-balance font-medium text-4xl leading-tight tracking-tight md:text-5xl">
						Set up Supermemory on this Mac.
					</h1>
					<p className="max-w-2xl text-[#A1A1AA] text-sm leading-6 md:text-base">
						Connect local AI tools, mount your memory folder, and make Nova
						available everywhere you work.
					</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<button
						type="button"
						onClick={onContinue}
						className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-[#05080D] text-sm transition-transform hover:scale-[1.01]"
					>
						Start setup
						<ArrowRight className="size-4" />
					</button>
					<button
						type="button"
						onClick={onSkip}
						className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.08] px-4 text-[#A1A1AA] text-sm transition-colors hover:bg-white/[0.05] hover:text-white"
					>
						Skip for now
					</button>
				</div>
			</div>
		</section>
	)
}

function ToolsStep({
	session,
	connectedTools,
	onConnectedToolsChange,
	onBack,
	onContinue,
}: {
	session: AuthSession
	connectedTools: DesktopToolId[]
	onConnectedToolsChange: (tools: DesktopToolId[]) => void
	onBack: () => void
	onContinue: () => void
}) {
	const [tools, setTools] = useState<DesktopToolCard[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [busyTool, setBusyTool] = useState<DesktopToolId | null>(null)
	const [preview, setPreview] = useState<DesktopToolPreview | null>(null)

	const detectedCount = tools.filter((tool) => tool.detected).length
	const connectedCount = tools.filter((tool) => tool.connected).length

	const refreshTools = useCallback(async () => {
		setError(null)
		setLoading(true)
		try {
			const statuses = await detectDesktopTools()
			const cards = sortDesktopToolCards(statuses.map(toDesktopToolCard))
			setTools(cards)
			const nextConnected = cards
				.filter((tool) => tool.connected)
				.map((tool) => tool.id)
			onConnectedToolsChange(nextConnected)
			updateDesktopOnboardingStatus({ connectedTools: nextConnected }, session)
		} catch (err) {
			setError(formatUnknownError(err, "Could not scan local tools"))
		} finally {
			setLoading(false)
		}
	}, [onConnectedToolsChange, session])

	useEffect(() => {
		refreshTools()
	}, [refreshTools])

	async function previewTool(toolId: DesktopToolId) {
		setError(null)
		setBusyTool(toolId)
		try {
			setPreview(await previewConnectDesktopTool(toolId))
		} catch (err) {
			setError(formatUnknownError(err, "Could not preview setup"))
		} finally {
			setBusyTool(null)
		}
	}

	async function applyPreview() {
		if (!preview) return
		setError(null)
		setBusyTool(preview.tool.id)
		try {
			await connectDesktopTool(preview.tool.id)
			setPreview(null)
			await refreshTools()
		} catch (err) {
			setError(formatUnknownError(err, "Could not connect tool"))
		} finally {
			setBusyTool(null)
		}
	}

	return (
		<section className="mx-auto w-full max-w-6xl space-y-6">
			<StepHeader
				title="Connect your AI tools"
				meta={
					loading
						? "Scanning tools..."
						: `${detectedCount} detected · ${connectedCount} connected`
				}
			/>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{tools.map((tool) => (
					<ToolCard
						key={tool.id}
						tool={tool}
						busy={busyTool === tool.id}
						onPreview={() => previewTool(tool.id)}
					/>
				))}
			</div>

			{error ? <p className="text-red-300 text-sm">{error}</p> : null}

			{preview ? (
				<DiffPreview
					preview={preview}
					busy={busyTool !== null}
					onCancel={() => setPreview(null)}
					onApply={applyPreview}
				/>
			) : null}

			<StepActions
				onBack={onBack}
				onContinue={onContinue}
				continueLabel={connectedTools.length > 0 ? "Continue" : "Skip tools"}
			/>
		</section>
	)
}

function FilesystemStep({
	onBack,
	onContinue,
}: {
	onBack: () => void
	onContinue: () => void
}) {
	const [tag, setTag] = useState("sm_fs_desktop")
	const [status, setStatus] = useState<SmfsStatus | null>(null)
	const [selectedMountPath, setSelectedMountPath] = useState<string | null>(
		null,
	)
	const [loading, setLoading] = useState(true)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const refresh = useCallback(async () => {
		setError(null)
		setLoading(true)
		try {
			const [defaultTag, statuses] = await Promise.all([
				getDefaultSmfsContainerTag(),
				getSmfsState(),
			])
			setTag(defaultTag)
			const nextStatus = statuses[0] ?? null
			setStatus(nextStatus)
			if (
				nextStatus?.mountPath &&
				(nextStatus.mountPathConfigured ||
					nextStatus.state === "mounted" ||
					nextStatus.state === "external")
			) {
				setSelectedMountPath(nextStatus.mountPath)
			}
		} catch (err) {
			setError(formatUnknownError(err, "Could not load filesystem status"))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		refresh()
	}, [refresh])

	async function mount() {
		setError(null)
		setBusy(true)
		try {
			if (!selectedMountPath) {
				throw new Error("Choose a folder before mounting SMFS")
			}
			const nextStatus = await mountSmfs(tag, selectedMountPath)
			setStatus(nextStatus)
			setSelectedMountPath(nextStatus.mountPath)
		} catch (err) {
			setError(formatUnknownError(err, "Could not mount memory folder"))
		} finally {
			setBusy(false)
		}
	}

	async function chooseFolder() {
		setError(null)
		setBusy(true)
		try {
			const path = await chooseSmfsMountPath()
			if (path) {
				setSelectedMountPath(path)
			}
		} catch (err) {
			setError(formatUnknownError(err, "Could not choose mount folder"))
		} finally {
			setBusy(false)
		}
	}

	const mounted = status?.state === "mounted" || status?.state === "external"
	const mountPath =
		selectedMountPath ?? (status?.mountPathConfigured ? status.mountPath : null)
	const canMount = Boolean(mountPath) && !loading && !busy

	return (
		<section className="mx-auto w-full max-w-4xl space-y-6">
			<StepHeader title="Mount your Supermemory filesystem" />
			<div className="grid gap-3 md:grid-cols-2">
				<div
					className={cn(
						novaCardClassName,
						mounted && "ring-1 ring-[#2261CA33]",
					)}
				>
					<CardInfoButton
						href="https://supermemory.ai/docs/smfs/overview"
						name="SMFS"
					/>
					<div className="flex items-start justify-between gap-3">
						<div className={novaIconBoxClassName}>
							<FolderOpen className="size-6 text-[#8BC6FF]" />
						</div>
					</div>

					<div className="mt-8 min-w-0">
						<p className="font-semibold text-[#FAFAFA] text-[20px] leading-tight">
							Filesystem space
						</p>
						<p className="mt-2 line-clamp-2 font-medium text-[#A1A1AA] text-[14px] leading-[1.45]">
							Local Supermemory folder for editors and command-line tools
						</p>
					</div>

					<div className="mt-auto flex items-center justify-between gap-4 pt-8">
						<FilesystemStatus mounted={mounted} loading={loading} />
						<p
							className="truncate font-mono font-medium text-[#737373] text-[13px]"
							title={mountPath ?? undefined}
						>
							{mountPath ? compactPath(mountPath) : "No folder selected"}
						</p>
					</div>
					{error ? <p className="mt-4 text-red-300 text-sm">{error}</p> : null}
				</div>

				<div className={novaCardClassName}>
					<CardInfoButton
						href="https://supermemory.ai/docs/smfs/mount"
						name="mount folder"
					/>
					<div className="flex items-start justify-between gap-3">
						<div className={novaIconBoxClassName}>
							<Check className="size-6 text-[#FAFAFA]" />
						</div>
					</div>

					<div className="mt-8 min-w-0">
						<div className="flex min-w-0 items-center gap-2">
							<p className="min-w-0 truncate font-semibold text-[#FAFAFA] text-[20px] leading-tight">
								Mount folder
							</p>
							<NovaInlineChip>Recommended</NovaInlineChip>
						</div>
						<p className="mt-2 line-clamp-2 font-medium text-[#A1A1AA] text-[14px] leading-[1.45]">
							Choose or create the local folder SMFS should mount into
						</p>
					</div>

					<Button
						type="button"
						variant="insideOut"
						onClick={chooseFolder}
						disabled={loading || busy || mounted}
						className="mt-auto h-10 w-full rounded-full font-medium text-[#FAFAFA] text-[15px]"
					>
						{mountPath ? "Change folder" : "Choose folder"}
					</Button>
					<Button
						type="button"
						variant="insideOut"
						onClick={mounted ? onContinue : mount}
						disabled={!mounted && !canMount}
						className="mt-3 h-10 w-full rounded-full font-medium text-[#FAFAFA] text-[15px]"
					>
						{busy || loading ? (
							<Loader2 className="size-4 animate-spin" />
						) : mounted ? (
							<Check className="size-4" />
						) : null}
						{mounted ? "Mounted" : "Mount folder"}
					</Button>
				</div>
			</div>
			<StepActions
				onBack={onBack}
				onContinue={onContinue}
				continueLabel={mounted ? "Continue" : "Skip for now"}
			/>
		</section>
	)
}

function FilesystemStatus({
	mounted,
	loading,
}: {
	mounted: boolean
	loading: boolean
}) {
	if (loading) {
		return (
			<div className="flex min-w-0 items-center gap-2 font-medium text-[#737373] text-[14px]">
				<Loader2 className="size-3.5 shrink-0 animate-spin" />
				<span>Checking</span>
			</div>
		)
	}

	if (mounted) {
		return (
			<div className="flex min-w-0 items-center gap-2 font-medium text-[#4AC463] text-[14px]">
				<span className="size-2 shrink-0 rounded-full bg-[#4AC463]" />
				<span>Mounted</span>
			</div>
		)
	}

	return (
		<div className="flex min-w-0 items-center gap-2 font-medium text-[#737373] text-[14px]">
			<span className="size-2 shrink-0 rounded-full bg-[#525D6E]" />
			<span>Unmounted</span>
		</div>
	)
}

function DoneStep({
	connectedCount,
	onBack,
	onFinish,
}: {
	connectedCount: number
	onBack: () => void
	onFinish: () => void
}) {
	return (
		<section className="mx-auto w-full max-w-3xl text-center">
			<div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#00173C] text-[#8BC6FF] ring-1 ring-[#2261CA33]">
				<CheckCircle2 className="size-7" />
			</div>
			<h1 className="mt-6 text-balance font-medium text-4xl tracking-tight">
				Desktop setup is ready.
			</h1>
			<p className="mx-auto mt-3 max-w-xl text-[#A1A1AA] text-sm leading-6">
				{connectedCount > 0
					? `${connectedCount} tool${connectedCount === 1 ? "" : "s"} connected. You can add more from Settings anytime.`
					: "No tools connected yet. You can come back from Settings whenever you are ready."}
			</p>
			<div className="mt-8 flex justify-center gap-3">
				<button
					type="button"
					onClick={onBack}
					className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-4 text-[#A1A1AA] text-sm transition-colors hover:bg-white/[0.05] hover:text-white"
				>
					<ChevronLeft className="size-4" />
					Back
				</button>
				<button
					type="button"
					onClick={onFinish}
					className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-[#05080D] text-sm"
				>
					Open Supermemory
					<ArrowRight className="size-4" />
				</button>
			</div>
		</section>
	)
}

function ToolCard({
	tool,
	busy,
	onPreview,
}: {
	tool: DesktopToolCard
	busy: boolean
	onPreview: () => void
}) {
	const canPreview = !busy && !tool.connected
	return (
		<div
			className={cn(
				novaCardClassName,
				tool.connected && "ring-1 ring-[#2261CA33]",
			)}
		>
			<CardInfoButton href={tool.docsUrl} name={tool.name} />
			<div className="flex items-start justify-between gap-3">
				<div className={novaIconBoxClassName}>
					<img
						src={tool.iconSrc}
						alt=""
						className="size-7 object-contain"
						draggable={false}
					/>
				</div>
			</div>

			<div className="mt-8 min-w-0">
				<div className="flex min-w-0 items-center gap-2">
					<p className="min-w-0 truncate font-semibold text-[#FAFAFA] text-[20px] leading-tight">
						{tool.name}
					</p>
					{tool.id !== "codex" ? <NovaInlineChip>Pro</NovaInlineChip> : null}
				</div>
				<p className="mt-2 line-clamp-2 font-medium text-[#A1A1AA] text-[14px] leading-[1.45]">
					{tool.tagline}
				</p>
			</div>

			<div className="mt-auto flex items-center justify-between gap-4 pt-8">
				<ToolCardStatus tool={tool} />
				<Button
					type="button"
					variant="insideOut"
					onClick={canPreview ? onPreview : undefined}
					disabled={busy || tool.connected}
					className={cn(
						"h-10 min-w-[132px] shrink-0 rounded-full px-5 font-medium text-[#FAFAFA] text-[15px]",
						tool.connected && "text-[#A1A1AA]",
					)}
				>
					{tool.connected ? (
						<Plus className="size-5" />
					) : busy ? (
						"Opening..."
					) : tool.primaryAction === "connect" ? (
						"Connect"
					) : (
						"Set up"
					)}
				</Button>
			</div>
		</div>
	)
}

function CardInfoButton({ href, name }: { href?: string; name: string }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			aria-label={`View ${name} docs`}
			title={`${name} docs`}
			onClick={(event) => {
				event.stopPropagation()
			}}
			className="absolute top-4 right-4 z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0D121A] text-[#A1A1AA] opacity-0 shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-all hover:text-[#FAFAFA] focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
		>
			<Info className="size-3.5" />
		</a>
	)
}

function NovaInlineChip({ children }: { children: ReactNode }) {
	return (
		<span className="shrink-0 font-semibold text-[#4BA0FA] text-[10px] uppercase tracking-wide">
			{children}
		</span>
	)
}

function ToolCardStatus({ tool }: { tool: DesktopToolCard }) {
	if (tool.connected) {
		return (
			<div className="flex min-w-0 items-center gap-2 font-medium text-[#4AC463] text-[14px]">
				<span className="size-2 shrink-0 rounded-full bg-[#4AC463]" />
				<span>Active</span>
			</div>
		)
	}

	return (
		<div className="flex min-w-0 items-center gap-2 font-medium text-[#737373] text-[14px]">
			<span className="size-2 shrink-0 rounded-full bg-[#525D6E]" />
			<span>{tool.detected ? "Detected" : "Not detected"}</span>
		</div>
	)
}

function DiffPreview({
	preview,
	busy,
	onCancel,
	onApply,
}: {
	preview: DesktopToolPreview
	busy: boolean
	onCancel: () => void
	onApply: () => void
}) {
	return (
		<div className="rounded-2xl border border-[#2261CA33] bg-[#00173C]/42 p-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<p className="font-medium text-white">Review config change</p>
					<p
						className="mt-1 truncate font-mono text-[#A1A1AA] text-xs"
						title={preview.configPath}
					>
						{preview.configPath}
					</p>
					<p className="mt-1 text-[#737373] text-xs">
						Backup: {preview.backupPath ?? "created only if the file exists"}
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					<button
						type="button"
						onClick={onCancel}
						disabled={busy}
						className="inline-flex size-9 items-center justify-center rounded-xl border border-white/[0.08] text-[#A1A1AA] hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
						aria-label="Cancel"
					>
						<X className="size-4" />
					</button>
					<button
						type="button"
						onClick={onApply}
						disabled={busy}
						className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-[#05080D] text-sm disabled:opacity-60"
					>
						{busy ? <Loader2 className="size-4 animate-spin" /> : null}
						Apply
					</button>
				</div>
			</div>
			<pre className="mt-4 max-h-64 overflow-auto rounded-xl border border-white/[0.06] bg-black/25 p-3 whitespace-pre-wrap text-[#C8D0DA] text-xs">
				{preview.diff}
			</pre>
		</div>
	)
}

function StepHeader({
	eyebrow,
	title,
	description,
	meta,
	action,
}: {
	eyebrow?: string
	title: string
	description?: string
	meta?: string
	action?: ReactNode
}) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				{eyebrow ? (
					<p className="font-medium text-[#8BC6FF] text-[11px] uppercase tracking-[0.14em]">
						{eyebrow}
					</p>
				) : null}
				<h1
					className={cn(
						"text-balance font-medium text-3xl tracking-tight md:text-4xl",
						eyebrow && "mt-2",
					)}
				>
					{title}
				</h1>
				{description ? (
					<p className="mt-2 max-w-2xl text-[#A1A1AA] text-sm leading-6">
						{description}
					</p>
				) : null}
				{meta ? <p className="mt-2 text-[#737373] text-xs">{meta}</p> : null}
			</div>
			{action}
		</div>
	)
}

function StepActions({
	onBack,
	onContinue,
	continueLabel,
}: {
	onBack: () => void
	onContinue: () => void
	continueLabel: string
}) {
	return (
		<div className="flex justify-between gap-3">
			<button
				type="button"
				onClick={onBack}
				className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-4 text-[#A1A1AA] text-sm transition-colors hover:bg-white/[0.05] hover:text-white"
			>
				<ChevronLeft className="size-4" />
				Back
			</button>
			<button
				type="button"
				onClick={onContinue}
				className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-[#05080D] text-sm"
			>
				{continueLabel}
				<ArrowRight className="size-4" />
			</button>
		</div>
	)
}

function StepIndicator({ step }: { step: DesktopOnboardingStep }) {
	const currentIdx = STEPS.indexOf(step)
	return (
		<div className="hidden items-start sm:flex">
			{STEPS.map((item, index) => {
				const isDone = index < currentIdx
				const isCurrent = index === currentIdx
				const isLast = index === STEPS.length - 1
				return (
					<div key={item} className="flex items-start">
						<div className="flex min-w-[64px] flex-col items-center gap-1.5">
							<span
								className={cn(
									"flex size-3 items-center justify-center rounded-full",
									isCurrent
										? "border-2 border-[#4BA0FA]"
										: isDone
											? "bg-[#4BA0FA]"
											: "border border-[#2E353D]",
								)}
							>
								{isCurrent ? (
									<span className="size-1.5 rounded-full bg-[#4BA0FA]" />
								) : null}
							</span>
							<span
								className={cn(
									"font-medium text-[11px] leading-none",
									isCurrent
										? "text-[#FAFAFA]"
										: isDone
											? "text-[#737373]"
											: "text-[#525D6E]",
								)}
							>
								{STEP_LABELS[item]}
							</span>
						</div>
						{!isLast ? (
							<span
								className={cn(
									"mt-[5px] h-px min-w-7",
									isDone ? "bg-[#4BA0FA]/60" : "bg-[#2E353D]",
								)}
							/>
						) : null}
					</div>
				)
			})}
		</div>
	)
}

function NovaBackground() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			<div
				className="absolute inset-0"
				style={{
					backgroundImage: "url('/onboarding/bg-gradient-0.png')",
					backgroundPosition: "center 20%",
					backgroundRepeat: "no-repeat",
					backgroundSize: "150% auto",
				}}
			/>
			<div
				className="absolute inset-0"
				style={{
					backgroundImage: "url('/onboarding/bg-gradient-1.png')",
					backgroundPosition: "center 20%",
					backgroundRepeat: "no-repeat",
					backgroundSize: "150% auto",
					opacity: 0.8,
				}}
			/>
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					backgroundImage: "url('/bg-rectangle.png')",
					backgroundPosition: "bottom",
					backgroundRepeat: "no-repeat",
					backgroundSize: "cover",
					mixBlendMode: "soft-light",
					opacity: 0.4,
				}}
			/>
			<div className="absolute inset-0 bg-[#05080D]/55" />
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					backgroundImage:
						"radial-gradient(circle at center, rgba(105,167,240,0.22) 1px, transparent 1px)",
					backgroundSize: "32px 32px",
					maskImage:
						"radial-gradient(ellipse at center, black 55%, transparent 100%)",
					WebkitMaskImage:
						"radial-gradient(ellipse at center, black 55%, transparent 100%)",
				}}
			/>
		</div>
	)
}

function compactPath(path: string) {
	if (path.startsWith("/Users/")) {
		const parts = path.split("/")
		if (parts.length > 3) {
			return `~/${parts.slice(3).join("/")}`
		}
	}
	return path
}

function formatUnknownError(error: unknown, fallback: string) {
	return error instanceof Error
		? error.message
		: typeof error === "string"
			? error
			: fallback
}
