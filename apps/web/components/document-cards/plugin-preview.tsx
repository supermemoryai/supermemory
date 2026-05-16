"use client"

import Image from "next/image"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import type { ParsedPluginDocument } from "@/lib/plugin-document"

export function PluginPreview({ parsed }: { parsed: ParsedPluginDocument }) {
	return (
		<div className="bg-[#0B1017] p-3 rounded-[18px] space-y-2">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<span
						className={cn(
							dmSansClassName(),
							"inline-flex items-center gap-1.5 text-[11px] font-medium text-[#FAFAFA]",
						)}
					>
						{parsed.pluginIconSrc && (
							<Image
								src={parsed.pluginIconSrc}
								alt=""
								width={14}
								height={14}
								className="rounded-[3px]"
								aria-hidden
							/>
						)}
						{parsed.pluginLabel}
					</span>
					<p className="text-[11px] text-[#737373] truncate">
						{parsed.formatLabel}
					</p>
				</div>
				{parsed.identifierValue && (
					<p className="text-[10px] text-[#737373] truncate max-w-[45%]">
						{parsed.identifierValue}
					</p>
				)}
			</div>
			<div className="space-y-[6px]">
				<p
					className={cn(
						dmSansClassName(),
						"text-[13px] font-semibold line-clamp-2 leading-[125%]",
					)}
				>
					{parsed.title}
				</p>
				<p className="text-[11px] text-[#737373] line-clamp-4">
					{parsed.preview || parsed.summary}
				</p>
			</div>
		</div>
	)
}
