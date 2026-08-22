"use client"

import { cn } from "@lib/utils"
import type { ReactNode } from "react"
import { dmSans125ClassName } from "@/lib/fonts"

// Shared connector/integration card shell: icon, name, subtitle, optional
// top-right slot, and a footer split into a status side and an action side.
export function ConnectorCard({
	icon,
	name,
	subtitle,
	topRight,
	footerLeft,
	footerRight,
}: {
	icon: ReactNode
	name: string
	subtitle: string
	topRight?: ReactNode
	footerLeft: ReactNode
	footerRight?: ReactNode
}) {
	return (
		<div className="flex h-full min-w-0 flex-col justify-between gap-3 rounded-xl bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
			<div className="flex min-w-0 items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]">
					{icon}
				</div>
				<div className="min-w-0 flex-1 pt-0.5">
					<p
						className={cn(
							dmSans125ClassName(),
							"truncate font-semibold text-[14px] tracking-[-0.15px] text-[#FAFAFA]",
						)}
					>
						{name}
					</p>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-1 line-clamp-2 break-words text-[12px] font-medium leading-5 text-[#737373]",
						)}
					>
						{subtitle}
					</p>
				</div>
				{topRight}
			</div>
			<div className="flex min-h-9 items-center justify-between gap-3 border-[#1E293B]/50 border-t pt-3">
				<div className="flex min-w-0 items-center gap-3">{footerLeft}</div>
				{footerRight}
			</div>
		</div>
	)
}

export function ScopeChip({
	label,
	connected,
}: {
	label: string
	connected: boolean
}) {
	return (
		<span
			className={cn(
				dmSans125ClassName(),
				"flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium",
				connected ? "text-[#FAFAFA]" : "text-[#737373]",
			)}
		>
			<span
				className={cn(
					"size-[7px] shrink-0 rounded-full",
					connected ? "bg-[#00AC3F]" : "bg-[#3A4150]",
				)}
			/>
			{label}
		</span>
	)
}
