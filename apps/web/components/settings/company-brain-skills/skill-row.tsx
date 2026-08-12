"use client"

import { cn } from "@lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ChevronRight } from "lucide-react"
import { skillOriginLabel } from "@/components/settings/company-brain-skills/domain"
import type { BrainSkill } from "@/hooks/use-brain-skills"
import { dmSans125ClassName } from "@/lib/fonts"

function updatedLabel(updatedAt: number) {
	const date = new Date(updatedAt)
	if (Number.isNaN(date.getTime())) return null
	return formatDistanceToNow(date, { addSuffix: true })
}

function ScopeBadge({ scope }: { scope: BrainSkill["scope"] }) {
	return (
		<span
			className={cn(
				"inline-flex h-[18px] shrink-0 items-center rounded-full px-1.5 text-[10px] font-medium uppercase tracking-[0.04em]",
				scope === "org"
					? "bg-[#2A3140] text-[#A9B4C6]"
					: "bg-white/[0.05] text-[#7E8794]",
			)}
		>
			{scope === "org" ? "Org-wide" : "Personal"}
		</span>
	)
}

function OriginBadge({ origin }: { origin: BrainSkill["origin"] }) {
	const label = skillOriginLabel(origin)
	if (!label) return null
	return (
		<span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-[#1F2E3C] px-1.5 text-[10px] font-medium text-[#A8C7E8]">
			{label}
		</span>
	)
}

export function SkillRow({
	skill,
	onOpen,
}: {
	skill: BrainSkill
	onOpen: () => void
}) {
	const updated = updatedLabel(skill.updatedAt)
	return (
		<button
			type="button"
			onClick={onOpen}
			aria-label={`${skill.canEdit ? "Edit" : "View"} ${skill.name}`}
			className={cn(
				dmSans125ClassName(),
				"group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]",
			)}
		>
			<div className="min-w-0 flex-1">
				<div className="flex min-w-0 items-center gap-2">
					<h3 className="truncate text-[13px] font-semibold tracking-[-0.1px] text-[#FAFAFA]">
						{skill.name}
					</h3>
					<ScopeBadge scope={skill.scope} />
					<OriginBadge origin={skill.origin} />
					{skill.status === "disabled" ? (
						<span className="inline-flex h-[18px] shrink-0 items-center rounded-full border border-red-400/20 bg-red-400/[0.07] px-1.5 text-[10px] font-medium text-red-300">
							Disabled
						</span>
					) : null}
				</div>
				<p className="mt-0.5 truncate text-[12px] leading-5 text-[#737B87]">
					{skill.description}
				</p>
			</div>
			<span className="hidden shrink-0 text-[11px] tabular-nums text-[#596270] sm:block">
				v{skill.version}
				{updated ? ` · ${updated}` : ""}
			</span>
			<ChevronRight className="size-4 shrink-0 text-[#4A5260] transition-colors group-hover:text-[#8B929E]" />
		</button>
	)
}
