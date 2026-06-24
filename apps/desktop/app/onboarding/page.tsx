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

const sourceCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const sourceIconStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

const novaCardClassName =
	"group relative flex min-h-[190px] flex-col overflow-hidden rounded-[18px] bg-[#1B1F24] p-5 transition-colors focus-within:ring-2 focus-within:ring-[#4BA0FA]/45"

const novaIconBoxClassName =
	"flex size-12 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#14161A]"

export default function DesktopOnboardingPage() {
	const router = useRouter()
	const [session, setSession] = useState<AuthSession | null>(null)
	const [authChecked, setAuthChecked] = useState(false)
	const [step, setStep] = useState<DesktopOnboardingStep>("welcome")
	const [connectedTools, setConnectedTools] = useState<DesktopToolId[]>([])
	const [filesystemMounted, setFilesystemMounted] = useState(false)

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
		<div className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-[#05080D] text-[#FAFAFA]">
			<NovaBackground />
			<header
				data-tauri-drag-region
				className="relative z-20 grid flex-none grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-6 pt-8 pb-4 md:px-10"
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

			<main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-10">
				<div className="mx-auto flex w-full max-w-6xl flex-col justify-start py-2 md:py-6">
					{step === "welcome" ? <WelcomeStep /> : null}
					{step === "tools" ? (
						<ToolsStep
							session={session}
							onConnectedToolsChange={setConnectedTools}
						/>
					) : null}
					{step === "filesystem" ? (
						<FilesystemStep
							onContinue={() => goToStep("done")}
							onMountedChange={setFilesystemMounted}
						/>
					) : null}
					{step === "done" ? (
						<DoneStep connectedCount={connectedTools.length} />
					) : null}
				</div>
			</main>
			<OnboardingFooter
				step={step}
				toolsConnected={connectedTools.length > 0}
				filesystemMounted={filesystemMounted}
				onBack={() => {
					if (step === "tools") goToStep("welcome")
					if (step === "filesystem") goToStep("tools")
					if (step === "done") goToStep("filesystem")
				}}
				onPrimary={() => {
					if (step === "welcome") goToStep("tools")
					if (step === "tools") goToStep("filesystem")
					if (step === "filesystem") goToStep("done")
					if (step === "done") complete()
				}}
				onSkip={skip}
			/>
		</div>
	)
}

function WelcomeStep() {
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
			</div>
		</section>
	)
}

function ToolsStep({
	session,
	onConnectedToolsChange,
}: {
	session: AuthSession
	onConnectedToolsChange: (tools: DesktopToolId[]) => void
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

			<div className="grid gap-3 min-[860px]:grid-cols-3">
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
		</section>
	)
}

function FilesystemStep({
	onContinue,
	onMountedChange,
}: {
	onContinue: () => void
	onMountedChange: (mounted: boolean) => void
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

	useEffect(() => {
		onMountedChange(mounted)
	}, [mounted, onMountedChange])

	return (
		<section className="mx-auto w-full max-w-4xl space-y-6">
			<StepHeader title="Mount your Supermemory filesystem" />
			<div className="grid gap-3 lg:grid-cols-2">
				<div
					className={cn(
						novaCardClassName,
						mounted && "ring-1 ring-[#2261CA33]",
					)}
					style={sourceCardStyle}
				>
					<CardInfoButton
						href="https://supermemory.ai/docs/smfs/overview"
						name="SMFS"
					/>
					<div className="flex items-start justify-between gap-3">
						<div className={novaIconBoxClassName} style={sourceIconStyle}>
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

				<div className={novaCardClassName} style={sourceCardStyle}>
					<CardInfoButton
						href="https://supermemory.ai/docs/smfs/mount"
						name="mount folder"
					/>
					<div className="flex items-start justify-between gap-3">
						<div className={novaIconBoxClassName} style={sourceIconStyle}>
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

function DoneStep({ connectedCount }: { connectedCount: number }) {
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
			style={sourceCardStyle}
		>
			<CardInfoButton href={tool.docsUrl} name={tool.name} />
			<div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-3 pr-8">
				<div className="pt-0.5">
					<div className={novaIconBoxClassName} style={sourceIconStyle}>
						<img
							src={tool.iconSrc}
							alt=""
							className="size-7 object-contain"
							draggable={false}
						/>
					</div>
				</div>
				<div className="min-w-0 pr-1">
					<div className="flex min-w-0 items-center gap-2">
						<p className="min-w-0 truncate font-semibold text-[#FAFAFA] text-[15px] leading-tight">
							{tool.name}
						</p>
						{tool.id !== "codex" ? <NovaInlineChip>Pro</NovaInlineChip> : null}
					</div>
					<p className="mt-1 line-clamp-2 font-medium text-[#737373] text-[12px] leading-[1.35]">
						{tool.tagline}
					</p>
				</div>
				{tool.connected ? (
					<div className="mt-1 inline-flex shrink-0 items-center gap-1 font-semibold text-[#4BA0FA] text-[11px] uppercase tracking-[0.08em]">
						<Check className="size-3" />
						<span className="hidden min-[1100px]:inline">Connected</span>
					</div>
				) : (
					<Button
						type="button"
						variant="insideOut"
						onClick={canPreview ? onPreview : undefined}
						disabled={busy}
						className="h-9 shrink-0 rounded-full px-4 font-medium text-[#FAFAFA] text-[13px]"
					>
						{busy
							? "Opening..."
							: tool.primaryAction === "connect"
								? "Connect"
								: "Set up"}
					</Button>
				)}
			</div>

			<ul className="mt-4 space-y-1.5">
				{tool.perks.map((perk) => (
					<li
						key={perk}
						className="flex items-start gap-2.5 font-medium text-[#737373] text-[12px] leading-[1.5]"
					>
						<span
							aria-hidden
							className="mt-[7px] size-1 shrink-0 rounded-full bg-[#525D6E]"
						/>
						<span>{perk}</span>
					</li>
				))}
			</ul>

			<div className="mt-auto flex items-end justify-between gap-3 pt-4">
				<div className="min-w-0">
					<ToolCardStatus tool={tool} />
					<p
						className="mt-1 truncate font-mono font-medium text-[#525D6E] text-[11px]"
						title={tool.configPath}
					>
						{tool.configPath}
					</p>
				</div>
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
			<div className="flex min-w-0 items-center gap-2 font-medium text-[#4AC463] text-[12px]">
				<span className="size-2 shrink-0 rounded-full bg-[#4AC463]" />
				<span>Active</span>
			</div>
		)
	}

	return (
		<div className="flex min-w-0 items-center gap-2 font-medium text-[#737373] text-[12px]">
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

function OnboardingFooter({
	step,
	toolsConnected,
	filesystemMounted,
	onBack,
	onPrimary,
	onSkip,
}: {
	step: DesktopOnboardingStep
	toolsConnected: boolean
	filesystemMounted: boolean
	onBack: () => void
	onPrimary: () => void
	onSkip: () => void
}) {
	const isWelcome = step === "welcome"
	const primaryLabel =
		step === "welcome"
			? "Start setup"
			: step === "tools"
				? toolsConnected
					? "Continue"
					: "Skip tools"
				: step === "filesystem"
					? filesystemMounted
						? "Continue"
						: "Skip for now"
					: "Open Supermemory"

	return (
		<footer className="relative z-20 flex-none bg-[#05080D]/92 px-4 pt-3 pb-4 shadow-[0_-18px_42px_rgba(5,8,13,0.72)] backdrop-blur-xl md:px-10">
			<div className="mx-auto flex w-full max-w-6xl justify-between gap-3">
				<button
					type="button"
					onClick={isWelcome ? onSkip : onBack}
					className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-4 text-[#A1A1AA] text-sm transition-colors hover:bg-white/[0.05] hover:text-white"
				>
					{isWelcome ? null : <ChevronLeft className="size-4" />}
					{isWelcome ? "Skip for now" : "Back"}
				</button>
				<button
					type="button"
					onClick={onPrimary}
					className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-[#05080D] text-sm"
				>
					{primaryLabel}
					<ArrowRight className="size-4" />
				</button>
			</div>
		</footer>
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
		<>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 80% 60% at 50% 40%, rgba(75,160,250,0.08) 0%, rgba(34,97,202,0.04) 35%, transparent 70%)",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
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
		</>
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
