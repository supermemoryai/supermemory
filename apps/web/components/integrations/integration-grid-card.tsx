"use client"

import type { ReactNode } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { ExternalLink } from "lucide-react"

export function IntegrationGridCard({
	title,
	description,
	icon,
	pro,
	statusLabel,
	statusVariant = "neutral",
	isExternal,
	onClick,
}: {
	title: string
	description: string
	icon: ReactNode
	pro?: boolean
	statusLabel?: string
	statusVariant?: "connected" | "neutral"
	isExternal?: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"bg-[#080B0F] relative rounded-xl p-4 pt-14",
				"border border-[#0D121A]",
				"hover:border-[#3374FF]/50",
				"transition-all duration-300 cursor-pointer text-left w-full",
				"hover:bg-[url('/onboarding/bg-gradient-1.png')] hover:bg-[length:200%_auto] hover:bg-[center_top_1rem] hover:bg-no-repeat",
				"group",
			)}
		>
			{pro ? (
				<span className="absolute top-3 left-3 bg-[#4BA0FA] text-[#00171A] text-[10px] font-bold tracking-[0.3px] px-1.5 py-0.5 rounded-[3px]">
					PRO
				</span>
			) : null}
			{isExternal ? (
				<ExternalLink className="absolute top-3 left-3 size-3 text-[#3A4455] opacity-0 group-hover:opacity-100 transition-opacity" />
			) : null}
			<div className="absolute top-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity">
				{icon}
			</div>
			<div className="flex-1">
				<h3 className="text-white text-sm font-medium">{title}</h3>
				<p
					className={cn(
						"text-[#8B8B8B] text-xs leading-relaxed mt-0.5",
						dmSansClassName(),
					)}
				>
					{description}
				</p>
				{statusLabel ? (
					<span
						className={cn(
							"inline-block mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
							statusVariant === "connected"
								? "bg-[#00AC3F]/10 text-[#00AC3F]"
								: "bg-[#737373]/10 text-[#737373]",
						)}
					>
						{statusLabel}
					</span>
				) : null}
			</div>
		</button>
	)
}
