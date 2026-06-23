"use client"

import { useAuth } from "@lib/auth-context"
import { useSession } from "@lib/auth"
import { Loader2, XCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { PENDING_CONNECT_URL_KEY } from "@/lib/constants"

const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

type Status = "loading" | "creating" | "success" | "error"

function isValidDesktopCallback(callback: string): boolean {
	try {
		const url = new URL(callback)
		const isLoopback =
			(url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
			url.protocol === "http:" &&
			url.pathname === "/callback" &&
			url.searchParams.has("state")
		if (isLoopback) return true

		return (
			url.protocol === "supermemory:" &&
			url.hostname === "auth-callback" &&
			url.searchParams.has("state")
		)
	} catch {
		return false
	}
}

function DesktopAuthContent() {
	const router = useRouter()
	const params = useSearchParams()
	const { data: session, isPending } = useSession()
	const { org, organizations, isRestoring } = useAuth()
	const [status, setStatus] = useState<Status>("loading")
	const [error, setError] = useState<string | null>(null)
	const hasStarted = useRef(false)

	const callback = params.get("callback")
	const desktopHostname = params.get("hostname") || "Supermemory Desktop"
	const desktopOs = params.get("os") || "desktop"
	const desktopCwd = params.get("cwd") || ""
	const desktopVersion = params.get("version") || "desktop"
	const callbackIsValid = useMemo(
		() => (callback ? isValidDesktopCallback(callback) : false),
		[callback],
	)

	const shouldRedirectToOnboarding =
		!isPending &&
		!isRestoring &&
		!!session &&
		Array.isArray(organizations) &&
		organizations.length === 0

	useEffect(() => {
		if (isPending || isRestoring) return
		if (!session) return
		if (organizations === null) return
		if (organizations.length > 0) return

		try {
			sessionStorage.setItem(PENDING_CONNECT_URL_KEY, window.location.href)
		} catch (err) {
			console.warn("Failed to store pending desktop auth URL", err)
		}
		router.replace("/onboarding")
	}, [isPending, isRestoring, session, organizations, router])

	useEffect(() => {
		if (isPending || isRestoring || shouldRedirectToOnboarding) return
		if (hasStarted.current) return

		if (!callback) {
			setStatus("error")
			setError("Missing desktop callback URL.")
			return
		}
		if (!callbackIsValid) {
			setStatus("error")
			setError("Invalid desktop callback URL.")
			return
		}
		if (!session || !org) {
			setStatus("error")
			setError("Your account is not fully set up yet.")
			return
		}

		hasStarted.current = true
		const callbackUrl = callback

		async function finishDesktopAuth() {
			try {
				setStatus("creating")
				const res = await fetch(`${API_URL}/v3/auth/agent-key`, {
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: "Supermemory Desktop",
						permission: "write",
						deviceInfo: {
							hostname: desktopHostname,
							os: desktopOs,
							cwd: desktopCwd,
							cliVersion: desktopVersion,
						},
					}),
				})

				if (!res.ok) {
					const data = (await res.json().catch(() => ({}))) as {
						message?: string
					}
					throw new Error(data.message ?? "Failed to create desktop key")
				}

				const data = (await res.json()) as { key: string }
				setStatus("success")

				const redirectUrl = new URL(callbackUrl)
				redirectUrl.searchParams.set("apikey", data.key)
				redirectUrl.searchParams.set("api_url", API_URL)
				window.location.href = redirectUrl.toString()
			} catch (err) {
				setStatus("error")
				setError(
					err instanceof Error ? err.message : "Failed to finish desktop login",
				)
			}
		}

		void finishDesktopAuth()
	}, [
		callback,
		callbackIsValid,
		desktopCwd,
		desktopHostname,
		desktopOs,
		desktopVersion,
		isPending,
		isRestoring,
		org,
		session,
		shouldRedirectToOnboarding,
	])

	if (status === "error") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="flex max-w-sm flex-col items-center gap-4 text-center">
					<XCircle className="size-10 text-red-400" />
					<div>
						<h1 className="font-semibold text-[#FAFAFA] text-lg">
							Desktop login failed
						</h1>
						<p className="mt-1 text-[#737373] text-sm">{error}</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-3">
				<Loader2 className="size-6 animate-spin text-[#4BA0FA]" />
				<p className="text-[#737373] text-sm">
					{status === "success"
						? "Returning to Supermemory Desktop..."
						: "Finishing desktop login..."}
				</p>
			</div>
		</div>
	)
}

export default function DesktopAuthPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-background">
					<Loader2 className="size-6 animate-spin text-[#4BA0FA]" />
				</div>
			}
		>
			<DesktopAuthContent />
		</Suspense>
	)
}
