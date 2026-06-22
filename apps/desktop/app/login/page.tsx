"use client"

import { Button } from "@ui/components/button"
import { Input } from "@ui/components/input"
import { Label } from "@ui/components/label"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { desktopDevAuthEnabled, storeToken } from "@/lib/auth"

export default function LoginPage() {
	const router = useRouter()
	const [token, setToken] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)
		setIsSubmitting(true)

		try {
			await storeToken(token)
			router.replace("/")
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not sign in")
		} finally {
			setIsSubmitting(false)
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
					<Button className="mt-6 w-full" disabled>
						Sign in with browser
					</Button>
					<p className="mt-3 text-muted-foreground text-xs">
						Browser-based sign-in arrives in a later phase.
					</p>
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
							{error ? (
								<p className="text-destructive text-sm">{error}</p>
							) : null}
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
