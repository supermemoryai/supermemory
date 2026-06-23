"use client"

import { invoke } from "@tauri-apps/api/core"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card"
import { Button } from "@ui/components/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { clearSession, getSession, type AuthSession } from "@/lib/auth"
import {
	getSpotlightShortcut,
	setSpotlightShortcut,
	type SpotlightShortcut,
} from "@/lib/spotlight"

type AppInfo = {
	name: string
	version: string
	platform: string
}

export default function SettingsPage() {
	const router = useRouter()
	const [info, setInfo] = useState<AppInfo | null>(null)
	const [session, setSession] = useState<AuthSession | null>(null)
	const [shortcut, setShortcut] = useState<SpotlightShortcut | null>(null)
	const [shortcutError, setShortcutError] = useState<string | null>(null)
	const [savingShortcut, setSavingShortcut] = useState<string | null>(null)

	useEffect(() => {
		invoke<AppInfo>("app_info")
			.then(setInfo)
			.catch(() => setInfo(null))
		getSession()
			.then(setSession)
			.catch(() => setSession(null))
		getSpotlightShortcut()
			.then(setShortcut)
			.catch(() => setShortcut(null))
	}, [])

	async function signOut() {
		await clearSession()
		router.replace("/login")
	}

	async function updateShortcut(accelerator: string) {
		setShortcutError(null)
		setSavingShortcut(accelerator)
		try {
			setShortcut(await setSpotlightShortcut(accelerator))
		} catch (err) {
			setShortcutError(
				err instanceof Error
					? err.message
					: typeof err === "string"
						? err
						: "Could not update shortcut",
			)
		} finally {
			setSavingShortcut(null)
		}
	}

	return (
		<div className="mx-auto w-full max-w-2xl p-8">
			<h1 className="mb-6 font-semibold text-2xl">Settings</h1>

			<Card className="mb-4">
				<CardHeader>
					<CardTitle className="text-base">Account</CardTitle>
					<CardDescription>
						Keychain-backed desktop session for API requests.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<Row
						label="User"
						value={session?.email ?? session?.userId ?? "..."}
					/>
					<Row label="API" value={session?.apiUrl ?? "..."} />
					<Button variant="outline" onClick={signOut}>
						Sign out
					</Button>
				</CardContent>
			</Card>

			<Card className="mb-4">
				<CardHeader>
					<CardTitle className="text-base">Spotlight</CardTitle>
					<CardDescription>
						Global shortcut for the floating memory search window.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<Row
						label="Current"
						value={formatShortcut(shortcut?.accelerator ?? "...")}
					/>
					<div className="grid gap-2 sm:grid-cols-3">
						{SHORTCUT_OPTIONS.map((option) => {
							const selected = shortcut?.accelerator === option.accelerator
							return (
								<Button
									key={option.accelerator}
									type="button"
									variant={selected ? "default" : "outline"}
									disabled={savingShortcut !== null}
									onClick={() => updateShortcut(option.accelerator)}
								>
									{savingShortcut === option.accelerator
										? "Saving..."
										: option.label}
								</Button>
							)
						})}
					</div>
					{shortcutError ? (
						<p className="text-destructive text-sm">{shortcutError}</p>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">About</CardTitle>
					<CardDescription>
						Native runtime details, read from the Rust core over IPC.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<Row label="App" value={info?.name ?? "…"} />
					<Row label="Version" value={info?.version ?? "…"} />
					<Row label="Platform" value={info?.platform ?? "…"} />
				</CardContent>
			</Card>

			<p className="mt-6 text-muted-foreground text-sm">
				Not signed in?{" "}
				<Link
					href="/login"
					className="text-primary underline-offset-4 hover:underline"
				>
					Go to login
				</Link>
			</p>
		</div>
	)
}

const SHORTCUT_OPTIONS = [
	{ label: "⌘ ⇧ M", accelerator: "CommandOrControl+Shift+M" },
	{ label: "⌘ ⇧ Space", accelerator: "CommandOrControl+Shift+Space" },
	{ label: "⌘ ⌥ M", accelerator: "CommandOrControl+Option+M" },
] as const

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium tabular-nums">{value}</span>
		</div>
	)
}

function formatShortcut(value: string) {
	return value
		.replace("CommandOrControl", "⌘")
		.replace("Command", "⌘")
		.replace("Control", "⌃")
		.replace("Option", "⌥")
		.replace("Alt", "⌥")
		.replace("Shift", "⇧")
		.replaceAll("+", " ")
}
