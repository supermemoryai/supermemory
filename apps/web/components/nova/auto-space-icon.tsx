"use client"

import { Shuffle } from "lucide-react"
import NovaOrb from "./nova-orb"
import { cn } from "@lib/utils"

/** Nova orb with a corner badge — Auto mode (Nova picks across spaces). */
export function AutoSpaceIcon({
	size = 20,
	className,
}: {
	size?: number
	className?: string
}) {
	const badgeSize = Math.max(10, Math.round(size * 0.5))
	const badgeIcon = Math.max(6, Math.round(badgeSize * 0.55))

	return (
		<span
			className={cn("relative shrink-0", className)}
			style={{ width: size, height: size }}
			aria-hidden
		>
			<NovaOrb size={size} className="blur-[0.45px]!" />
			<span
				className="absolute -bottom-px -right-px flex items-center justify-center rounded-full bg-[#4BA0FA] text-[#041127] ring-1 ring-[#14161A]"
				style={{ width: badgeSize, height: badgeSize }}
			>
				<Shuffle
					className="shrink-0"
					style={{ width: badgeIcon, height: badgeIcon }}
					strokeWidth={2.5}
				/>
			</span>
		</span>
	)
}
