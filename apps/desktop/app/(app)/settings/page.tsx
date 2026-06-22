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

type AppInfo = {
	name: string
	version: string
	platform: string
}

export default function SettingsPage() {
	const router = useRouter()
	const [info, setInfo] = useState<AppInfo | null>(null)
	const [session, setSession] = useState<AuthSession | null>(null)

	useEffect(() => {
		invoke<AppInfo>("app_info")
			.then(setInfo)
			.catch(() => setInfo(null))
		getSession()
			.then(setSession)
			.catch(() => setSession(null))
	}, [])

	async function signOut() {
		await clearSession()
		router.replace("/login")
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

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium tabular-nums">{value}</span>
		</div>
	)
}
