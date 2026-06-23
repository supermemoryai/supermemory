"use client"

import { signIn, useSession } from "@lib/auth"
import { usePostHog } from "@lib/posthog"
import { TextSeparator } from "@ui/components/text-separator"
import { ExternalAuthButton } from "@ui/button/external-auth"
import { Button } from "@ui/components/button"
import { Badge } from "@ui/components/badge"
import { LabeledInput } from "@ui/input/labeled-input"
import { HeadingH3Medium } from "@ui/text/heading/heading-h3-medium"
import { Label1Regular } from "@ui/text/label/label-1-regular"
import { Title1Bold } from "@ui/text/title/title-1-bold"
import { InitialHeader } from "@/components/initial-header"
import { LoginToolsPanel } from "@/components/login-tools-panel"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { Logo } from "@ui/assets/Logo"
import { resolveAuthRedirectUrl } from "@/lib/url-helpers"
import { Loader2 } from "lucide-react"

function isMcpOAuthAuthorizeContext(sp: Pick<URLSearchParams, "get">): boolean {
	return sp.get("response_type") === "code" && Boolean(sp.get("client_id"))
}

function buildMcpAuthorizeResumeUrl(
	sp: Pick<URLSearchParams, "toString">,
): string {
	const backend =
		process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
	const p = new URLSearchParams(sp.toString())
	p.delete("redirect")
	p.delete("error")
	p.delete("exp")
	p.delete("sig")

	const prompt = p
		.get("prompt")
		?.split(" ")
		.filter((value) => value && value !== "login")
	if (prompt?.length) {
		p.set("prompt", prompt.join(" "))
	} else {
		p.delete("prompt")
	}

	return `${backend}/api/auth/oauth2/authorize?${p.toString()}`
}

function LoginHeadline({ className }: { className?: string }) {
	return (
		<div className={cn("max-w-sm text-center", className)}>
			<h1 className="text-balance text-lg font-medium leading-tight tracking-tight sm:text-xl lg:text-[1.375rem] xl:text-2xl">
				Never forget anything, anywhere
				<span className="block text-brand-accent">with supermemory</span>
			</h1>
			<p
				className={cn(
					"mt-1.5 text-xs leading-snug text-muted-foreground/50 lg:mt-2",
					dmSansClassName(),
				)}
			>
				Save from Chrome, Notion, X — search it all in one place.
			</p>
		</div>
	)
}

function LastUsedBadge({ show }: { show: boolean }) {
	if (!show) return null
	return (
		<div className="mb-1 flex justify-end">
			<Badge variant="default" className="h-5 px-1.5 text-[10px]">
				Last used
			</Badge>
		</div>
	)
}
function LoginCard({ children }: { children: React.ReactNode }) {
	return (
		<motion.div
			className="flex w-full max-w-[400px] shrink-0 flex-col items-center gap-2 rounded-[22px] py-5 px-5 sm:w-auto sm:max-w-none sm:items-start sm:py-8 sm:px-11 bg-linear-to-b from-[#06101F] to-[#030912] shadow-[1.5px_1.5px_20px_0_rgba(0,0,0,0.65),1px_1.5px_2px_0_rgba(128,189,255,0.07)_inset,-0.5px_-1.5px_4px_0_rgba(0,35,73,0.40)_inset]"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.75, ease: "easeOut" }}
		>
			{children}
		</motion.div>
	)
}

function LoginCardBody({
	children,
	loadingMessage,
}: {
	children: React.ReactNode
	loadingMessage?: string | null
}) {
	return (
		<div className="relative w-full max-w-[360px] sm:w-[360px]">
			<div className={loadingMessage ? "invisible" : undefined}>{children}</div>
			{loadingMessage ? (
				<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[14px] bg-[#030912]/90 backdrop-blur-sm">
					<Loader2 className="size-6 animate-spin text-muted-foreground" />
					<p className="text-sm text-muted-foreground">{loadingMessage}</p>
				</div>
			) : null}
		</div>
	)
}

export default function LoginPage() {
	const [email, setEmail] = useState("")
	const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [isLoadingEmail, setIsLoadingEmail] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastUsedMethod, setLastUsedMethod] = useState<string | null>(null)
	const router = useRouter()

	const posthog = usePostHog()

	const params = useSearchParams()
	const { data: sessionData, isPending: sessionPending } = useSession()

	const oauthQueryForResume = params.toString()
	const desktopAuthState = params.get("desktop-auth")
		? params.get("state")
		: null
	const isRedirecting = !sessionPending && Boolean(sessionData?.session)
	const isAuthResolving = sessionPending || isRedirecting
	const loadingMessage = isAuthResolving
		? sessionPending
			? "Checking session…"
			: "Redirecting…"
		: isLoading
			? isLoadingEmail
				? "Sending login link…"
				: "Redirecting…"
			: null

	useEffect(() => {
		if (sessionPending) return
		if (!sessionData?.session) return
		const sp = new URLSearchParams(oauthQueryForResume)
		if (isMcpOAuthAuthorizeContext(sp)) {
			window.location.assign(buildMcpAuthorizeResumeUrl(sp))
			return
		}
		const redirectUrl = params.get("redirect")
		if (redirectUrl) {
			const dest = resolveAuthRedirectUrl(redirectUrl, window.location.origin)
			if (desktopAuthState) {
				dest.searchParams.set("desktop-auth", "1")
				dest.searchParams.set("state", desktopAuthState)
			}
			window.location.assign(dest.toString())
			return
		}
		if (desktopAuthState) {
			const dest = new URL("/", window.location.origin)
			dest.searchParams.set("desktop-auth", "1")
			dest.searchParams.set("state", desktopAuthState)
			window.location.assign(dest.toString())
			return
		}
		// Carry the flag so the dashboard posts the session token to the extension (else: sign-in loop).
		const dest = new URL("/", window.location.origin)
		dest.searchParams.set("extension-auth-success", "true")
		window.location.assign(dest.toString())
	}, [
		sessionPending,
		sessionData?.session,
		oauthQueryForResume,
		params,
		desktopAuthState,
	])

	// Get redirect URL from query params
	const redirectUrl = params.get("redirect")

	// Create callback URL that includes redirect parameter if provided
	const getCallbackURL = () => {
		const origin = window.location.origin

		if (isMcpOAuthAuthorizeContext(params)) {
			return buildMcpAuthorizeResumeUrl(params)
		}

		const finalUrl = resolveAuthRedirectUrl(redirectUrl, origin)

		if (desktopAuthState) {
			finalUrl.searchParams.set("desktop-auth", "1")
			finalUrl.searchParams.set("state", desktopAuthState)
		} else {
			finalUrl.searchParams.set("extension-auth-success", "true")
		}
		return finalUrl.toString()
	}

	// Load last used method from localStorage on mount
	useEffect(() => {
		const savedMethod = localStorage.getItem("supermemory-last-login-method")
		setLastUsedMethod(savedMethod)
	}, [])

	// Record the pending login method (will be committed after successful auth)
	function setPendingLoginMethod(method: string) {
		try {
			localStorage.setItem("supermemory-pending-login-method", method)
			localStorage.setItem(
				"supermemory-pending-login-timestamp",
				String(Date.now()),
			)
		} catch {}
	}

	function isNetworkError(error: unknown): boolean {
		if (!(error instanceof Error)) return false
		const message = error.message.toLowerCase()
		return (
			message.includes("load failed") ||
			message.includes("networkerror") ||
			message.includes("failed to fetch") ||
			message.includes("network request failed")
		)
	}

	function getErrorMessage(error: unknown): string {
		if (isNetworkError(error)) {
			return "Network error. Please check your connection and try again."
		}
		if (error instanceof Error) {
			return error.message
		}
		return "An unexpected error occurred. Please try again."
	}

	// If we land back on this page with an error, clear any pending marker
	useEffect(() => {
		if (params.get("error")) {
			try {
				localStorage.removeItem("supermemory-pending-login-method")
				localStorage.removeItem("supermemory-pending-login-timestamp")
			} catch {}
		}
	}, [params])

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		setIsLoading(true)
		setIsLoadingEmail(true)
		setError(null)

		// Track login attempt
		posthog.capture("login_attempt", {
			method: "magic_link",
			email_domain: email.split("@")[1] || "unknown",
		})

		const { error } = await signIn.magicLink({
			callbackURL: getCallbackURL(),
			email,
		})

		if (error) {
			console.error(error)

			// Track login failure
			posthog.capture("login_failed", {
				method: "magic_link",
				error: error instanceof Error ? error.message : "Unknown error",
				email_domain: email.split("@")[1] || "unknown",
				is_network_error: isNetworkError(error),
			})

			setError(getErrorMessage(error))
			setIsLoading(false)
			setIsLoadingEmail(false)
			return
		}

		setSubmittedEmail(email)
		setPendingLoginMethod("magic_link")
		posthog.capture("login_magic_link_sent", {
			email_domain: email.split("@")[1] || "unknown",
		})

		setIsLoading(false)
		setIsLoadingEmail(false)
	}

	const handleSubmitToken = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setIsLoading(true)

		const formData = new FormData(event.currentTarget)
		const token = formData.get("token") as string
		const callbackURL = getCallbackURL()
		router.push(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/magic-link/verify?token=${token}&callbackURL=${encodeURIComponent(callbackURL)}`,
		)
	}

	return (
		<main className="login-page-grid relative bg-[#030912]">
			<div className="login-page-mobile-bg" aria-hidden>
				<div className="login-panel-orb h-full" />
				<div className="login-panel-orb-image h-full" />
			</div>
			<div className="relative z-20 lg:hidden">
				<InitialHeader />
			</div>
			<LoginToolsPanel />
			<div className="relative z-10 flex min-h-0 min-w-0 flex-col lg:col-start-2 lg:row-start-1 lg:h-full">
				<div className="hidden lg:block">
					<InitialHeader />
				</div>
				<section className="flex min-h-0 flex-1 flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 lg:justify-center lg:px-10 lg:py-10">
					<div className="mt-auto flex w-full flex-col items-center lg:mt-0">
						<LoginHeadline className="mb-3 sm:mb-4 lg:mb-8" />
						<LoginCard>
							<LoginCardBody loadingMessage={loadingMessage}>
								{submittedEmail ? (
									<div className="flex flex-col gap-4 lg:gap-6">
										<div className="flex flex-col gap-2 text-center lg:text-left">
											<Title1Bold className="text-foreground">
												Almost there!
											</Title1Bold>
											<HeadingH3Medium className="text-muted-foreground">
												Click the magic link we've sent to{" "}
												<span className="text-foreground">
													{submittedEmail}
												</span>
												.
											</HeadingH3Medium>
										</div>

										<TextSeparator
											text="OR"
											className={cn(dmSansClassName())}
										/>

										<form
											className="flex flex-col gap-4 lg:gap-6"
											onSubmit={handleSubmitToken}
										>
											<LabeledInput
												inputPlaceholder="your temporary login code"
												inputProps={{
													name: "token",
													required: true,
													disabled: isLoading,
													"aria-invalid": error ? "true" : "false",
												}}
												inputType="text"
												label="Enter code"
											/>

											<Button
												disabled={isLoading}
												id="verify-token"
												type="submit"
											>
												Verify Token
											</Button>
										</form>
									</div>
								) : (
									<div className="flex flex-col" style={{ gap: "12px" }}>
										{params.get("error") && (
											<div className="text-red-500">
												Error: {params.get("error")}. Please try again!
											</div>
										)}

										<div className="flex flex-col gap-3">
											{process.env.NEXT_PUBLIC_HOST_ID === "supermemory" ||
											!process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED ? (
												<div className="w-full">
													<LastUsedBadge show={lastUsedMethod === "google"} />
													<ExternalAuthButton
														authIcon={
															<svg
																className="size-4 sm:size-5"
																fill="none"
																height="25"
																viewBox="0 0 24 25"
																width="24"
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
																	d="M21.81 10.26H21V10.21H12V14.21H17.65C17.26 15.32 16.55 16.29 15.61 17L15.61 17L18.7 19.62C18.49 19.82 22 17.21 22 12.21C22 11.54 21.93 10.89 21.81 10.26Z"
																	fill="#1976D2"
																/>
															</svg>
														}
														authProvider="Google"
														className="w-full"
														disabled={Boolean(loadingMessage)}
														onClick={() => {
															if (loadingMessage) return
															setIsLoading(true)
															posthog.capture("login_attempt", {
																method: "social",
																provider: "google",
															})
															setPendingLoginMethod("google")
															signIn
																.social({
																	callbackURL: getCallbackURL(),
																	provider: "google",
																})
																.catch((err: unknown) => {
																	setError(getErrorMessage(err))
																	setIsLoading(false)
																})
														}}
													/>
												</div>
											) : null}
											{process.env.NEXT_PUBLIC_HOST_ID === "supermemory" ||
											!process.env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED ? (
												<div className="w-full">
													<LastUsedBadge show={lastUsedMethod === "github"} />
													<ExternalAuthButton
														authIcon={
															<svg
																className="size-4 sm:size-5 text-foreground"
																fill="none"
																height="25"
																viewBox="0 0 26 25"
																width="26"
																xmlns="http://www.w3.org/2000/svg"
															>
																<title>Github</title>
																<g clipPath="url(#clip0_2579_3356)">
																	<path
																		clipRule="evenodd"
																		d="M12.96 0.21C6.21 0.21 0.75 5.71 0.75 12.52C0.75 17.96 4.25 22.56 9.1 24.19C9.71 24.31 9.93 23.93 9.93 23.6C9.93 23.32 9.91 22.34 9.91 21.32C6.51 22.05 5.81 19.85 5.81 19.85C5.26 18.43 4.45 18.06 4.45 18.06C3.34 17.31 4.53 17.31 4.53 17.31C5.76 17.39 6.41 18.57 6.41 18.57C7.5 20.44 9.26 19.91 9.97 19.59C10.07 18.79 10.4 18.24 10.74 17.94C8.03 17.65 5.18 16.59 5.18 11.87C5.18 10.52 5.66 9.42 6.43 8.57C6.31 8.26 5.89 7 6.55 5.31C6.55 5.31 7.58 4.98 9.91 6.57C10.91 6.3 11.93 6.16 12.96 6.16C13.99 6.16 15.05 6.31 16.02 6.57C18.34 4.98 19.37 5.31 19.37 5.31C20.04 7 19.62 8.26 19.49 8.57C20.28 9.42 20.75 10.52 20.75 11.87C20.75 16.59 17.9 17.63 15.17 17.94C15.61 18.32 16 19.06 16 20.22C16 21.87 15.98 23.19 15.98 23.6C15.98 23.93 16.2 24.31 16.81 24.19C21.66 22.56 25.16 17.96 25.16 12.52C25.18 5.71 19.7 0.21 12.96 0.21Z"
																		fill="currentColor"
																		fillRule="evenodd"
																	/>
																</g>
																<defs>
																	<clipPath id="clip0_2579_3356">
																		<rect
																			fill="currentColor"
																			height="24"
																			transform="translate(0.75 0.21)"
																			width="24.5"
																		/>
																	</clipPath>
																</defs>
															</svg>
														}
														authProvider="Github"
														className="w-full"
														disabled={Boolean(loadingMessage)}
														onClick={() => {
															if (loadingMessage) return
															setIsLoading(true)
															posthog.capture("login_attempt", {
																method: "social",
																provider: "github",
															})
															setPendingLoginMethod("github")
															signIn
																.social({
																	callbackURL: getCallbackURL(),
																	provider: "github",
																})
																.catch((err: unknown) => {
																	setError(getErrorMessage(err))
																	setIsLoading(false)
																})
														}}
													/>
												</div>
											) : null}
										</div>

										<TextSeparator
											text="OR"
											className={cn(dmSansClassName())}
										/>

										<div className="flex flex-col gap-6">
											<form
												onSubmit={handleSubmit}
												className="flex flex-col gap-6"
											>
												<LabeledInput
													error={error}
													inputPlaceholder="your@email.com"
													inputProps={{
														"aria-invalid": error ? "true" : "false",
														disabled: Boolean(loadingMessage),
														id: "email",
														onChange: (
															e: React.ChangeEvent<HTMLInputElement>,
														) => {
															setEmail(e.target.value)
															error && setError(null)
														},
														required: true,
														value: email,
													}}
													inputType="email"
												/>

												<div className="w-full">
													<LastUsedBadge
														show={lastUsedMethod === "magic_link"}
													/>
													<Button
														className="flex justify-center items-center w-full h-[44px] relative gap-3 p-2 rounded-xl"
														style={{
															background:
																"linear-gradient(182.37deg, #0ff0d2 -91.53%, #5bd3fb -67.8%, #1e0ff0 95.17%)",
															boxShadow:
																"1px 1px 2px 0px #1A88FF inset, 0 2px 10px 0 rgba(5, 1, 0, 0.20)",
														}}
														disabled={Boolean(loadingMessage)}
														type="submit"
													>
														<Logo className="size-4" />
														Log in with Supermemory
													</Button>
												</div>
											</form>

											<Label1Regular
												className={cn(
													"text-center text-xs! text-[#737373B2]",
													dmSansClassName(),
												)}
											>
												By continuing, you agree to our{" "}
												<span className="inline-block">
													<a
														className="underline"
														href="https://supermemory.ai/terms/"
													>
														Terms
													</a>{" "}
													and{" "}
													<a
														className="underline"
														href="https://supermemory.ai/privacy/"
													>
														Privacy Policy
													</a>
													.
												</span>
											</Label1Regular>
										</div>
									</div>
								)}
							</LoginCardBody>
						</LoginCard>
					</div>
				</section>
			</div>
		</main>
	)
}
