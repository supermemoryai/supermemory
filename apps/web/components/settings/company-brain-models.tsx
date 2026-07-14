"use client"

import { cn } from "@lib/utils"
import { Loader2, Lock } from "lucide-react"
import { useMemo, useState } from "react"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import {
	type BrainModelRole,
	useBrainModels,
	useUpdateBrainModels,
} from "@/hooks/use-brain-models"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"
import { useOrgMemberRole } from "@/hooks/use-org-member-role"
import { dmSans125ClassName } from "@/lib/fonts"

const MODEL_LABELS: Record<string, string> = {
	"claude-sonnet-5": "Sonnet 5",
	"claude-opus-4.8": "Opus 4.8",
	"claude-sonnet-4.6": "Sonnet 4.6",
	"claude-haiku-4.5": "Haiku 4.5",
	"grok-4.5": "Grok 4.5",
	"grok-4.3": "Grok 4.3",
	"grok-4-fast": "Grok 4 Fast",
	"gpt-5.6": "GPT-5.6",
	"gpt-5.5": "GPT-5.5",
}

const labelFor = (id: string) => MODEL_LABELS[id] ?? id

const ROWS: { role: BrainModelRole; title: string; help: string }[] = [
	{
		role: "main",
		title: "Main model",
		help: "Reasoning, tool use, and the final Slack answer.",
	},
	{
		role: "triage",
		title: "Triage model",
		help: "Decides whether and how the brain replies to a message.",
	},
	{
		role: "research",
		title: "Research model",
		help: "Grounded web research during company research.",
	},
]

const controlClass = cn(
	dmSans125ClassName(),
	"h-9 w-full rounded-[10px] border border-white/[0.08] bg-[#0D0F14] px-3 text-[13px] text-[#FAFAFA] outline-none disabled:opacity-50",
)
const selectContentClass = cn(
	dmSans125ClassName(),
	"rounded-[10px] border-white/[0.08] bg-[#1B1F24] text-[#FAFAFA] shadow-[0px_8px_24px_rgba(0,0,0,0.5)]",
)
const selectItemClass =
	"cursor-pointer rounded-[8px] text-[13px] text-[#FAFAFA] hover:bg-white/10 hover:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white focus:bg-white/10 focus:text-white"

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p
			className={cn(
				dmSans125ClassName(),
				"font-semibold text-[14px] tracking-[-0.14px] text-[#FAFAFA]",
			)}
		>
			{children}
		</p>
	)
}

export default function CompanyBrainModels() {
	const isCompanyBrain = useHasCompanyBrain()
	const { isAdmin } = useOrgMemberRole(isCompanyBrain)

	const modelsQuery = useBrainModels(isCompanyBrain)
	const update = useUpdateBrainModels()

	const [draft, setDraft] = useState<Partial<Record<BrainModelRole, string>>>(
		{},
	)

	const resolved = modelsQuery.data?.resolved
	const defaults = modelsQuery.data?.defaults
	const choices = modelsQuery.data?.choices

	const valueFor = (role: BrainModelRole): string =>
		draft[role] ?? resolved?.[role] ?? ""

	const dirty = useMemo(() => {
		if (!resolved) return false
		return ROWS.some(
			({ role }) => draft[role] && draft[role] !== resolved[role],
		)
	}, [draft, resolved])

	if (!isCompanyBrain) return null

	const disabled = !isAdmin || modelsQuery.isLoading || update.isPending

	return (
		<section className="flex flex-col gap-4 px-1">
			<div className="flex flex-col gap-0.5">
				<SectionTitle>Models</SectionTitle>
				<span
					className={cn(dmSans125ClassName(), "text-[12px] text-[#9A9A9A]")}
				>
					Choose which models Company Brain uses. Applies to this organization
					only.
				</span>
			</div>

			{modelsQuery.isLoading ? (
				<div className="flex items-center gap-2 text-[13px] text-[#9A9A9A]">
					<Loader2 className="size-4 animate-spin" />
					Loading models…
				</div>
			) : modelsQuery.isError ? (
				<p className={cn(dmSans125ClassName(), "text-[13px] text-red-400")}>
					Couldn't load models.
				</p>
			) : (
				<div className="flex flex-col gap-4">
					{ROWS.map(({ role, title, help }) => {
						const options = choices?.[role] ?? []
						const current = valueFor(role)
						return (
							<div key={role} className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between gap-3">
									<span
										className={cn(
											dmSans125ClassName(),
											"text-[13px] font-medium text-[#FAFAFA]",
										)}
									>
										{title}
									</span>
									{defaults?.[role] === current ? (
										<span
											className={cn(
												dmSans125ClassName(),
												"text-[11px] text-[#737373]",
											)}
										>
											Default
										</span>
									) : null}
								</div>
								<Select
									value={current}
									disabled={disabled}
									onValueChange={(v) => setDraft((d) => ({ ...d, [role]: v }))}
								>
									<SelectTrigger className={controlClass}>
										<SelectValue placeholder="Select a model…" />
									</SelectTrigger>
									<SelectContent className={selectContentClass}>
										{options.map((id) => (
											<SelectItem
												key={id}
												value={id}
												className={selectItemClass}
											>
												{labelFor(id)}
												{defaults?.[role] === id ? " (default)" : ""}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[12px] text-[#9A9A9A]",
									)}
								>
									{help}
								</span>
							</div>
						)
					})}

					{!isAdmin ? (
						<div className="flex items-center gap-1.5 text-[12px] text-[#737373]">
							<Lock className="size-3.5" />
							Only organization admins can change these.
						</div>
					) : (
						<div className="flex justify-end">
							<button
								type="button"
								disabled={disabled || !dirty}
								onClick={() => {
									const patch: Partial<Record<BrainModelRole, string>> = {}
									for (const { role } of ROWS) {
										if (draft[role] && draft[role] !== resolved?.[role]) {
											patch[role] = draft[role]
										}
									}
									update.mutate(patch, { onSuccess: () => setDraft({}) })
								}}
								className={cn(
									dmSans125ClassName(),
									"inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-4 text-[12px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40",
								)}
							>
								{update.isPending ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : null}
								Save
							</button>
						</div>
					)}
				</div>
			)}
		</section>
	)
}
