"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { ChromeIcon, RaycastIcon } from "@/components/integration-icons"
import {
	ClaudeDesktopIcon,
	GoogleDrive,
	MCPIcon,
	Notion,
} from "@ui/assets/icons"
import { Logo } from "@ui/assets/Logo"
import NovaOrb from "@/components/nova/nova-orb"

type ToolNode = {
	id: string
	name: string
	x: number
	y: number
	icon?: React.ComponentType<{ className?: string }>
	iconSrc?: string
}

type ContextConnection = {
	from: ToolNode
	to: ToolNode
}

type ContextPhase = "idle" | "capture" | "hold" | "recall"

const CENTER = { x: 50, y: 50 }
const IN_MS = 1100
const HOLD_MS = 700
const OUT_MS = 1100
const TOTAL_MS = IN_MS + HOLD_MS + OUT_MS

const TOOL_NODES: ToolNode[] = [
	{ id: "chrome", name: "Chrome", x: 14, y: 20, icon: ChromeIcon },
	{ id: "notion", name: "Notion", x: 84, y: 16, icon: Notion },
	{ id: "drive", name: "Google Drive", x: 10, y: 52, icon: GoogleDrive },
	{ id: "claude", name: "Claude", x: 90, y: 44, icon: ClaudeDesktopIcon },
	{ id: "raycast", name: "Raycast", x: 76, y: 76, icon: RaycastIcon },
	{ id: "mcp", name: "MCP", x: 22, y: 84, icon: MCPIcon },
	{
		id: "claude-code",
		name: "Claude Code",
		x: 20,
		y: 36,
		iconSrc: "/images/plugins/claude-code.svg",
	},
	{
		id: "codex",
		name: "Codex",
		x: 92,
		y: 28,
		iconSrc: "/images/plugins/codex.png",
	},
	{
		id: "opencode",
		name: "OpenCode",
		x: 58,
		y: 10,
		iconSrc: "/images/plugins/opencode.svg",
	},
	{
		id: "hermes",
		name: "Hermes",
		x: 36,
		y: 90,
		iconSrc: "/images/plugins/hermes.svg",
	},
	{
		id: "openclaw",
		name: "OpenClaw",
		x: 68,
		y: 68,
		iconSrc: "/images/plugins/openclaw.svg",
	},
]

const CONTEXT_FLOWS: [string, string][] = [
	["chrome", "claude"],
	["notion", "raycast"],
	["drive", "claude-code"],
	["opencode", "codex"],
	["claude-code", "mcp"],
	["hermes", "openclaw"],
	["claude", "mcp"],
	["notion", "claude"],
]

function nodeById(id: string) {
	return TOOL_NODES.find((node) => node.id === id)
}

function pickContextFlow(): ContextConnection | null {
	const flow = CONTEXT_FLOWS[Math.floor(Math.random() * CONTEXT_FLOWS.length)]
	if (!flow) return null
	const [fromId, toId] = flow
	const from = nodeById(fromId)
	const to = nodeById(toId)
	if (!from || !to) return null
	return { from, to }
}

function ToolNodeIcon({
	node,
	role,
}: {
	node: ToolNode
	role?: "source" | "destination"
}) {
	const Icon = node.icon

	return (
		<div
			className="login-tool-node-wrap"
			style={{ left: `${node.x}%`, top: `${node.y}%` }}
		>
			<div
				className={cn(
					"login-tool-node",
					role === "source" && "login-tool-node-source",
					role === "destination" && "login-tool-node-destination",
				)}
				title={node.name}
			>
				{Icon ? (
					<Icon className="login-tool-node-icon shrink-0" />
				) : node.iconSrc ? (
					<Image
						src={node.iconSrc}
						alt=""
						width={22}
						height={22}
						className="login-tool-node-icon shrink-0"
					/>
				) : null}
			</div>
			<span
				className={cn(
					"login-tool-node-label",
					dmSansClassName(),
					role && "login-tool-node-label-visible",
				)}
				aria-hidden={!role}
			>
				{node.name}
			</span>
		</div>
	)
}

function MemoryChip() {
	return (
		<div className="login-context-chip">
			<div className="login-context-chip-lines" aria-hidden>
				<span />
				<span />
				<span />
			</div>
		</div>
	)
}

function AnimatedContextFlow({
	connection,
	phase,
}: {
	connection: ContextConnection
	phase: ContextPhase
}) {
	const { from, to } = connection
	const dIn = `M ${from.x} ${from.y} L ${CENTER.x} ${CENTER.y}`
	const dOut = `M ${CENTER.x} ${CENTER.y} L ${to.x} ${to.y}`

	const chipLeft =
		phase === "recall"
			? [`${CENTER.x}%`, `${to.x}%`]
			: phase === "hold"
				? `${CENTER.x}%`
				: [`${from.x}%`, `${CENTER.x}%`]

	const chipTop =
		phase === "recall"
			? [`${CENTER.y}%`, `${to.y}%`]
			: phase === "hold"
				? `${CENTER.y}%`
				: [`${from.y}%`, `${CENTER.y}%`]

	return (
		<div className="pointer-events-none absolute inset-0 z-[1]">
			<svg
				className="absolute inset-0 h-full w-full"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path
					d={dIn}
					fill="none"
					stroke="rgb(75 160 250 / 0.12)"
					strokeWidth="2.5"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={dOut}
					fill="none"
					stroke="rgb(75 160 250 / 0.12)"
					strokeWidth="2.5"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				{(phase === "capture" || phase === "hold") && (
					<motion.path
						key={`in-${from.id}`}
						d={dIn}
						fill="none"
						stroke="rgb(140 205 255 / 0.75)"
						strokeWidth="1.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
						initial={{ pathLength: 0, opacity: 0 }}
						animate={{ pathLength: 1, opacity: 1 }}
						transition={{ duration: IN_MS / 1000, ease: [0.33, 0, 0.2, 1] }}
					/>
				)}
				{phase === "recall" && (
					<motion.path
						key={`out-${to.id}`}
						d={dOut}
						fill="none"
						stroke="rgb(160 220 255 / 0.9)"
						strokeWidth="1.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
						initial={{ pathLength: 0, opacity: 0 }}
						animate={{ pathLength: 1, opacity: 1 }}
						transition={{ duration: OUT_MS / 1000, ease: [0.33, 0, 0.2, 1] }}
					/>
				)}
			</svg>

			{phase !== "idle" && (
				<motion.div
					className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
					initial={false}
					animate={{
						left: chipLeft,
						top: chipTop,
						opacity: phase === "hold" ? 1 : [1, 1],
						scale: phase === "hold" ? 1.05 : 1,
					}}
					transition={{
						left: {
							duration: phase === "recall" ? OUT_MS / 1000 : IN_MS / 1000,
							ease: [0.35, 0, 0.15, 1],
						},
						top: {
							duration: phase === "recall" ? OUT_MS / 1000 : IN_MS / 1000,
							ease: [0.35, 0, 0.15, 1],
						},
						scale: { duration: 0.3 },
					}}
				>
					<MemoryChip />
				</motion.div>
			)}
		</div>
	)
}

function ToolsContextNetwork() {
	const [connection, setConnection] = useState<ContextConnection | null>(null)
	const [pulseId, setPulseId] = useState(0)
	const [phase, setPhase] = useState<ContextPhase>("idle")

	useEffect(() => {
		let cancelled = false
		let pulseTimeout: ReturnType<typeof setTimeout>

		const runPulse = () => {
			if (cancelled) return
			const next = pickContextFlow()
			if (!next) return
			setConnection(next)
			setPulseId((id) => id + 1)
			pulseTimeout = setTimeout(runPulse, TOTAL_MS + 900 + Math.random() * 500)
		}

		runPulse()
		return () => {
			cancelled = true
			clearTimeout(pulseTimeout)
		}
	}, [])

	useEffect(() => {
		if (!connection) return

		setPhase("capture")
		const holdTimer = setTimeout(() => setPhase("hold"), IN_MS)
		const recallTimer = setTimeout(() => setPhase("recall"), IN_MS + HOLD_MS)
		const idleTimer = setTimeout(() => setPhase("idle"), TOTAL_MS)

		return () => {
			clearTimeout(holdTimer)
			clearTimeout(recallTimer)
			clearTimeout(idleTimer)
		}
	}, [connection])

	const sourceRole = (nodeId: string) =>
		connection &&
		connection.from.id === nodeId &&
		(phase === "capture" || phase === "hold")
			? ("source" as const)
			: undefined

	const destRole = (nodeId: string) =>
		connection && connection.to.id === nodeId && phase === "recall"
			? ("destination" as const)
			: undefined

	return (
		<div
			className="login-tools-network relative h-full min-h-[240px] w-full lg:min-h-0"
			aria-hidden
		>
			{connection && phase !== "idle" ? (
				<AnimatedContextFlow
					key={pulseId}
					connection={connection}
					phase={phase}
				/>
			) : null}

			{TOOL_NODES.map((node) => (
				<ToolNodeIcon
					key={node.id}
					node={node}
					role={sourceRole(node.id) ?? destRole(node.id)}
				/>
			))}

			<div className="absolute left-1/2 top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2">
				<motion.div
					className="relative flex size-24 items-center justify-center sm:size-28 lg:size-36"
					animate={{ scale: phase === "hold" ? [1, 1.08, 1] : 1 }}
					transition={{ duration: 0.55, ease: "easeOut" }}
				>
					<NovaOrb size={112} className="blur-[2px]!" />
					<div className="absolute inset-0 flex items-center justify-center">
						<Logo className="size-6 opacity-80 sm:size-7 lg:size-8" />
					</div>
				</motion.div>
			</div>
		</div>
	)
}

function LoginPanelBackground() {
	return (
		<>
			<div
				className="pointer-events-none absolute inset-0 bg-[#030912]"
				aria-hidden
			/>
			<div className="login-panel-orb pointer-events-none" aria-hidden />
			<div className="login-panel-orb-image" aria-hidden />
			<div className="login-panel-orb-image-alt" aria-hidden />
		</>
	)
}

export function LoginToolsPanel() {
	return (
		<aside className="relative hidden min-h-0 flex-col overflow-hidden border-white/[0.06] lg:col-start-1 lg:row-start-1 lg:flex lg:h-full lg:border-r">
			<LoginPanelBackground />

			<div className="login-tools-panel-inner relative z-10 flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-10">
				<ToolsContextNetwork />
			</div>

			<p
				className={cn(
					"relative z-10 shrink-0 px-4 pb-4 text-center text-[11px] leading-snug text-white/40 sm:px-8 sm:text-xs lg:absolute lg:bottom-6 lg:left-1/2 lg:max-w-none lg:-translate-x-1/2 lg:px-0 lg:pb-0 lg:text-sm lg:whitespace-nowrap lg:text-white/45",
					dmSansClassName(),
				)}
			>
				One memory layer — context from any tool, everywhere you need it.
			</p>
		</aside>
	)
}
