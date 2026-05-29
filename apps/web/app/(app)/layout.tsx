"use client"

import { EnsureWorkspace } from "@/components/ensure-workspace"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<EnsureWorkspace>{children}</EnsureWorkspace>
			<PWAInstallPrompt />
		</>
	)
}
