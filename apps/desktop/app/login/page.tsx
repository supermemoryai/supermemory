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
import { type FormEvent, useEffect, useState } from "react"
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
		<main className="grid h-screen min-h-screen overflow-hidden bg-[#030912] text-foreground lg:grid-cols-[65%_35%]">
			<DesktopLoginToolsPanel />

			<section className="relative z-10 flex min-h-0 min-w-0 flex-col">
				<header
					data-tauri-drag-region
					className="flex h-[86px] shrink-0 items-center justify-between px-6"
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
						className="h-11 rounded-2xl px-4 text-base text-white"
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

				<div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-10">
					<div className="w-full max-w-[390px]">
						<div className="mb-8 text-center">
							<h1 className="text-balance font-medium text-[28px] leading-tight text-[#f7f9fc]">
								Never forget anything, anywhere
								<span className="block text-[#4BA0FA]">with supermemory</span>
							</h1>
							<p className="mt-4 text-muted-foreground/50 text-sm">
								Save from Chrome, Notion, X - search it all in one place.
							</p>
						</div>

						<div className="relative rounded-[22px] bg-linear-to-b from-[#06101F] to-[#030912] px-8 py-8 shadow-[1.5px_1.5px_20px_0_rgba(0,0,0,0.65),1px_1.5px_2px_0_rgba(128,189,255,0.07)_inset,-0.5px_-1.5px_4px_0_rgba(0,35,73,0.40)_inset]">
							<div className={isBrowserAuthPending ? "invisible" : undefined}>
								<div className="mb-2 flex justify-end">
									<Badge className="h-5 rounded-md px-2 text-[10px]">
										Last used
									</Badge>
								</div>

								<div className="flex flex-col gap-3">
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
										className="flex flex-col gap-6"
										onSubmit={onBrowserAuthSubmit}
									>
										<Input
											value={email}
											onChange={(event) => setEmail(event.target.value)}
											placeholder="your@email.com"
											type="email"
											autoComplete="email"
											className="h-14 rounded-xl border-[#17202e] bg-[#040a14]/70 px-6 text-base text-foreground placeholder:text-muted-foreground/45"
										/>

										<Button
											type="submit"
											className="h-14 rounded-xl bg-linear-to-r from-[#2935ff] to-[#2f78ff] text-lg text-white hover:from-[#3440ff] hover:to-[#3b83ff]"
											disabled={isAuthBusy}
										>
											<Logo className="size-5" />
											Log in with Supermemory
										</Button>
									</form>

									<p className="text-center text-muted-foreground/50 text-sm">
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
										Redirecting...
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

function DesktopLoginToolsPanel() {
	return (
		<aside className="relative hidden min-h-0 overflow-hidden border-white/[0.06] border-r lg:block">
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 130% 100% at 50% 45%, rgba(70,155,255,0.26) 0%, rgba(35,100,210,0.15) 38%, rgba(8,22,45,0.58) 68%, #030912 100%), radial-gradient(ellipse 90% 70% at 50% 100%, rgba(50,130,240,0.18) 0%, transparent 65%)",
				}}
			/>
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(85,150,255,0.22),transparent_24%),radial-gradient(circle_at_48%_52%,rgba(255,255,255,0.18),transparent_8%)] opacity-80" />
			<div className="absolute inset-0 bg-linear-to-b from-[#071024]/20 via-transparent to-[#030912]/35" />

			<div className="relative z-10 h-full">
				<FloatingToolNode x={14} y={22} label="Chrome">
					<ChromeLogo className="size-5" />
				</FloatingToolNode>
				<FloatingToolNode x={84} y={18} label="Notion">
					<Notion className="size-5" />
				</FloatingToolNode>
				<FloatingToolNode x={11} y={53} label="Google Drive">
					<GoogleDrive className="size-5" />
				</FloatingToolNode>
				<FloatingToolNode x={88} y={45} label="Claude">
					<ClaudeDesktopIcon className="size-5" />
				</FloatingToolNode>
				<FloatingToolNode x={22} y={84} label="MCP">
					<MCPIcon className="size-5" />
				</FloatingToolNode>
				<FloatingToolNode x={68} y={70} label="Raycast">
					<RaycastMark className="size-5" />
				</FloatingToolNode>
				<FloatingToolNode x={20} y={38} label="Code">
					<span className="font-semibold text-[#ff9a63] text-lg">▦</span>
				</FloatingToolNode>
				<FloatingToolNode x={58} y={14} label="OpenCode">
					<span className="font-semibold text-[#b8c4d8] text-sm">□</span>
				</FloatingToolNode>

				<div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2">
					<div className="relative flex size-36 items-center justify-center rounded-full bg-[radial-gradient(circle_at_68%_34%,rgba(145,230,255,0.9),rgba(48,81,255,0.92)_44%,rgba(14,29,90,0.84)_72%,transparent_73%)] shadow-[0_0_54px_rgba(65,135,255,0.6),inset_12px_16px_24px_rgba(255,255,255,0.13)] blur-[1px]">
						<div className="absolute inset-4 rounded-full bg-[#244cff]/50 blur-xl" />
						<Logo className="relative z-10 size-8 opacity-85" />
					</div>
				</div>

				<p className="-translate-x-1/2 absolute bottom-8 left-1/2 whitespace-nowrap text-center text-sm text-white/45">
					One memory layer - context from any tool, everywhere you need it.
				</p>
			</div>
		</aside>
	)
}

function FloatingToolNode({
	x,
	y,
	label,
	children,
}: {
	x: number
	y: number
	label: string
	children: React.ReactNode
}) {
	return (
		<div
			className="-translate-x-1/2 -translate-y-1/2 absolute z-10"
			style={{ left: `${x}%`, top: `${y}%` }}
			title={label}
		>
			<div className="flex size-12 items-center justify-center rounded-xl border border-white/12 bg-[#0c1628]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_6px_20px_rgba(0,0,0,0.22)] backdrop-blur-md">
				{children}
			</div>
		</div>
	)
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
