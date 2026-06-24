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
	Loader2,
	RefreshCcw,
	X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Titlebar } from "@/components/titlebar"
import { getSession, type AuthSession } from "@/lib/auth"
import {
	completeDesktopOnboarding,
	getDesktopOnboardingStatus,
	skipDesktopOnboarding,
	type DesktopOnboardingStep,
	updateDesktopOnboardingStatus,
} from "@/lib/onboarding"
import {
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

const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

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
				const status = getDesktopOnboardingStatus()
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

	const goToStep = useCallback((nextStep: DesktopOnboardingStep) => {
		setStep(nextStep)
		updateDesktopOnboardingStatus({ lastStep: nextStep })
	}, [])

	const complete = useCallback(
		(nextConnectedTools = connectedTools) => {
			completeDesktopOnboarding(nextConnectedTools)
			router.replace("/")
		},
		[connectedTools, router],
	)

	const skip = useCallback(() => {
		skipDesktopOnboarding(step)
		router.replace("/")
	}, [router, step])

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
			<Titlebar title="Supermemory setup" />
			<div className="relative min-h-0 flex-1 overflow-auto">
				<NovaBackground />
				<header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-4 md:px-10">
					<LogoFull className="h-5 justify-self-start text-[#FAFAFA] md:h-6" />
					<StepIndicator step={step} />
					<button
						type="button"
						onClick={skip}
						className="justify-self-end rounded-full px-3 py-1.5 text-[#737373] text-xs transition-colors hover:bg-white/[0.05] hover:text-[#FAFAFA]"
					>
						Skip
					</button>
				</header>

				<main className="relative z-10 mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl items-center px-4 py-8 md:px-10">
					{step === "welcome" ? (
						<WelcomeStep
							session={session}
							onContinue={() => goToStep("tools")}
							onSkip={skip}
						/>
					) : null}
					{step === "tools" ? (
						<ToolsStep
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
	session,
	onContinue,
	onSkip,
}: {
	session: AuthSession
	onContinue: () => void
	onSkip: () => void
}) {
	return (
		<section className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[minmax(0,1fr)_360px] md:items-center">
			<div className="space-y-5">
				<p className="inline-flex items-center gap-2 rounded-full border border-[#2261CA33] bg-[#00173C]/80 px-3 py-1 font-medium text-[#8BC6FF] text-[11px]">
					<CheckCircle2 className="size-3.5" />
					Authenticated
				</p>
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
			<div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
				<p className="font-medium text-sm text-white">Signed in as</p>
				<p className="mt-1 truncate text-[#A1A1AA] text-sm">
					{session.email ?? session.userId}
				</p>
				<div className="mt-5 grid gap-3">
					<SetupBenefit label="Detect Claude Code, Codex, and Cursor" />
					<SetupBenefit label="Preview every config change before writing" />
					<SetupBenefit label="Create backups before touching local files" />
					<SetupBenefit label="Mount your Supermemory filesystem folder" />
				</div>
			</div>
		</section>
	)
}

function ToolsStep({
	connectedTools,
	onConnectedToolsChange,
	onBack,
	onContinue,
}: {
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
			updateDesktopOnboardingStatus({ connectedTools: nextConnected })
		} catch (err) {
			setError(formatUnknownError(err, "Could not scan local tools"))
		} finally {
			setLoading(false)
		}
	}, [onConnectedToolsChange])

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
				eyebrow="Local tools"
				title="Connect your AI tools"
				description="Supermemory scans this Mac and connects the clients you use. Nothing is written until you approve the diff."
				meta={`${detectedCount} detected · ${connectedCount} connected`}
				action={
					<button
						type="button"
						onClick={refreshTools}
						disabled={loading || busyTool !== null}
						className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-3 text-[#A1A1AA] text-sm transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
					>
						<RefreshCcw className={cn("size-4", loading && "animate-spin")} />
						Rescan
					</button>
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
			setStatus(statuses[0] ?? null)
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
			setStatus(await mountSmfs(tag))
		} catch (err) {
			setError(formatUnknownError(err, "Could not mount memory folder"))
		} finally {
			setBusy(false)
		}
	}

	const mounted = status?.state === "mounted" || status?.state === "external"

	return (
		<section className="mx-auto w-full max-w-4xl space-y-6">
			<StepHeader
				eyebrow="Memory folder"
				title="Mount your Supermemory filesystem"
				description="SMFS turns a Supermemory space into a local folder, so your context is visible to editors and command-line tools."
				meta={status ? formatSmfsState(status.state) : "Not mounted"}
			/>
			<div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
				<div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/70 p-5">
					<div className="flex items-center gap-3">
						<span className="flex size-10 items-center justify-center rounded-xl bg-[#00173C] text-[#8BC6FF] ring-1 ring-[#2261CA33]">
							<FolderOpen className="size-5" />
						</span>
						<div className="min-w-0">
							<p className="font-medium text-white">Filesystem space</p>
							<p className="truncate font-mono text-[#A1A1AA] text-xs">
								{status?.tag ?? tag}
							</p>
						</div>
					</div>
					<div className="mt-5 grid gap-3 text-sm">
						<InfoRow label="State" value={formatSmfsState(status?.state)} />
						<InfoRow label="Mount path" value={status?.mountPath || "..."} />
						<InfoRow label="Binary" value={status?.binaryPath || "..."} />
					</div>
					{error ? <p className="mt-4 text-red-300 text-sm">{error}</p> : null}
				</div>
				<div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/70 p-5">
					<p className="font-medium text-sm text-white">Recommended</p>
					<p className="mt-2 text-[#A1A1AA] text-sm leading-6">
						Mount now if you want a local memory folder. You can also do this
						later from Settings.
					</p>
					<button
						type="button"
						onClick={mounted ? onContinue : mount}
						disabled={loading || busy}
						className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-[#05080D] text-sm disabled:opacity-60"
					>
						{busy || loading ? (
							<Loader2 className="size-4 animate-spin" />
						) : mounted ? (
							<Check className="size-4" />
						) : null}
						{mounted ? "Mounted" : "Mount folder"}
					</button>
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
	const Icon = tool.icon
	const canPreview = !busy && !tool.connected
	return (
		<div
			className={cn(
				"flex min-h-[190px] flex-col rounded-[18px] bg-[#1B1F24] p-5 transition-colors",
				tool.connected && "ring-1 ring-[#2261CA33]",
			)}
			style={modalCardStyle}
		>
			<div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-3">
				<div className="pt-0.5">
					<div
						className="flex size-12 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#14161A]"
						style={inputBevelStyle}
					>
						<Icon className="size-6 text-[#FAFAFA]" />
					</div>
				</div>
				<div className="min-w-0 pr-1">
					<p className="font-semibold text-[#FAFAFA] text-[15px] leading-tight">
						{tool.name}
					</p>
					<p className="mt-1 line-clamp-2 font-medium text-[#737373] text-[12px] leading-[1.35]">
						{tool.description}
					</p>
				</div>
				{tool.connected ? (
					<span className="mt-1 inline-flex shrink-0 items-center gap-1 font-semibold text-[#4BA0FA] text-[11px] uppercase tracking-[0.08em]">
						<Check className="size-3" />
						Connected
					</span>
				) : (
					<Button
						type="button"
						variant="insideOut"
						onClick={canPreview ? onPreview : undefined}
						disabled={busy}
						className="h-9 shrink-0 gap-1.5 rounded-full px-4 font-medium text-[#FAFAFA] text-[13px]"
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
					<p
						className="truncate font-mono font-medium text-[#737373] text-[11px]"
						title={tool.configPath}
					>
						{tool.configPath}
					</p>
					<p className="mt-1 font-medium text-[#525D6E] text-[11px]">
						{tool.detected
							? tool.version
								? `Detected ${tool.version}`
								: "Detected on this Mac"
							: "Not detected yet"}
					</p>
				</div>
				<SaveTargetChip label="Supermemory MCP" />
			</div>
		</div>
	)
}

function SaveTargetChip({ label }: { label: string }) {
	return (
		<div
			className="inline-flex shrink-0 items-center gap-1.5 font-medium text-[#737373] text-[11px]"
			title={`This tool will connect to ${label}.`}
		>
			<span className="text-[#525D6E] text-[10px] uppercase tracking-[0.08em]">
				Uses
			</span>
			<FolderOpen className="size-3 text-[#737373]" />
			<span className="text-[#FAFAFA]">{label}</span>
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
	eyebrow: string
	title: string
	description: string
	meta?: string
	action?: ReactNode
}) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				<p className="font-medium text-[#8BC6FF] text-[11px] uppercase tracking-[0.14em]">
					{eyebrow}
				</p>
				<h1 className="mt-2 text-balance font-medium text-3xl tracking-tight md:text-4xl">
					{title}
				</h1>
				<p className="mt-2 max-w-2xl text-[#A1A1AA] text-sm leading-6">
					{description}
				</p>
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

function SetupBenefit({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-2 text-[#C8D0DA] text-sm">
			<Check className="size-4 text-[#8BC6FF]" />
			{label}
		</div>
	)
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<p className="text-[#737373] text-[11px] uppercase tracking-[0.08em]">
				{label}
			</p>
			<p className="mt-0.5 truncate text-[#C8D0DA] text-xs" title={value}>
				{value}
			</p>
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

function formatSmfsState(state?: SmfsStatus["state"]) {
	switch (state) {
		case "degraded":
			return "Mounted with warnings"
		case "external":
			return "External mount"
		case "error":
			return "Error"
		case "missing-binary":
			return "Missing binary"
		case "mounted":
			return "Mounted"
		case "unmounted":
			return "Unmounted"
		default:
			return "Loading"
	}
}

function formatUnknownError(error: unknown, fallback: string) {
	return error instanceof Error
		? error.message
		: typeof error === "string"
			? error
			: fallback
}
