"use client"

import { Button } from "@ui/components/button"
import { useRouter } from "next/navigation"

// Phase 1 stub. Phase 3 wires "Sign in" to the system-browser OAuth flow
// (invoke('auth_begin_oauth')) + the session-token deep-link handoff.
export default function LoginPage() {
	const router = useRouter()

	return (
		<div className="flex h-screen flex-col">
			{/* Keep the frameless window draggable from the top edge. */}
			<div data-tauri-drag-region className="h-10 shrink-0" />
			<div className="flex flex-1 items-center justify-center p-8">
				<div className="w-full max-w-sm text-center">
					<h1 className="font-semibold text-2xl">Supermemory</h1>
					<p className="mt-2 text-muted-foreground text-sm">
						Sign in to access your memories.
					</p>
					<Button className="mt-6 w-full" onClick={() => router.replace("/")}>
						Sign in with browser
					</Button>
					<p className="mt-3 text-muted-foreground text-xs">
						Browser-based sign-in arrives in a later phase.
					</p>
				</div>
			</div>
		</div>
	)
}
