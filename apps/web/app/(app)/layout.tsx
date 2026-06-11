"use client"

import { EnsureWorkspace } from "@/components/ensure-workspace"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { SettingsModalProvider } from "@/components/settings/settings-modal"

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<SettingsModalProvider>
			<EnsureWorkspace>{children}</EnsureWorkspace>
			<PWAInstallPrompt />
		</SettingsModalProvider>
	)
}
