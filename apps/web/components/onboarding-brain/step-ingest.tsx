"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@ui/components/button"
import {
	ArrowRight,
	Check,
	Copy,
	ExternalLink,
	Loader2,
	Plug,
} from "lucide-react"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { toast } from "sonner"
import { PLUGIN_CATALOG } from "@/lib/plugin-catalog"
import { analytics } from "@/lib/analytics"
import type { BrainMode } from "./types"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const TEST_PROMPT = "What do we know about [topic]?"

type FlowToolId = "slack" | "mcp" | "codex" | "claude-code"
type FlowToolKind = "slack" | "mcp" | "plugin"

type FlowTool = {
	id: FlowToolId
	label: string
	blurb: string
	kind: FlowToolKind
	pluginId?: string
	recommended?: boolean
}

const TOOL_OPTIONS: Record<BrainMode, [FlowTool, ...FlowTool[]]> = {
	team: [
		{
			id: "slack",
			label: "Slack",
			blurb: "Ask questions in-channel.",
			kind: "slack",
			recommended: true,
		},
		{
			id: "claude-code",
			label: "Claude Code",
			blurb: "Shared context in your terminal.",
			kind: "plugin",
			pluginId: "claude_code",
		},
		{
			id: "codex",
			label: "Codex",
			blurb: "OpenAI's coding agent.",
			kind: "plugin",
			pluginId: "codex",
		},
	],
	personal: [
		{
			id: "mcp",
			label: "MCP",
			blurb: "Use the universal URL in any client.",
			kind: "mcp",
			recommended: true,
		},
		{
			id: "codex",
			label: "Codex",
			blurb: "OpenAI's coding agent.",
			kind: "plugin",
			pluginId: "codex",
		},
		{
			id: "claude-code",
			label: "Claude Code",
			blurb: "Context in your terminal.",
			kind: "plugin",
			pluginId: "claude_code",
		},
	],
}

const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

interface Props {
	mode: BrainMode
	mcpUrl: string
	onContinue: () => void
}

export function StepIngest({ mode, mcpUrl, onContinue }: Props) {
	const tools = TOOL_OPTIONS[mode]
	const [selected, setSelected] = useState<FlowToolId>(tools[0].id)

	useEffect(() => {
		setSelected(tools[0].id)
	}, [tools])

	const activeTool = useMemo(
		() => tools.find((t) => t.id === selected) ?? tools[0],
		[tools, selected],
	)

	const handleContinue = () => {
		analytics.onboardingIngestCompleted()
		onContinue()
	}

	const handleSkip = () => {
		analytics.onboardingIngestSkipped()
		onContinue()
	}

	return (
		<div className="mx-auto w-full max-w-[900px] pb-10">
			<section className="relative py-4">
				<div className="mb-6 px-1">
					<p
						className={cn(
							"text-[22px] font-semibold text-[#fafafa]",
							dmSans125ClassName(),
						)}
					>
						Use your brain where you work
					</p>
					<p className="mt-1.5 text-[15px] font-medium leading-[1.4] text-[#737373]">
						{mode === "team"
							? "Pick where your team asks questions, then set it up."
							: "Pick the tool you open every day — about 60 seconds."}
					</p>
				</div>

				<div className="grid items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
					{/* Left rail: pick a tool */}
					<div className="flex flex-col gap-2">
						{tools.map((tool) => (
							<FlowToolRow
								key={tool.id}
								tool={tool}
								active={selected === tool.id}
								onSelect={() => {
									analytics.onboardingAgentSelected({ agent: tool.id })
									setSelected(tool.id)
								}}
							/>
						))}
						<Link
							href="/settings/integrations"
							className="mt-1 inline-flex items-center gap-1.5 px-2 py-1.5 text-[13px] font-medium text-[#737373] transition-colors hover:text-[#fafafa]"
						>
							More tools
							<span className="text-[#525D6E]">(full catalog)</span>
							<ExternalLink className="size-3.5" aria-hidden />
						</Link>
					</div>

					{/* Right pane: setup detail */}
					<div
						className="relative flex min-h-[300px] flex-col overflow-hidden rounded-[22px] bg-[#1B1F24] p-6 md:p-7"
						style={modalCardStyle}
					>
						<div
							aria-hidden
							className="absolute -top-px right-10 left-10 h-px"
							style={{
								background:
									"linear-gradient(to right, transparent, rgba(75,160,250,0.4), transparent)",
							}}
						/>

						<div className="flex flex-1 flex-col">
							<div className="mb-5 flex items-center gap-3">
								<div
									className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#14161A]"
									style={inputBevelStyle}
								>
									<ToolIcon id={activeTool.id} />
								</div>
								<div>
									<p className="text-[18px] font-semibold text-[#fafafa]">
										Set up {activeTool.label}
									</p>
									<p className="mt-0.5 text-[12px] font-medium text-[#737373]">
										{activeTool.blurb}
									</p>
								</div>
							</div>

							{activeTool.kind === "slack" ? (
								<SlackSetupPanel />
							) : activeTool.kind === "mcp" ? (
								<McpGenericSetup mcpUrl={mcpUrl} />
							) : activeTool.pluginId ? (
								<PluginSetup
									key={activeTool.pluginId}
									pluginId={activeTool.pluginId}
								/>
							) : null}
						</div>

						<div className="mt-6 flex items-center justify-end gap-[22px] border-t border-white/[0.06] pt-5">
							<button
								type="button"
								onClick={handleSkip}
								className="text-[14px] font-medium text-[#737373] transition-colors hover:text-[#999]"
							>
								Skip for now
							</button>
							<Button
								variant="insideOut"
								onClick={handleContinue}
								className="rounded-full px-5 py-[10px] text-[13px] font-medium text-[#fafafa]"
							>
								Continue
								<ArrowRight className="size-3.5" />
							</Button>
						</div>
					</div>
				</div>
			</section>
		</div>
	)
}

function ToolIcon({ id, className }: { id: FlowToolId; className?: string }) {
	if (id === "slack") return <SlackMark className={className ?? "size-5"} />
	if (id === "mcp")
		return <Plug className={cn("text-[#4BA0FA]", className ?? "size-5")} />
	const file = id === "claude-code" ? "claude" : id
	return (
		<Image
			src={`/mcp-supported-tools/${file}.png`}
			alt=""
			width={28}
			height={28}
			unoptimized
			className={cn("object-contain", className ?? "size-5")}
		/>
	)
}

function FlowToolRow({
	tool,
	active,
	onSelect,
}: {
	tool: FlowTool
	active: boolean
	onSelect: () => void
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={active}
			className={cn(
				"group relative flex w-full items-center gap-3 overflow-hidden rounded-[14px] p-3 text-left transition-all duration-150",
				active
					? "bg-[#10151D] ring-2 ring-[#4BA0FA]/45"
					: "bg-[#1B1F24] ring-1 ring-white/[0.05] hover:ring-white/[0.12]",
			)}
			style={modalCardStyle}
		>
			{active && (
				<div
					aria-hidden
					className="absolute -top-px right-5 left-5 h-px"
					style={{
						background:
							"linear-gradient(to right, transparent, rgba(75,160,250,0.55), transparent)",
					}}
				/>
			)}

			<div
				className={cn(
					"flex size-10 shrink-0 items-center justify-center rounded-[10px] border bg-[#14161A] transition-colors",
					active ? "border-[#2261CA]/45" : "border-[rgba(82,89,102,0.2)]",
				)}
				style={inputBevelStyle}
			>
				<ToolIcon id={tool.id} />
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<p className="text-[14px] font-semibold leading-tight text-[#fafafa]">
						{tool.label}
					</p>
					{tool.recommended && (
						<span className="shrink-0 rounded-full bg-[#4BA0FA]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#4BA0FA]">
							Recommended
						</span>
					)}
				</div>
				<p className="mt-0.5 truncate text-[12px] font-medium text-[#737373]">
					{tool.blurb}
				</p>
			</div>

			<span
				aria-hidden
				className={cn(
					"flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
					active
						? "border-[#4BA0FA] bg-[#4BA0FA]"
						: "border-[rgba(82,89,102,0.4)] group-hover:border-[rgba(115,115,115,0.5)]",
				)}
			>
				{active && <Check className="size-3 text-white" />}
			</span>
		</button>
	)
}

function StepRow({
	index,
	title,
	done,
	children,
}: {
	index: number
	title: ReactNode
	done?: boolean
	children?: ReactNode
}) {
	return (
		<div className="flex gap-3">
			<span
				aria-hidden
				className={cn(
					"mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
					done
						? "bg-[#4BA0FA] text-white"
						: "border border-[rgba(82,89,102,0.3)] bg-[#14161A] text-[#737373]",
				)}
			>
				{done ? <Check className="size-3" /> : index}
			</span>
			<div className="min-w-0 flex-1 pt-0.5">
				<div className="text-[13px] font-medium leading-[1.5] text-[#fafafa]">
					{title}
				</div>
				{children ? <div className="mt-2.5">{children}</div> : null}
			</div>
		</div>
	)
}

// Coding-agent plugins (Codex, Claude Code) auto-login via OAuth, so the
// "Save your API key" step is dropped — we render the remaining install steps.
function PluginSetup({ pluginId }: { pluginId: string }) {
	const plugin = PLUGIN_CATALOG[pluginId]
	const steps = (plugin?.installSteps ?? []).filter(
		(s) => !s.secret && !s.code?.includes("sm_..."),
	)

	return (
		<div className="space-y-4">
			{steps.map((step, i) => (
				<StepRow key={step.title} index={i + 1} title={step.title}>
					{step.description ? (
						<p className="mb-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
							{step.description}
						</p>
					) : null}
					{step.code ? <CopyCodeBlock code={step.code} /> : null}
				</StepRow>
			))}
			<StepRow index={steps.length + 1} title="Ask your brain to test it">
				<CopyCodeBlock code={TEST_PROMPT} />
			</StepRow>
		</div>
	)
}

function McpGenericSetup({ mcpUrl }: { mcpUrl: string }) {
	return (
		<div className="space-y-4">
			<StepRow index={1} title="Copy your universal MCP URL">
				<McpUrlRow url={mcpUrl} />
			</StepRow>
			<StepRow index={2} title="Paste it into any MCP client">
				<Link
					href="/settings/integrations"
					className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#737373] transition-colors hover:text-[#fafafa]"
				>
					Per-client setup guides
					<ExternalLink className="size-3.5" aria-hidden />
				</Link>
			</StepRow>
			<StepRow index={3} title="Ask your brain to test it">
				<CopyCodeBlock code={TEST_PROMPT} />
			</StepRow>
		</div>
	)
}

function SlackSetupPanel() {
	const [status, setStatus] = useState<{
		connected: boolean
		teamName: string | null
	} | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let active = true
		;(async () => {
			try {
				const res = await fetch(`${BACKEND}/brain/slack/status`, {
					credentials: "include",
				})
				if (active && res.ok) {
					setStatus(
						(await res.json()) as {
							connected: boolean
							teamName: string | null
						},
					)
				}
			} finally {
				if (active) setLoading(false)
			}
		})()
		return () => {
			active = false
		}
	}, [])

	const connected = status?.connected ?? false

	return (
		<div className="space-y-4">
			<StepRow
				index={1}
				done={connected}
				title={
					connected
						? `Connected to ${status?.teamName ?? "your workspace"}`
						: "Add Supermemory to your Slack workspace"
				}
			>
				{!connected &&
					(loading ? (
						<span className="inline-flex items-center gap-2 text-[12px] font-medium text-[#737373]">
							<Loader2 className="size-3.5 animate-spin" />
							Checking…
						</span>
					) : (
						<Button
							variant="insideOut"
							asChild
							className="h-9 gap-2 rounded-full px-4 text-[13px] font-medium text-[#fafafa]"
						>
							<a href={`${BACKEND}/brain/slack/oauth/install`}>
								<SlackMark className="size-4" />
								Add to Slack
							</a>
						</Button>
					))}
			</StepRow>
			<StepRow
				index={2}
				title={
					<>
						Mention <span className="text-[#4BA0FA]">@supermemory</span> in{" "}
						<span className="font-mono text-[12px]">#general</span>
					</>
				}
			/>
			<StepRow index={3} title="Ask your brain to test it">
				<CopyCodeBlock code="@supermemory what do we know about [topic]?" />
			</StepRow>
		</div>
	)
}

function CopyCodeBlock({ code }: { code: string }) {
	const [copied, setCopied] = useState(false)

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(code)
			setCopied(true)
			toast.success("Copied")
			setTimeout(() => setCopied(false), 1500)
		} catch {
			toast.error("Could not copy")
		}
	}

	return (
		<div
			className="flex min-w-0 flex-1 items-start gap-2 rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#0F1217] p-3"
			style={inputBevelStyle}
		>
			<pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[11px] text-[#fafafa]">
				{code}
			</pre>
			<button
				type="button"
				onClick={copy}
				className="flex size-7 shrink-0 items-center justify-center rounded-md text-[#737373] transition-colors hover:text-[#fafafa]"
				aria-label="Copy"
			>
				{copied ? (
					<Check className="size-3.5 text-[#4BA0FA]" />
				) : (
					<Copy className="size-3.5" />
				)}
			</button>
		</div>
	)
}

function McpUrlRow({ url }: { url: string }) {
	const [copied, setCopied] = useState(false)

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(url)
			setCopied(true)
			toast.success("MCP URL copied")
			setTimeout(() => setCopied(false), 2000)
		} catch {
			toast.error("Could not copy")
		}
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			<div
				className="min-w-0 flex-1 rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#0F1217] px-4 py-3"
				style={inputBevelStyle}
			>
				<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#525D6E]">
					Universal MCP URL
				</p>
				<p className="mt-0.5 truncate font-mono text-[13px] text-[#fafafa]">
					{url}
				</p>
			</div>
			<Button
				variant="insideOut"
				onClick={copy}
				className="h-9 shrink-0 rounded-full px-4 text-[12px] font-medium text-[#fafafa]"
			>
				{copied ? (
					<Check className="size-3.5" />
				) : (
					<Copy className="size-3.5" />
				)}
				{copied ? "Copied" : "Copy URL"}
			</Button>
		</div>
	)
}

function SlackMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 122.8 122.8" className={className} aria-hidden="true">
			<title>Slack</title>
			<path
				d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z"
				fill="#E01E5A"
			/>
			<path
				d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
				fill="#E01E5A"
			/>
			<path
				d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z"
				fill="#36C5F0"
			/>
			<path
				d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
				fill="#36C5F0"
			/>
			<path
				d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z"
				fill="#2EB67D"
			/>
			<path
				d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
				fill="#2EB67D"
			/>
			<path
				d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z"
				fill="#ECB22E"
			/>
			<path
				d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
				fill="#ECB22E"
			/>
		</svg>
	)
}
