"use client"

import { EnsureWorkspace } from "@/components/ensure-workspace"
import { MobileBanner } from "@/components/mobile-banner"
import { NextAppResearchCta } from "@/components/next-app-research-cta"

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<MobileBanner />
			<EnsureWorkspace>{children}</EnsureWorkspace>
			<NextAppResearchCta />
		</>
	)
}
