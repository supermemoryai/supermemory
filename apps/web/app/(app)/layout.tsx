"use client"

import { MobileBanner } from "@/components/mobile-banner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<MobileBanner />
			{children}
		</>
	)
}
