"use client"

import { EnsureWorkspace } from "@/components/ensure-workspace"
import { NextAppResearchCta } from "@/components/next-app-research-cta"

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<EnsureWorkspace>{children}</EnsureWorkspace>
			<NextAppResearchCta />
		</>
	)
}
