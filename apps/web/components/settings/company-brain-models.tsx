"use client"

import { cn } from "@lib/utils"
import { Check, ChevronDown, Loader2, Lock } from "lucide-react"
import { useMemo, useState } from "react"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import {
	type BrainModelConfig,
	type BrainModelRole,
	type BrainReasoningEffort,
	type BrainReasoningKey,
	useBrainModels,
	useUpdateBrainModels,
} from "@/hooks/use-brain-models"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"
import { useOrgMemberRole } from "@/hooks/use-org-member-role"
import { dmSans125ClassName } from "@/lib/fonts"
import { PillButton } from "../integrations/install-steps"

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

// One-line personality tags so non-experts can tell models apart.
const MODEL_TAGS: Record<string, string> = {
	"claude-sonnet-5": "balanced",
	"claude-opus-4.8": "most capable, slower",
	"claude-sonnet-4.6": "balanced",
	"claude-haiku-4.5": "fast and light",
	"grok-4.5": "sharp all-rounder",
	"grok-4.3": "capable",
	"grok-4-fast": "fastest",
	"gpt-5.6": "capable",
	"gpt-5.5": "capable",
}

const EFFORT_LABELS: Record<BrainReasoningEffort, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	xhigh: "Extra high",
}

const ROWS: {
	role: BrainModelRole
	effortKey: BrainReasoningKey
	title: string
	help: string
	effortHelp: string
}[] = [
	{
		role: "main",
		effortKey: "mainEffort",
		title: "Answers",
		help: "Writes the replies your brain sends in Slack.",
		effortHelp: "Deeper thinking gives better answers but takes longer.",
	},
	{
		role: "triage",
		effortKey: "triageEffort",
		title: "When to reply",
		help: "Decides whether and how the brain responds to a message.",
		effortHelp:
			"Deeper thinking routes messages more carefully but takes longer.",
	},
	{
		role: "research",
		effortKey: "researchEffort",
		title: "Web research",
		help: "Looks things up on the web when researching your company.",
		effortHelp: "Deeper research per web search, at the cost of speed.",
	},
]

type FullConfig = Required<BrainModelConfig>

type PresetDef = {
	id: string
	label: string
	description: string
	build: (
		defaults: BrainModelConfig,
		choices: { main: string[] } & Partial<
			Record<BrainReasoningKey, BrainReasoningEffort[]>
		>,
	) => FullConfig
}

const pickEffort = (
	options: BrainReasoningEffort[] | undefined,
	wanted: BrainReasoningEffort,
	fallback: BrainReasoningEffort,
): BrainReasoningEffort =>
	!options || options.length === 0 || options.includes(wanted)
		? wanted
		: fallback

const PRESETS: PresetDef[] = [
	{
		id: "fast",
		label: "Fastest",
		description: "Snappy replies, lighter on credits. Best for quick lookups.",
		build: (defaults, choices) => ({
			main: choices.main.includes("grok-4-fast")
				? "grok-4-fast"
				: defaults.main,
			triage: defaults.triage,
			research: defaults.research,
			mainEffort: pickEffort(choices.mainEffort, "low", "low"),
			triageEffort: pickEffort(choices.triageEffort, "low", "low"),
			researchEffort: pickEffort(choices.researchEffort, "low", "low"),
		}),
	},
	{
		id: "balanced",
		label: "Balanced",
		description: "Our recommended mix of speed and answer quality.",
		build: (defaults) => ({
			main: defaults.main,
			triage: defaults.triage,
			research: defaults.research,
			mainEffort: defaults.mainEffort ?? "high",
			triageEffort: defaults.triageEffort ?? "low",
			researchEffort: defaults.researchEffort ?? "high",
		}),
	},
	{
		id: "thorough",
		label: "Most thorough",
		description: "Deepest answers and research. Slower, uses more credits.",
		build: (defaults, choices) => ({
			main: defaults.main,
			triage: defaults.triage,
			research: defaults.research,
			mainEffort: pickEffort(choices.mainEffort, "xhigh", "high"),
			triageEffort: pickEffort(choices.triageEffort, "medium", "low"),
			researchEffort: pickEffort(choices.researchEffort, "xhigh", "high"),
		}),
	},
]

const CONFIG_KEYS = [
	"main",
	"triage",
	"research",
	"mainEffort",
	"triageEffort",
	"researchEffort",
] as const

const extraHighIsBounded = (model: string): boolean =>
	model.startsWith("grok-") || model.startsWith("gpt-")

const controlClass = cn(
	dmSans125ClassName(),
	"h-9 w-full rounded-full border border-[#1E293B] bg-[#0D121A] px-3.5 text-[13px] text-[#FAFAFA] outline-none disabled:opacity-50",
)
const fieldLabel = cn(
	dmSans125ClassName(),
	"text-[11px] font-medium uppercase tracking-[0.06em] text-[#5B6675]",
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

export default function CompanyBrainModels({
	showHeading = true,
}: {
	showHeading?: boolean
}) {
	const isCompanyBrain = useHasCompanyBrain()
	const { isAdmin } = useOrgMemberRole(isCompanyBrain)

	const modelsQuery = useBrainModels(isCompanyBrain)
	const update = useUpdateBrainModels()

	const [draft, setDraft] = useState<Partial<BrainModelConfig>>({})
	const [advancedOpen, setAdvancedOpen] = useState(false)

	const resolved = modelsQuery.data?.resolved
	const defaults = modelsQuery.data?.defaults
	const choices = modelsQuery.data?.choices

	const valueFor = (role: BrainModelRole): string =>
		draft[role] ?? resolved?.[role] ?? ""
	const effortFor = (key: BrainReasoningKey): BrainReasoningEffort | "" =>
		draft[key] ?? resolved?.[key] ?? defaults?.[key] ?? ""

	const dirty = useMemo(() => {
		if (!resolved) return false
		return ROWS.some(({ role, effortKey }) => {
			const modelChanged =
				draft[role] !== undefined && draft[role] !== resolved[role]
			const effortChanged =
				draft[effortKey] !== undefined &&
				draft[effortKey] !== resolved[effortKey]
			return modelChanged || effortChanged
		})
	}, [draft, resolved])

	const presets = useMemo(() => {
		if (!defaults || !choices) return []
		return PRESETS.map((p) => ({ ...p, config: p.build(defaults, choices) }))
	}, [defaults, choices])

	// Preset whose full config matches what's currently on screen (draft over saved).
	const activePresetId = useMemo(() => {
		if (!resolved) return null
		const current: Record<string, string | undefined> = {}
		for (const key of CONFIG_KEYS) {
			current[key] = draft[key] ?? resolved[key] ?? defaults?.[key]
		}
		return (
			presets.find((p) =>
				CONFIG_KEYS.every((key) => current[key] === p.config[key]),
			)?.id ?? null
		)
	}, [presets, draft, resolved, defaults])

	if (!isCompanyBrain) return null

	const disabled = !isAdmin || modelsQuery.isLoading || update.isPending

	return (
		<section className="flex flex-col gap-4 px-1">
			{showHeading ? (
				<div className="flex flex-col gap-0.5">
					<SectionTitle>Models</SectionTitle>
					<span
						className={cn(dmSans125ClassName(), "text-[12px] text-[#9A9A9A]")}
					>
						Choose which models Company Brain uses. Applies to this organization
						only.
					</span>
				</div>
			) : null}

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
					<div className="grid gap-3 sm:grid-cols-3">
						{presets.map((preset) => {
							const isActive = preset.id === activePresetId
							return (
								<button
									key={preset.id}
									type="button"
									disabled={disabled}
									aria-pressed={isActive}
									onClick={() => {
										if (!resolved) return
										setDraft({ ...preset.config })
									}}
									className={cn(
										dmSans125ClassName(),
										"flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-xl p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
										"bg-[#14161A] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
										isActive
											? "bg-[#10161f] ring-1 ring-[#2261CA]/45"
											: "hover:bg-[#171A1F]",
									)}
								>
									<span className="flex items-center justify-between gap-2">
										<span className="truncate font-semibold text-[14px] tracking-[-0.15px] text-[#FAFAFA]">
											{preset.label}
											{preset.id === "balanced" ? (
												<span className="ml-1.5 text-[11px] font-medium text-[#737B87]">
													Recommended
												</span>
											) : null}
										</span>
										{isActive ? (
											<Check className="size-4 shrink-0 text-[#6BB0FF]" />
										) : null}
									</span>
									<span className="text-[12px] font-medium leading-[1.5] text-[#737373]">
										{preset.description}
									</span>
								</button>
							)
						})}
					</div>

					<button
						type="button"
						onClick={() => setAdvancedOpen((open) => !open)}
						className={cn(
							dmSans125ClassName(),
							"flex w-fit cursor-pointer items-center gap-1.5 rounded-full px-1 py-1 text-[12px] font-medium text-[#8B929E] transition-colors hover:text-[#FAFAFA]",
						)}
					>
						<ChevronDown
							className={cn(
								"size-3.5 transition-transform",
								(advancedOpen || activePresetId === null) && "rotate-180",
							)}
						/>
						Advanced
						{activePresetId === null ? (
							<span className="text-[11px] text-[#5F6673]">
								· custom settings in use
							</span>
						) : null}
					</button>

					{advancedOpen || activePresetId === null ? (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{ROWS.map(({ role, effortKey, title, help, effortHelp }) => {
								const options = choices?.[role] ?? []
								const current = valueFor(role)
								const effortOptions = choices?.[effortKey] ?? []
								const currentEffort = effortFor(effortKey)
								const isDefault =
									defaults?.[role] === current &&
									(effortOptions.length === 0 ||
										defaults?.[effortKey] === currentEffort)
								return (
									<div
										key={role}
										className="flex min-w-0 flex-col gap-5 rounded-xl bg-[#14161A] p-5 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p
													className={cn(
														dmSans125ClassName(),
														"truncate font-semibold text-[15px] tracking-[-0.15px] text-[#FAFAFA]",
													)}
												>
													{title}
												</p>
												<p
													className={cn(
														dmSans125ClassName(),
														"mt-1.5 min-h-[2lh] text-[12px] font-medium leading-[1.55] text-[#737373]",
													)}
												>
													{help}
												</p>
											</div>
											{isDefault ? (
												<span
													className={cn(
														dmSans125ClassName(),
														"shrink-0 rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#737B87]",
													)}
												>
													Default
												</span>
											) : null}
										</div>

										<div className="flex flex-col gap-2">
											<span className={fieldLabel}>Model</span>
											<Select
												value={current}
												disabled={disabled}
												onValueChange={(v) =>
													setDraft((d) => ({ ...d, [role]: v }))
												}
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
															{MODEL_TAGS[id] ? (
																<span className="text-[#737B87]">
																	{" "}
																	· {MODEL_TAGS[id]}
																</span>
															) : null}
															{defaults?.[role] === id ? " (default)" : ""}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										{effortOptions.length > 0 ? (
											<div className="flex flex-col gap-2">
												<span className={fieldLabel}>Thinking depth</span>
												<div className="flex w-full items-center gap-0.5 rounded-full bg-[#0D121A] p-0.5 shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)]">
													{effortOptions.map((effort) => {
														const isOn = currentEffort === effort
														return (
															<button
																key={effort}
																type="button"
																aria-pressed={isOn}
																disabled={disabled}
																onClick={() =>
																	setDraft((currentDraft) => ({
																		...currentDraft,
																		[effortKey]: effort,
																	}))
																}
																className={cn(
																	dmSans125ClassName(),
																	"h-7 min-w-0 flex-1 cursor-pointer rounded-full px-1 text-[11.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
																	isOn
																		? "bg-white/[0.10] text-[#FAFAFA]"
																		: "text-[#8B929E] hover:text-[#FAFAFA]",
																)}
															>
																{EFFORT_LABELS[effort]}
															</button>
														)
													})}
												</div>
												<div className="flex items-center justify-between px-1.5 text-[10px] font-medium text-[#4A5260]">
													<span>Faster</span>
													<span>Smarter</span>
												</div>
												<p
													className={cn(
														dmSans125ClassName(),
														"text-[11px] leading-[1.5] text-[#5F6673]",
													)}
												>
													{effortHelp}
												</p>
												{currentEffort === "xhigh" &&
												extraHighIsBounded(current) ? (
													<p
														className={cn(
															dmSans125ClassName(),
															"text-[11px] text-amber-300/80",
														)}
													>
														Extra high maps to High for this model provider.
													</p>
												) : null}
											</div>
										) : null}
									</div>
								)
							})}
						</div>
					) : null}

					{!isAdmin ? (
						<div className="flex items-center gap-1.5 text-[12px] text-[#737373]">
							<Lock className="size-3.5" />
							Only organization admins can change these.
						</div>
					) : (
						<div className="flex items-center justify-end gap-3">
							{dirty ? (
								<button
									type="button"
									onClick={() => setDraft({})}
									disabled={update.isPending}
									className={cn(
										dmSans125ClassName(),
										"h-9 rounded-full px-3 text-[13px] font-medium text-[#8B929E] transition-colors hover:text-[#FAFAFA] disabled:opacity-45",
									)}
								>
									Reset
								</button>
							) : null}
							<PillButton
								disabled={disabled || !dirty}
								onClick={() => {
									const patch: Partial<BrainModelConfig> = {}
									for (const { role, effortKey } of ROWS) {
										if (draft[role] && draft[role] !== resolved?.[role]) {
											patch[role] = draft[role]
										}
										if (
											draft[effortKey] &&
											draft[effortKey] !== resolved?.[effortKey]
										) {
											patch[effortKey] = draft[effortKey]
										}
									}
									update.mutate(patch, { onSuccess: () => setDraft({}) })
								}}
							>
								{update.isPending ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : null}
								Save
							</PillButton>
						</div>
					)}
				</div>
			)}
		</section>
	)
}
