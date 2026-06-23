"use client"

import { Logo } from "@ui/assets/Logo"
import {
	ClaudeDesktopIcon,
	GoogleDrive,
	MCPIcon,
	Notion,
} from "@ui/assets/icons"
import { ExternalAuthButton } from "@ui/button/external-auth"
import { Badge } from "@ui/components/badge"
import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { Label } from "@ui/components/label"
import { TextSeparator } from "@ui/components/text-separator"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import {
	type CSSProperties,
	type FormEvent,
	type ReactNode,
	useEffect,
	useState,
} from "react"
import {
	beginBrowserAuth,
	desktopDevAuthEnabled,
	getSession,
	onAuthChanged,
	onAuthError,
	storeToken,
} from "@/lib/auth"

export default function LoginPage() {
	const router = useRouter()
	const [token, setToken] = useState("")
	const [email, setEmail] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isBrowserAuthPending, setIsBrowserAuthPending] = useState(false)

	useEffect(() => {
		let unlistenChanged: (() => void) | undefined
		let unlistenError: (() => void) | undefined

		onAuthChanged(async (event) => {
			if (!event.authenticated) return
			setError(null)
			setIsBrowserAuthPending(false)
			try {
				await getSession()
				router.replace("/")
			} catch (err) {
				setError(formatError(err, "Could not validate browser sign-in"))
			}
		})
			.then((handler) => {
				unlistenChanged = handler
			})
			.catch(() => {
				unlistenChanged = undefined
			})

		onAuthError((message) => {
			setIsBrowserAuthPending(false)
			setError(message)
		})
			.then((handler) => {
				unlistenError = handler
			})
			.catch(() => {
				unlistenError = undefined
			})

		return () => {
			unlistenChanged?.()
			unlistenError?.()
		}
	}, [router])

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)
		setIsSubmitting(true)

		try {
			await storeToken(token)
			router.replace("/")
		} catch (err) {
			setError(formatError(err, "Could not sign in"))
		} finally {
			setIsSubmitting(false)
		}
	}

	async function startBrowserAuth() {
		setError(null)
		setIsBrowserAuthPending(true)
		try {
			await beginBrowserAuth()
		} catch (err) {
			setError(formatError(err, "Could not open browser sign-in"))
			setIsBrowserAuthPending(false)
		}
	}

	function onBrowserAuthSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		void startBrowserAuth()
	}

	const isAuthBusy = isBrowserAuthPending || isSubmitting

	return (
		<main className="desktop-login-page bg-[#030912] text-foreground">
			<DesktopLoginToolsPanel />

			<section className="desktop-login-auth-pane relative z-10 min-w-0">
				<header
					data-tauri-drag-region
					className="desktop-login-auth-header flex shrink-0 items-center justify-between"
				>
					<div className="flex min-w-0 items-center">
						<Logo className="h-7 shrink-0" />
						<p className="ml-2 truncate font-semibold text-white/90 text-xl leading-none">
							supermemory
						</p>
					</div>
					<Button
						asChild
						variant="newDefault"
						className="desktop-login-memory-api-button rounded-2xl text-white"
					>
						<a
							href="https://console.supermemory.ai"
							target="_blank"
							rel="noreferrer"
						>
							Memory API <span className="text-xs">↗</span>
						</a>
					</Button>
				</header>

				<div className="desktop-login-auth-content">
					<div className="desktop-login-auth-stack">
						<div className="desktop-login-headline text-center">
							<h1 className="text-balance font-medium leading-tight text-[#f7f9fc]">
								Never forget anything, anywhere
								<span className="block text-[#4BA0FA]">with supermemory</span>
							</h1>
							<p className="desktop-login-subtitle text-muted-foreground/50">
								Save from Chrome, Notion, X - search it all in one place.
							</p>
						</div>

						<div className="desktop-login-card relative bg-linear-to-b from-[#06101F] to-[#030912] shadow-[1.5px_1.5px_20px_0_rgba(0,0,0,0.65),1px_1.5px_2px_0_rgba(128,189,255,0.07)_inset,-0.5px_-1.5px_4px_0_rgba(0,35,73,0.40)_inset]">
							<div className={isBrowserAuthPending ? "invisible" : undefined}>
								<div className="mb-2 flex justify-end">
									<Badge className="h-5 rounded-md px-2 text-[10px]">
										Last used
									</Badge>
								</div>

								<div className="desktop-login-form flex flex-col">
									<ExternalAuthButton
										authIcon={<GoogleIcon />}
										authProvider="Google"
										className="w-full"
										disabled={isAuthBusy}
										onClick={startBrowserAuth}
										type="button"
									/>

									<ExternalAuthButton
										authIcon={<GithubIcon />}
										authProvider="Github"
										className="w-full"
										disabled={isAuthBusy}
										onClick={startBrowserAuth}
										type="button"
									/>

									<TextSeparator text="OR" />

									<form
										className="desktop-login-email-form flex flex-col"
										onSubmit={onBrowserAuthSubmit}
									>
										<Input
											value={email}
											onChange={(event) => setEmail(event.target.value)}
											placeholder="your@email.com"
											type="email"
											autoComplete="email"
											className="desktop-login-email-input rounded-xl border-[#17202e] bg-[#040a14]/70 px-6 text-base text-foreground placeholder:text-muted-foreground/45"
										/>

										<Button
											type="submit"
											className="desktop-login-primary-button rounded-xl bg-linear-to-r from-[#2935ff] to-[#2f78ff] text-lg text-white hover:from-[#3440ff] hover:to-[#3b83ff]"
											disabled={isAuthBusy}
										>
											<Logo className="size-5" />
											Log in with Supermemory
										</Button>
									</form>

									<p className="desktop-login-terms text-center text-muted-foreground/50">
										By continuing, you agree to our{" "}
										<a
											className="underline underline-offset-4 hover:text-muted-foreground"
											href="https://supermemory.ai/terms"
											target="_blank"
											rel="noreferrer"
										>
											Terms
										</a>{" "}
										and{" "}
										<a
											className="underline underline-offset-4 hover:text-muted-foreground"
											href="https://supermemory.ai/privacy"
											target="_blank"
											rel="noreferrer"
										>
											Privacy Policy
										</a>
										.
									</p>

									{error ? (
										<p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-destructive text-sm">
											{error}
										</p>
									) : null}

									{desktopDevAuthEnabled ? (
										<details className="group rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
											<summary className="cursor-pointer text-muted-foreground text-xs transition-colors hover:text-foreground">
												Development API key
											</summary>
											<form
												className="mt-4 space-y-3 text-left"
												onSubmit={onSubmit}
											>
												<div className="space-y-2">
													<Label htmlFor="api-key">API key</Label>
													<Input
														id="api-key"
														value={token}
														onChange={(event) => setToken(event.target.value)}
														placeholder="sm_..."
														type="password"
														autoComplete="off"
													/>
												</div>
												<Button
													type="submit"
													className="w-full"
													disabled={!token.trim() || isSubmitting}
												>
													{isSubmitting ? "Checking..." : "Continue with key"}
												</Button>
											</form>
										</details>
									) : null}
								</div>
							</div>

							{isBrowserAuthPending ? (
								<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[14px] bg-[#030912]/90 backdrop-blur-sm">
									<Loader2 className="size-6 animate-spin text-muted-foreground" />
									<p className="text-muted-foreground text-sm">
										Waiting for browser sign-in...
									</p>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</section>
		</main>
	)
}

type ToolNode = {
	id: string
	name: string
	x: number
	y: number
	icon: (props: { className?: string }) => ReactNode
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
	{ id: "chrome", name: "Chrome", x: 14, y: 20, icon: ChromeLogo },
	{ id: "notion", name: "Notion", x: 84, y: 16, icon: Notion },
	{ id: "drive", name: "Google Drive", x: 10, y: 52, icon: GoogleDrive },
	{ id: "claude", name: "Claude", x: 90, y: 44, icon: ClaudeDesktopIcon },
	{ id: "raycast", name: "Raycast", x: 76, y: 76, icon: RaycastMark },
	{ id: "mcp", name: "MCP", x: 22, y: 84, icon: MCPIcon },
	{
		id: "claude-code",
		name: "Claude Code",
		x: 20,
		y: 36,
		icon: CodeMark,
	},
	{ id: "codex", name: "Codex", x: 92, y: 28, icon: CodexMark },
	{ id: "opencode", name: "OpenCode", x: 58, y: 10, icon: OpenCodeMark },
	{ id: "hermes", name: "Hermes", x: 36, y: 90, icon: HermesMark },
	{ id: "openclaw", name: "OpenClaw", x: 68, y: 68, icon: OpenClawMark },
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

function DesktopLoginToolsPanel() {
	const [connection, setConnection] = useState<ContextConnection | null>(null)
	const [pulseId, setPulseId] = useState(0)
	const [phase, setPhase] = useState<ContextPhase>("idle")

	useEffect(() => {
		let cancelled = false
		let pulseTimeout: ReturnType<typeof setTimeout>

		function runPulse() {
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

	const destinationRole = (nodeId: string) =>
		connection && connection.to.id === nodeId && phase === "recall"
			? ("destination" as const)
			: undefined

	return (
		<aside className="desktop-login-tools-panel" aria-hidden>
			<div className="desktop-login-panel-orb" />
			<div className="desktop-login-panel-glow" />
			<div className="desktop-login-panel-vignette" />

			<div className="desktop-login-tools-network">
				{connection && phase !== "idle" ? (
					<AnimatedContextFlow
						key={pulseId}
						connection={connection}
						phase={phase}
					/>
				) : null}

				{TOOL_NODES.map((node) => (
					<FloatingToolNode
						key={node.id}
						node={node}
						role={sourceRole(node.id) ?? destinationRole(node.id)}
					/>
				))}

				<div className="desktop-login-orb-wrap">
					<div
						className={
							phase === "hold"
								? "desktop-login-nova-orb desktop-login-nova-orb-active"
								: "desktop-login-nova-orb"
						}
					>
						<div className="desktop-login-nova-gradient" />
						<Logo className="relative z-10 size-8 opacity-80" />
					</div>
				</div>
			</div>

			<p className="desktop-login-panel-caption">
				One memory layer - context from any tool, everywhere you need it.
			</p>
		</aside>
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
	const chipPhase =
		phase === "recall"
			? "desktop-login-chip-recall"
			: phase === "hold"
				? "desktop-login-chip-hold"
				: "desktop-login-chip-capture"

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
				{phase === "capture" || phase === "hold" ? (
					<path
						d={dIn}
						pathLength={1}
						className="desktop-login-active-path"
						fill="none"
						stroke="rgb(140 205 255 / 0.75)"
						strokeWidth="1.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				) : null}
				{phase === "recall" ? (
					<path
						d={dOut}
						pathLength={1}
						className="desktop-login-active-path"
						fill="none"
						stroke="rgb(160 220 255 / 0.9)"
						strokeWidth="1.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				) : null}
			</svg>

			<div
				className={`desktop-login-memory-chip-motion ${chipPhase}`}
				style={
					{
						"--from-x": `${from.x}%`,
						"--from-y": `${from.y}%`,
						"--to-x": `${to.x}%`,
						"--to-y": `${to.y}%`,
					} as CSSProperties
				}
			>
				<MemoryChip />
			</div>
		</div>
	)
}

function FloatingToolNode({
	node,
	role,
}: {
	node: ToolNode
	role?: "source" | "destination"
}) {
	const Icon = node.icon
	const roleClass =
		role === "source"
			? "desktop-login-tool-node-source"
			: role === "destination"
				? "desktop-login-tool-node-destination"
				: ""

	return (
		<div
			className="desktop-login-tool-node-wrap"
			style={{ left: `${node.x}%`, top: `${node.y}%` }}
			title={node.name}
		>
			<div className={`desktop-login-tool-node ${roleClass}`}>
				<Icon className="desktop-login-tool-node-icon" />
			</div>
			<span
				className={
					role
						? "desktop-login-tool-node-label desktop-login-tool-node-label-visible"
						: "desktop-login-tool-node-label"
				}
			>
				{node.name}
			</span>
		</div>
	)
}

function MemoryChip() {
	return (
		<div className="desktop-login-memory-chip">
			<div className="desktop-login-memory-chip-lines" aria-hidden>
				<span />
				<span />
				<span />
			</div>
		</div>
	)
}

function CodeMark({ className }: { className?: string }) {
	return <span className={`${className ?? ""} text-[#ff9a63]`}>CC</span>
}

function CodexMark({ className }: { className?: string }) {
	return <span className={`${className ?? ""} text-[#d7e6ff]`}>CX</span>
}

function OpenCodeMark({ className }: { className?: string }) {
	return <span className={`${className ?? ""} text-[#b8c4d8]`}>OC</span>
}

function HermesMark({ className }: { className?: string }) {
	return <span className={`${className ?? ""} text-[#8ccfff]`}>HM</span>
}

function OpenClawMark({ className }: { className?: string }) {
	return <span className={`${className ?? ""} text-[#8af0d8]`}>OP</span>
}

function GoogleIcon() {
	return (
		<svg
			className="size-5"
			fill="none"
			viewBox="0 0 24 25"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Google</title>
			<path
				d="M21.81 10.26H21V10.21H12V14.21H17.65C16.83 16.54 14.61 18.21 12 18.21C8.69 18.21 6 15.53 6 12.21C6 8.9 8.69 6.21 12 6.21C13.53 6.21 14.92 6.79 15.98 7.73L18.81 4.91C17.02 3.24 14.63 2.21 12 2.21C6.48 2.21 2 6.69 2 12.21C2 17.74 6.48 22.21 12 22.21C17.52 22.21 22 17.74 22 12.21C22 11.54 21.93 10.89 21.81 10.26Z"
				fill="#FFC107"
			/>
			<path
				d="M3.15 7.56L6.44 9.97C7.33 7.77 9.48 6.21 12 6.21C13.53 6.21 14.92 6.79 15.98 7.73L18.81 4.91C17.02 3.24 14.63 2.21 12 2.21C8.16 2.21 4.83 4.38 3.15 7.56Z"
				fill="#FF3D00"
			/>
			<path
				d="M12 22.22C14.58 22.22 16.93 21.23 18.7 19.62L15.61 17C14.57 17.79 13.3 18.22 12 18.22C9.4 18.22 7.19 16.56 6.36 14.24L3.1 16.75C4.75 19.99 8.11 22.22 12 22.22Z"
				fill="#4CAF50"
			/>
			<path
				d="M21.81 10.26H21V10.21H12V14.21H17.65C17.26 15.32 16.55 16.29 15.61 17L18.7 19.62C18.49 19.82 22 17.21 22 12.21C22 11.54 21.93 10.89 21.81 10.26Z"
				fill="#1976D2"
			/>
		</svg>
	)
}

function GithubIcon() {
	return (
		<svg
			className="size-5 text-foreground"
			fill="none"
			viewBox="0 0 26 25"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Github</title>
			<path
				clipRule="evenodd"
				d="M12.96 0.21C6.21 0.21 0.75 5.71 0.75 12.52C0.75 17.96 4.25 22.56 9.1 24.19C9.71 24.31 9.93 23.93 9.93 23.6C9.93 23.32 9.91 22.34 9.91 21.32C6.51 22.05 5.81 19.85 5.81 19.85C5.26 18.43 4.45 18.06 4.45 18.06C3.34 17.31 4.53 17.31 4.53 17.31C5.76 17.39 6.41 18.57 6.41 18.57C7.5 20.44 9.26 19.91 9.97 19.59C10.07 18.79 10.4 18.24 10.74 17.94C8.03 17.65 5.18 16.59 5.18 11.87C5.18 10.52 5.66 9.42 6.43 8.57C6.31 8.26 5.89 7 6.55 5.31C6.55 5.31 7.58 4.98 9.91 6.57C10.91 6.3 11.93 6.16 12.96 6.16C13.99 6.16 15.05 6.31 16.02 6.57C18.34 4.98 19.37 5.31 19.37 5.31C20.04 7 19.62 8.26 19.49 8.57C20.28 9.42 20.75 10.52 20.75 11.87C20.75 16.59 17.9 17.63 15.17 17.94C15.61 18.32 16 19.06 16 20.22C16 21.87 15.98 23.19 15.98 23.6C15.98 23.93 16.2 24.31 16.81 24.19C21.66 22.56 25.16 17.96 25.16 12.52C25.18 5.71 19.7 0.21 12.96 0.21Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	)
}

function ChromeLogo({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 190.5 190.5">
			<title>Chrome</title>
			<path
				fill="#fff"
				d="M95.25 142.87c26.3 0 47.63-21.32 47.63-47.63s-21.32-47.63-47.63-47.63-47.63 21.32-47.63 47.63 21.32 47.63 47.63 47.63z"
			/>
			<path
				fill="#229342"
				d="m54.01 119.07-41.24-71.43a95.23 95.23 0 0 0-.003 95.25 95.23 95.23 0 0 0 82.5 47.61l41.24-71.43a47.62 47.62 0 0 1-82.5 0z"
			/>
			<path
				fill="#fbc116"
				d="m136.5 119.07-41.24 71.43a95.23 95.23 0 0 0 82.49-47.62A95.24 95.24 0 0 0 190.5 95.25a95.24 95.24 0 0 0-12.77-47.62H95.25a47.62 47.62 0 0 1 41.25 71.44z"
			/>
			<path
				fill="#1a73e8"
				d="M95.25 132.96c20.82 0 37.7-16.88 37.7-37.71S116.08 57.55 95.25 57.55 57.55 74.43 57.55 95.25s16.88 37.71 37.7 37.71z"
			/>
			<path
				fill="#e33b2e"
				d="M95.25 47.63h82.48A95.24 95.24 0 0 0 142.87 12.76 95.23 95.23 0 0 0 95.25 0a95.22 95.22 0 0 0-82.48 47.64l41.24 71.43a47.62 47.62 0 0 1 41.24-71.44z"
			/>
		</svg>
	)
}

function RaycastMark({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 28 28" fill="none">
			<title>Raycast</title>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M7 18.08V21L0 14L1.46 12.54L7 18.08ZM9.92 21H7L14 28L15.46 26.54L9.92 21ZM26.54 15.46L28 14L14 0L12.54 1.47L18.08 7H14.73L10.86 3.15L9.4 4.61L11.81 7.01H10.13V17.88H20.99V16.2L23.4 18.6L24.86 17.14L20.99 13.27V9.93L26.54 15.46ZM7.73 6.28L6.26 7.74L7.83 9.3L9.29 7.84L7.73 6.28ZM20.16 18.71L18.7 20.17L20.27 21.74L21.73 20.28L20.16 18.71ZM4.6 9.41L3.13 10.87L7 14.74V11.81L4.6 9.41ZM16.19 21.01H13.27L17.13 24.87L18.6 23.41L16.19 21.01Z"
				fill="#FF6363"
			/>
		</svg>
	)
}

function formatError(error: unknown, fallback: string) {
	return error instanceof Error
		? error.message
		: typeof error === "string"
			? error
			: fallback
}
