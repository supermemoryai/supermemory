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
	// Team/company-brain onboarding is focused: just get Supermemory into Slack.
	// Coding agents live under "More tools (full catalog)".
	team: [
		{
			id: "slack",
			label: "Slack",
			blurb: "Ask questions in-channel.",
			kind: "slack",
			recommended: true,
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
		<div className="mx-auto w-full max-w-[680px] pb-10">
			<section className="py-4">
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
							? "Add Supermemory to Slack so your team can ask in any channel."
							: "Pick the tool you open every day — about 60 seconds."}
					</p>
				</div>

				<div
					className="rounded-[22px] bg-[#1B1F24] p-6 md:p-7"
					style={modalCardStyle}
				>
					{tools.length > 1 ? (
						<>
							<FlowTabs
								tools={tools}
								selected={selected}
								onSelect={(id) => {
									analytics.onboardingAgentSelected({ agent: id })
									setSelected(id)
								}}
							/>
							<p className="mt-5 mb-4 px-1 text-[13px] font-medium text-[#737373]">
								{activeTool.blurb}
							</p>
						</>
					) : (
						<div className="mb-5 flex items-center gap-3 px-1">
							<div
								className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#14161A]"
								style={inputBevelStyle}
							>
								<ToolIcon id={activeTool.id} />
							</div>
							<div>
								<p className="text-[16px] font-semibold text-[#fafafa]">
									Set up {activeTool.label}
								</p>
								<p className="mt-0.5 text-[12px] font-medium text-[#737373]">
									{activeTool.blurb}
								</p>
							</div>
						</div>
					)}

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

					<div
						className={cn(
							"mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-5",
							tools.length > 1 ? "justify-between" : "justify-end",
						)}
					>
						{tools.length > 1 && (
							<Link
								href="/settings/integrations"
								className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#737373] transition-colors hover:text-[#fafafa]"
							>
								More tools
								<span className="text-[#525D6E]">(full catalog)</span>
								<ExternalLink className="size-3.5" aria-hidden />
							</Link>
						)}
						<div className="flex items-center gap-[22px]">
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

function FlowTabs({
	tools,
	selected,
	onSelect,
}: {
	tools: readonly FlowTool[]
	selected: FlowToolId
	onSelect: (id: FlowToolId) => void
}) {
	return (
		<div
			className="grid gap-1 rounded-[14px] border border-[rgba(115,115,115,0.2)] bg-[#0D121A] p-1"
			style={{
				gridTemplateColumns: `repeat(${tools.length}, minmax(0,1fr))`,
				boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
			}}
		>
			{tools.map((tool) => {
				const active = tool.id === selected
				return (
					<button
						key={tool.id}
						type="button"
						onClick={() => onSelect(tool.id)}
						aria-pressed={active}
						className={cn(
							"relative flex h-10 items-center justify-center gap-2 rounded-[10px] border border-transparent px-2 text-[13px] font-medium transition-colors",
							active ? "text-[#fafafa]" : "text-[#737373] hover:text-[#fafafa]",
						)}
						style={
							active
								? { background: "#00173C", borderColor: "#2261CA66" }
								: undefined
						}
					>
						<ToolIcon id={tool.id} className="size-4 shrink-0" />
						<span className="truncate">{tool.label}</span>
					</button>
				)
			})}
		</div>
	)
}

function StepRow({
	index,
	title,
	done,
	children,
	last,
}: {
	index: number
	title: ReactNode
	done?: boolean
	children?: ReactNode
	last?: boolean
}) {
	return (
		<div className="flex gap-3">
			<div className="flex flex-col items-center">
				<span
					aria-hidden
					className={cn(
						"flex size-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
						done
							? "bg-[#4BA0FA] text-white"
							: "border border-[rgba(82,89,102,0.3)] bg-[#14161A] text-[#737373]",
					)}
				>
					{done ? <Check className="size-3" /> : index}
				</span>
				{!last && (
					<span
						aria-hidden
						className="mt-1.5 w-px flex-1 bg-[rgba(82,89,102,0.3)]"
					/>
				)}
			</div>
			<div className={cn("min-w-0 flex-1 pt-0.5", last ? "pb-0" : "pb-6")}>
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
		<div>
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
			<StepRow index={steps.length + 1} last title="Ask your brain to test it">
				<CopyCodeBlock code={TEST_PROMPT} />
			</StepRow>
		</div>
	)
}

function McpGenericSetup({ mcpUrl }: { mcpUrl: string }) {
	return (
		<div>
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
			<StepRow index={3} last title="Ask your brain to test it">
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
		<div>
			<StepRow
				index={1}
				done={connected}
				title={
					connected ? (
						`Connected to ${status?.teamName ?? "your workspace"}`
					) : (
						<div className="flex items-start justify-between gap-3">
							<span className="pt-1">
								Add Supermemory to your Slack workspace
							</span>
							{loading ? (
								<span className="inline-flex shrink-0 items-center gap-2 text-[12px] font-medium text-[#737373]">
									<Loader2 className="size-3.5 animate-spin" />
									Checking…
								</span>
							) : (
								<a
									href={`${BACKEND}/brain/slack/oauth/install`}
									className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1D1C1D] transition-transform hover:scale-[1.02]"
								>
									<SlackMark className="size-4" />
									Add to Slack
								</a>
							)}
						</div>
					)
				}
			/>
			<StepRow
				index={2}
				title={
					<>
						Mention <span className="text-[#4BA0FA]">@supermemory</span> in{" "}
						<span className="font-mono text-[12px]">#general</span>
					</>
				}
			/>
			<StepRow index={3} last title="Ask your brain to test it">
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
