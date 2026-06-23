"use client"

import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { Label } from "@ui/components/label"
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
			setError(
				err instanceof Error
					? err.message
					: typeof err === "string"
						? err
						: "Could not sign in",
			)
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

	return (
		<div className="flex h-screen flex-col">
			{/* Keep the frameless window draggable from the top edge. */}
			<div data-tauri-drag-region className="h-10 shrink-0" />
			<div className="flex flex-1 items-center justify-center p-8">
				<div className="w-full max-w-sm">
					<h1 className="font-semibold text-2xl">Supermemory</h1>
					<p className="mt-2 text-muted-foreground text-sm">
						Sign in to access your memories.
					</p>
					<Button
						type="button"
						className="mt-6 w-full"
						disabled={isBrowserAuthPending || isSubmitting}
						onClick={startBrowserAuth}
					>
						{isBrowserAuthPending
							? "Waiting for browser..."
							: "Sign in with browser"}
					</Button>
					<p className="mt-3 text-muted-foreground text-xs">
						We'll open Supermemory in your browser and return here after
						sign-in.
					</p>
					{error ? (
						<p className="mt-4 text-destructive text-sm">{error}</p>
					) : null}
					{desktopDevAuthEnabled ? (
						<form className="mt-6 space-y-3 text-left" onSubmit={onSubmit}>
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
		</div>
	)
}

function formatError(error: unknown, fallback: string) {
	return error instanceof Error
		? error.message
		: typeof error === "string"
			? error
			: fallback
}
