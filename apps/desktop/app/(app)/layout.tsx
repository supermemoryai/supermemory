import type { ReactNode } from "react"
import { AppNav } from "@/components/app-nav"
import { AuthGuard } from "@/components/auth-guard"
import { Titlebar } from "@/components/titlebar"

// Shell for the authenticated app (dashboard, settings). The login/ and
// spotlight/ routes live OUTSIDE this group, so they don't inherit the nav +
// guard chrome.
export default function AppLayout({ children }: { children: ReactNode }) {
	return (
		<AuthGuard>
			<div className="desktop-shell flex h-screen flex-col overflow-hidden">
				<Titlebar />
				<AppNav />
				<main className="relative z-10 min-h-0 flex-1 overflow-auto">
					{children}
				</main>
			</div>
		</AuthGuard>
	)
}
