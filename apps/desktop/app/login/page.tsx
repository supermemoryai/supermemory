"use client"

import { Logo, LogoFull } from "@ui/assets/Logo"
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
		<div className="flex min-h-screen flex-col overflow-hidden bg-[#030912] text-foreground">
			<header
				data-tauri-drag-region
				className="flex h-24 shrink-0 items-center justify-between px-8"
			>
				<LogoFull className="h-8 w-[270px] max-w-[46vw] text-white" />
				<Button
					asChild
					variant="newDefault"
					className="h-14 rounded-[24px] px-7 text-xl text-white"
				>
					<a
						href="https://supermemory.ai/docs"
						target="_blank"
						rel="noreferrer"
					>
						Memory API ↗
					</a>
				</Button>
			</header>

			<main className="flex flex-1 flex-col items-center justify-center gap-8 px-8 pb-10">
				<section className="max-w-[720px] text-center">
					<h1 className="text-balance font-medium text-[40px] leading-tight text-[#f7f9fc]">
						Never forget anything, anywhere
						<span className="block text-[#4BA0FA]">with supermemory</span>
					</h1>
					<p className="mt-4 text-muted-foreground/50 text-xl">
						Save from Chrome, Notion, X - search it all in one place.
					</p>
				</section>

				<section className="flex w-full max-w-[700px] flex-col items-center rounded-[32px] bg-linear-to-b from-[#06101F] to-[#030912] px-16 py-12 shadow-[1.5px_1.5px_20px_0_rgba(0,0,0,0.65),1px_1.5px_2px_0_rgba(128,189,255,0.07)_inset,-0.5px_-1.5px_4px_0_rgba(0,35,73,0.40)_inset]">
					<div className="relative w-full max-w-[560px]">
						<div className={isBrowserAuthPending ? "invisible" : undefined}>
							<div className="mb-2 flex justify-end">
								<Badge className="h-8 rounded-[10px] px-4 text-base">
									Last used
								</Badge>
							</div>

							<div className="flex flex-col gap-5">
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
										className="h-[68px] rounded-[18px] border-[#17202e] bg-[#040a14]/70 px-8 text-[22px] text-foreground placeholder:text-muted-foreground/45"
									/>

									<Button
										type="submit"
										className="h-[70px] rounded-[18px] bg-linear-to-r from-[#2935ff] to-[#2f78ff] text-[22px] text-white hover:from-[#3440ff] hover:to-[#3b83ff]"
										disabled={isAuthBusy}
									>
										<Logo className="size-7" />
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
									<form className="space-y-3 text-left" onSubmit={onSubmit}>
										<div className="space-y-2">
											<Label htmlFor="api-key">Development API key</Label>
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
								) : null}
							</div>
						</div>

						{isBrowserAuthPending ? (
							<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[14px] bg-[#030912]/90 backdrop-blur-sm">
								<Loader2 className="size-6 animate-spin text-muted-foreground" />
								<p className="text-muted-foreground text-sm">Redirecting...</p>
							</div>
						) : null}
					</div>
				</section>
			</main>
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

function formatError(error: unknown, fallback: string) {
	return error instanceof Error
		? error.message
		: typeof error === "string"
			? error
			: fallback
}
