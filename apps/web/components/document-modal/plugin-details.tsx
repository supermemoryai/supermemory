import Image from "next/image"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import type { ParsedPluginDocument } from "@/lib/plugin-document"

function DetailPill({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-[12px] border border-[#1E232B] bg-[#0F1318] px-3 py-2">
			<p
				className={cn(
					dmSansClassName(),
					"text-[10px] uppercase tracking-[0.08em] text-[#737373]",
				)}
			>
				{label}
			</p>
			<p className="mt-1 text-[13px] text-[#F3F4F6] break-all">{value}</p>
		</div>
	)
}

export function PluginDetails({ parsed }: { parsed: ParsedPluginDocument }) {
	return (
		<div className="bg-[#14161A] p-3 rounded-[14px] space-y-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]">
			<div className="flex items-center justify-between gap-2">
				<p className="text-[16px] font-semibold text-[#FAFAFA] leading-[125%]">
					Details
				</p>
				<span
					className={cn(
						dmSansClassName(),
						"inline-flex items-center gap-1.5 text-[12px] font-medium text-[#FAFAFA]",
					)}
				>
					{parsed.pluginIconSrc && (
						<Image
							src={parsed.pluginIconSrc}
							alt=""
							width={16}
							height={16}
							className="rounded-[3px]"
							aria-hidden
						/>
					)}
					{parsed.pluginLabel}
				</span>
			</div>
			<div className="grid grid-cols-1 gap-2">
				<DetailPill label="Format" value={parsed.formatLabel} />
				{parsed.identifierLabel && parsed.identifierValue && (
					<DetailPill
						label={parsed.identifierLabel}
						value={parsed.identifierValue}
					/>
				)}
				{parsed.clientLabel && parsed.clientValue && (
					<DetailPill label={parsed.clientLabel} value={parsed.clientValue} />
				)}
			</div>
			{parsed.artifacts.length > 0 && (
				<div className="space-y-2">
					<p
						className={cn(
							dmSansClassName(),
							"text-[11px] font-medium uppercase tracking-[0.08em] text-[#737373]",
						)}
					>
						Outputs
					</p>
					<div className="space-y-2">
						{parsed.artifacts.map((artifact, index) => (
							<DetailPill
								key={`${artifact.label}-${artifact.value}-${index}`}
								label={artifact.label}
								value={artifact.value}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
