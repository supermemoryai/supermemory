"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import type { BrainSkill } from "@/hooks/use-brain-skills"

function StatusChip({ skill }: { skill: BrainSkill }) {
	if (skill.status === "disabled") {
		return (
			<span className="inline-flex h-6 items-center rounded-full border border-red-400/20 bg-red-400/[0.07] px-2 text-[10px] font-medium text-red-300">
				Disabled
			</span>
		)
	}
	return null
}

export function SkillCard({
	skill,
	onOpen,
}: {
	skill: BrainSkill
	onOpen: () => void
}) {
	return (
		<article
			className={cn(
				dmSans125ClassName(),
				"flex min-h-[150px] min-w-0 flex-col rounded-xl bg-[#14161A]",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] transition-colors hover:bg-[#171A1F]",
			)}
		>
			<button
				type="button"
				onClick={onOpen}
				aria-label={`${skill.canEdit ? "Edit" : "View"} ${skill.name}`}
				className="flex min-h-0 flex-1 flex-col p-4 text-left"
			>
				<div className="min-w-0">
					<h3 className="truncate text-[14px] font-semibold tracking-[-0.15px] text-[#FAFAFA]">
						{skill.name}
					</h3>
					<p className="mt-1 line-clamp-2 break-words text-[12px] font-medium leading-5 text-[#737B87]">
						{skill.description}
					</p>
				</div>
				<div className="mt-auto flex flex-wrap gap-1.5 pt-4">
					<StatusChip skill={skill} />
				</div>
			</button>
		</article>
	)
}
