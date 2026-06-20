"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useQueryState, parseAsString } from "nuqs"
import { Button } from "@ui/components/button"
import { MCPIcon } from "@ui/assets/icons"
import { ArrowRight, Check, Copy, EyeOff, Eye } from "lucide-react"
import { cn } from "@lib/utils"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { toast } from "sonner"
import { MCPSteps } from "@/components/mcp-modal/mcp-detail-view"
import { PLUGIN_CATALOG } from "@/lib/plugin-catalog"
import { analytics } from "@/lib/analytics"

interface Props {
	mcpUrl: string
	onContinue: () => void
}

const modalCardStyle = {
	boxShadow:
		"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
}

const inputBevelStyle = {
	boxShadow:
		"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
}

type AgentCategory = "coding" | "productivity"

type Agent = {
	key: string
	name: string
	tagline: string
	category: AgentCategory
	pluginId?: string
}

const AGENTS: Agent[] = [
	{
		key: "cursor",
		name: "Cursor",
		tagline: "Persistent context across coding sessions.",
		category: "coding",
	},
	{
		key: "claude-code",
		name: "Claude Code",
		tagline: "Memory and decisions across CLI sessions.",
		category: "coding",
		pluginId: "claude_code",
	},
	{
		key: "vscode",
		name: "VS Code",
		tagline: "Inline context while you write.",
		category: "coding",
	},
	{
		key: "cline",
		name: "Cline",
		tagline: "Agentic dev tasks with your memory.",
		category: "coding",
	},
	{
		key: "codex",
		name: "Codex",
		tagline: "OpenAI Codex with persistent memory.",
		category: "coding",
		pluginId: "codex",
	},
	{
		key: "gemini-cli",
		name: "Gemini CLI",
		tagline: "Gemini in your terminal, brain-aware.",
		category: "coding",
	},
	{
		key: "claude",
		name: "Claude Desktop",
		tagline: "Memory across every Claude conversation.",
		category: "productivity",
	},
	{
		key: "chatgpt",
		name: "ChatGPT",
		tagline: "Custom GPT backed by your brain.",
		category: "productivity",
	},
]

const CATEGORY_ORDER: { id: AgentCategory; label: string }[] = [
	{ id: "coding", label: "Coding" },
	{ id: "productivity", label: "Productivity" },
]

function agentIcon(agent: Agent) {
	if (agent.pluginId) {
		const plugin = PLUGIN_CATALOG[agent.pluginId]
		if (plugin) return plugin.icon
	}
	const file = agent.key === "claude-code" ? "claude" : agent.key
	return `/mcp-supported-tools/${file}.png`
}

export function StepIngest({ mcpUrl, onContinue }: Props) {
	const [activeCategory, setActiveCategory] = useState<AgentCategory>("coding")
	const [selectedKey, setSelectedKey] = useState<string>("cursor")
	const [, setMcpClient] = useQueryState("mcpClient", parseAsString)

	const selectedAgent = AGENTS.find((a) => a.key === selectedKey) ?? AGENTS[0]

	useEffect(() => {
		if (selectedAgent && !selectedAgent.pluginId) {
			setMcpClient(selectedAgent.key)
		} else {
			setMcpClient(null)
		}
	}, [selectedAgent, setMcpClient])

	const selectAgent = (agent: Agent) => {
		analytics.onboardingAgentSelected({ agent: agent.key })
		setSelectedKey(agent.key)
	}

	const handleContinue = () => {
		analytics.onboardingIngestCompleted()
		onContinue()
	}

	const handleSkip = () => {
		analytics.onboardingIngestSkipped()
		onContinue()
	}

	const filtered = AGENTS.filter((a) => a.category === activeCategory)

	return (
		<div className="space-y-5">
			<div className="px-1">
				<p
					className={cn(
						"font-semibold text-[#fafafa] text-[22px]",
						dmSans125ClassName(),
					)}
				>
					Use your brain anywhere
				</p>
				<p className="text-[#737373] font-medium text-[15px] leading-[1.4] mt-1.5">
					Now plug it into the tools you already use to write code, chat, think.
				</p>
			</div>

			<McpHero url={mcpUrl} />

			<div className="grid lg:grid-cols-[300px_1fr] gap-4 h-[560px]">
				<aside
					className="rounded-[16px] bg-[#1B1F24] p-3 flex flex-col gap-3 overflow-hidden h-full"
					style={modalCardStyle}
				>
					<CategoryTabs value={activeCategory} onChange={setActiveCategory} />
					<div className="flex-1 min-h-0 overflow-y-auto space-y-1 scrollbar-thin pr-1">
						{filtered.map((agent) => (
							<AgentRow
								key={agent.key}
								agent={agent}
								active={selectedKey === agent.key}
								onClick={() => selectAgent(agent)}
							/>
						))}
					</div>
				</aside>

				<section
					className="rounded-[16px] bg-[#1B1F24] p-5 md:p-6 overflow-hidden flex flex-col h-full"
					style={modalCardStyle}
				>
					{selectedAgent?.pluginId ? (
						<PluginSteps pluginId={selectedAgent.pluginId} />
					) : (
						<MCPSteps variant="embedded" />
					)}
				</section>
			</div>

			<div className="flex flex-wrap items-center justify-end gap-[22px] px-1 pt-2">
				<button
					type="button"
					onClick={handleSkip}
					className="text-[#737373] font-medium text-[14px] hover:text-[#999] transition-colors"
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
	)
}

function McpHero({ url }: { url: string }) {
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
		<section
			className="rounded-[16px] bg-[#1B1F24] px-5 py-3 flex items-center gap-3 relative overflow-hidden"
			style={modalCardStyle}
		>
			<div
				aria-hidden
				className="absolute -top-px left-0 right-0 h-px"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(75,160,250,0.3), transparent)",
				}}
			/>
			<div
				className="size-9 rounded-[10px] bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center shrink-0"
				style={inputBevelStyle}
			>
				<MCPIcon className="size-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[10px] uppercase tracking-[0.08em] text-[#737373] font-semibold">
					Universal MCP URL
				</p>
				<p className="text-[13px] text-[#fafafa] font-mono truncate mt-0.5">
					{url}
				</p>
			</div>
			<Button
				variant="insideOut"
				onClick={copy}
				className="rounded-full h-9 px-4 text-[12px] font-medium text-[#fafafa] shrink-0"
			>
				{copied ? (
					<Check className="size-3.5" />
				) : (
					<Copy className="size-3.5" />
				)}
				{copied ? "Copied" : "Copy URL"}
			</Button>
		</section>
	)
}

function PluginSteps({ pluginId }: { pluginId: string }) {
	const plugin = PLUGIN_CATALOG[pluginId]
	if (!plugin) return null
	const steps = plugin.installSteps ?? []
	return (
		<div className="h-full overflow-y-auto pr-1 scrollbar-thin">
			<div className="flex items-center gap-3 mb-4">
				<div className="size-10 rounded-[10px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)] flex items-center justify-center shrink-0 overflow-hidden">
					<Image
						src={plugin.icon}
						alt={plugin.name}
						width={28}
						height={28}
						unoptimized
						className="size-6 object-contain"
					/>
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-[16px] font-semibold text-[#fafafa] leading-tight">
						Set up {plugin.name}
					</p>
					<p className="text-[12px] text-[#A1A1AA] font-medium mt-0.5">
						{plugin.tagline}
					</p>
				</div>
				{plugin.docsUrl && (
					<a
						href={plugin.docsUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-[12px] text-[#A1A1AA] hover:text-[#fafafa] transition-colors font-medium shrink-0"
					>
						Docs ↗
					</a>
				)}
			</div>

			<div className="space-y-3">
				{steps.map((step, i) => (
					<PluginStep key={step.title} idx={i + 1} step={step} />
				))}
			</div>

			<div className="mt-4 rounded-[10px] border border-[#4BA0FA]/20 bg-[#4BA0FA]/[0.04] p-3 flex items-start gap-2">
				<div className="text-[11px] text-[#A1A1AA] leading-[1.5] font-medium">
					Your <span className="text-[#fafafa]">API key</span> is minted in
					Settings → Integrations → Plugins. Mint it once and paste into the
					step above.
				</div>
			</div>
		</div>
	)
}

function PluginStep({
	idx,
	step,
}: {
	idx: number
	step: import("@/lib/plugin-catalog").InstallStep
}) {
	const [revealed, setRevealed] = useState(false)
	const [copied, setCopied] = useState(false)
	const copy = async () => {
		if (!step.code) return
		try {
			await navigator.clipboard.writeText(step.code)
			setCopied(true)
			toast.success("Copied")
			setTimeout(() => setCopied(false), 1500)
		} catch {
			toast.error("Could not copy")
		}
	}
	return (
		<div className="flex gap-3">
			<div className="flex flex-col items-center shrink-0 pt-1">
				<div className="size-5 rounded-full bg-[#4BA0FA]/15 text-[#4BA0FA] flex items-center justify-center text-[10px] font-semibold">
					{idx}
				</div>
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-[13px] font-semibold text-[#fafafa]">
					{step.title}
					{step.optional && (
						<span className="ml-2 text-[10px] uppercase tracking-[0.08em] text-[#525D6E]">
							Optional
						</span>
					)}
				</p>
				{step.description && (
					<p className="text-[12px] text-[#A1A1AA] mt-1 leading-[1.5] font-medium">
						{step.description}
					</p>
				)}
				{step.code && (
					<div
						className="mt-2 rounded-[10px] bg-[#0F1217] border border-[rgba(82,89,102,0.2)] p-3 flex items-start gap-2"
						style={inputBevelStyle}
					>
						<pre
							className={cn(
								"flex-1 min-w-0 text-[11px] text-[#fafafa] font-mono overflow-x-auto whitespace-pre",
								step.secret && !revealed && "blur-[3px] select-none",
							)}
						>
							{step.code}
						</pre>
						<div className="flex items-center gap-1 shrink-0">
							{step.secret && (
								<button
									type="button"
									onClick={() => setRevealed((v) => !v)}
									className="size-7 rounded-md text-[#737373] hover:text-[#fafafa] flex items-center justify-center transition-colors"
									aria-label={revealed ? "Hide" : "Reveal"}
								>
									{revealed ? (
										<EyeOff className="size-3.5" />
									) : (
										<Eye className="size-3.5" />
									)}
								</button>
							)}
							<button
								type="button"
								onClick={copy}
								className="size-7 rounded-md text-[#737373] hover:text-[#fafafa] flex items-center justify-center transition-colors"
								aria-label="Copy"
							>
								{copied ? (
									<Check className="size-3.5 text-[#4BA0FA]" />
								) : (
									<Copy className="size-3.5" />
								)}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

function CategoryTabs({
	value,
	onChange,
}: {
	value: AgentCategory
	onChange: (c: AgentCategory) => void
}) {
	const counts: Record<AgentCategory, number> = {
		coding: 0,
		productivity: 0,
	}
	for (const a of AGENTS) counts[a.category] += 1
	return (
		<div className="scrollbar-none flex items-center gap-0.5 overflow-x-auto rounded-full bg-[#0D121A] p-0.5 shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)] w-full">
			{CATEGORY_ORDER.map((cat) => {
				const isActive = value === cat.id
				return (
					<button
						key={cat.id}
						type="button"
						onClick={() => onChange(cat.id)}
						className={cn(
							dmSansClassName(),
							"flex flex-1 h-7 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-medium leading-none transition-colors",
							isActive
								? "bg-white/[0.10] text-[#FAFAFA]"
								: "text-[#A1A1AA] hover:text-[#FAFAFA]",
						)}
					>
						<span className="leading-none">{cat.label}</span>
						<span
							className={cn(
								"text-[10px] font-semibold tabular-nums leading-none",
								isActive ? "text-[#A1A1AA]" : "text-[#525D6E]",
							)}
						>
							{counts[cat.id]}
						</span>
					</button>
				)
			})}
		</div>
	)
}

function AgentRow({
	agent,
	active,
	onClick,
}: {
	agent: Agent
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				dmSansClassName(),
				"w-full text-left flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 transition-colors",
				active
					? "bg-white/[0.08] text-[#fafafa]"
					: "text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#fafafa]",
			)}
		>
			<div className="size-8 rounded-[8px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)] flex items-center justify-center shrink-0 overflow-hidden">
				<Image
					src={agentIcon(agent)}
					alt={agent.name}
					width={24}
					height={24}
					unoptimized
					className="size-5 object-contain"
				/>
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[13px] font-medium truncate">{agent.name}</p>
				<p className="text-[11px] text-[#737373] truncate font-medium">
					{agent.tagline}
				</p>
			</div>
		</button>
	)
}
