"use client"

import { useIsMobile } from "@hooks/use-mobile"
import { cn } from "@lib/utils"

export function MobileBanner() {
	const isMobile = useIsMobile()

	if (!isMobile) {
		return null
	}

	return (
		<div
			className={cn(
				"bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-900/30",
				"px-4 py-2 text-xs text-yellow-800 dark:text-yellow-200 text-center",
			)}
			id="mobile-development-banner"
		>
			🚧 Mobile responsive in development. Desktop recommended.
		</div>
	)
}
