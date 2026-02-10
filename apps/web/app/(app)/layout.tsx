"use client"

import { MobileBanner } from "@/components/new/mobile-banner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<MobileBanner />
			{children}
		</>
	)
}
