"use client"

import { useEffect, useMemo, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { LoaderIcon, Settings, X } from "lucide-react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/use-org-settings"
import { cn } from "@lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"

type ContextTemplate = {
	id: string
	label: string
	description: string
	prompt: string
}

const CONTEXT_TEMPLATES: ContextTemplate[] = [
	{
		id: "personal-general",
		label: "General Personal Assistant",
		description:
			"Remember preferences, routines, relationships, plans, and life context.",
		prompt: `Supermemory personal assistant. The user saves conversations, notes, and daily context.

EXTRACT:
- Preferences: "prefers morning meetings", "allergic to peanuts"
- Routines: "works out every Tuesday and Thursday"
- Relationships: "Sarah is their manager", "lives with roommate Jake"
- Plans: "planning a trip to Japan in March"
- Life events: "moved to Austin last month", "started a new job"

SKIP:
- Generic assistant suggestions the user did not confirm
- Pleasantries and small talk without factual content
- Repeated scheduling details already captured`,
	},
	{
		id: "personal-productivity",
		label: "Productivity Assistant",
		description:
			"Focus on tasks, decisions, deadlines, workflows, and blockers.",
		prompt: `Supermemory productivity tool. The user saves meeting notes, task updates, and project context.

EXTRACT:
- Action items: "needs to send proposal to client by Friday"
- Decisions: "team decided to use Figma for design handoff"
- Deadlines: "Q3 review due September 15th"
- Workflows: "deploys happen every Wednesday via CI pipeline"
- Blockers: "waiting on legal approval before launch"

SKIP:
- Meeting filler ("let's circle back", "good point")
- Status updates that repeat previously captured information
- Agenda items with no outcome or decision`,
	},
]

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p
			className={cn(
				dmSans125ClassName(),
				"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA] px-2",
			)}
		>
			{children}
		</p>
	)
}

function SettingsCard({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={cn(
				"relative bg-[#14161A] rounded-[14px] p-6 w-full overflow-hidden",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			{children}
		</div>
	)
}

function PillButton({
	children,
	onClick,
	disabled,
	variant = "default",
}: {
	children: React.ReactNode
	onClick: () => void
	disabled?: boolean
	variant?: "default" | "danger" | "primary"
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				dmSansClassName(),
				"inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border px-3 text-[13px] font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
				variant === "primary"
					? "border-transparent bg-[#0054AD] text-[#FAFAFA] hover:bg-[#0B65C9]"
					: variant === "danger"
						? "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
						: "border-[#161F2C] bg-[#0D121A] text-[#FAFAFA] hover:bg-[#00173C] hover:border-[#2261CA33]",
			)}
		>
			{children}
		</button>
	)
}

export function OrgContext() {
	const { data: settings, isLoading, isError } = useOrgSettings()
	const updateSettings = useUpdateOrgSettings()
	const [confirmDialog, setConfirmDialog] = useState<
		"enable" | "disable" | null
	>(null)
	const [isManaging, setIsManaging] = useState(false)
	const [prompt, setPrompt] = useState("")

	const enabled = settings?.shouldLLMFilter ?? false
	const savedPrompt = settings?.filterPrompt ?? ""
	const dirty = prompt.trim() !== savedPrompt.trim()
	const settingsReady = !isLoading && !isError

	useEffect(() => {
		setPrompt(settings?.filterPrompt ?? "")
	}, [settings?.filterPrompt])

	const selectedTemplateId = useMemo(() => {
		const normalized = prompt.trim()
		return CONTEXT_TEMPLATES.find(
			(template) => template.prompt.trim() === normalized,
		)?.id
	}, [prompt])

	const handleConfirmToggle = () => {
		const newEnabled = confirmDialog === "enable"
		updateSettings.mutate(
			newEnabled
				? { shouldLLMFilter: true }
				: { shouldLLMFilter: false, filterPrompt: null },
			{
				onSuccess: () => {
					setConfirmDialog(null)
					if (!newEnabled) {
						setIsManaging(false)
						setPrompt("")
					}
				},
			},
		)
	}

	const handleSave = () => {
		updateSettings.mutate(
			{
				shouldLLMFilter: true,
				filterPrompt: prompt.trim() ? prompt.trim() : null,
			},
			{
				onSuccess: () => {
					setIsManaging(false)
				},
			},
		)
	}

	const handleCancel = () => {
		setPrompt(savedPrompt)
		setIsManaging(false)
	}

	return (
		<section id="organization-context" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1 px-2">
				<SectionTitle>Organization Context</SectionTitle>
				<p
					className={cn(
						dmSans125ClassName(),
						"text-[13px] tracking-[-0.13px] text-[#737373] px-2",
					)}
				>
					Guide how Nova processes and remembers your content.
				</p>
			</div>
			<SettingsCard>
				<div className={cn(dmSansClassName(), "flex flex-col gap-5")}>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex min-w-0 items-center">
							<div className="min-w-0">
								<p className="text-[15px] font-medium text-[#FAFAFA]">
									{enabled ? "Context is enabled" : "Context is disabled"}
								</p>
								<p className="text-[13px] leading-snug text-[#737373]">
									{enabled
										? "New content will use your guidance when Nova creates memories."
										: "Turn this on to tell Nova what matters most when it learns."}
								</p>
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<PillButton
								onClick={() => setConfirmDialog(enabled ? "disable" : "enable")}
								disabled={!settingsReady || updateSettings.isPending}
								variant={enabled ? "danger" : "primary"}
							>
								{enabled ? "DISABLE" : "ENABLE"}
							</PillButton>
							{enabled && (
								<PillButton
									onClick={() => setIsManaging(true)}
									disabled={updateSettings.isPending}
								>
									<Settings className="size-3.5" />
									MANAGE
								</PillButton>
							)}
						</div>
					</div>

					{enabled && !isManaging && savedPrompt && (
						<div className="rounded-[12px] border border-[#161F2C] bg-[#0D121A] p-4">
							<p className="line-clamp-6 whitespace-pre-wrap text-[13px] leading-relaxed text-[#A3A3A3]">
								{savedPrompt}
							</p>
						</div>
					)}

					{enabled && !isManaging && !savedPrompt && (
						<p className="text-[13px] italic text-[#737373]">
							No organization context configured.{" "}
							<button
								type="button"
								onClick={() => setIsManaging(true)}
								className="text-[#4BA0FA] transition-colors hover:text-[#7BB8FF] cursor-pointer"
							>
								Set up now
							</button>
						</p>
					)}

					{enabled && isManaging && (
						<div className="flex flex-col gap-4">
							<label className="flex flex-col gap-2">
								<span className="text-[13px] font-medium text-[#FAFAFA]">
									What should Nova focus on?
								</span>
								<textarea
									value={prompt}
									onChange={(event) => setPrompt(event.target.value)}
									placeholder="Describe what Nova should extract, skip, and prioritize when turning your content into memories..."
									className={cn(
										dmSansClassName(),
										"min-h-[180px] w-full resize-y rounded-[12px] border border-[#161F2C] bg-[#0D121A] p-4 text-[13px] leading-relaxed text-[#FAFAFA] placeholder:text-[#525966] focus:outline-none focus:ring-1 focus:ring-[#2261CA66]",
									)}
									maxLength={750}
								/>
								<span className="self-end text-[11px] text-[#737373]">
									{prompt.length}/750
								</span>
							</label>

							<div className="grid gap-3 md:grid-cols-2">
								{CONTEXT_TEMPLATES.map((template) => {
									const isSelected = selectedTemplateId === template.id
									return (
										<button
											key={template.id}
											type="button"
											onClick={() => setPrompt(template.prompt)}
											className={cn(
												"rounded-[10px] border p-3 text-left transition-colors cursor-pointer",
												"bg-[#0D121A] hover:bg-[#121A24]",
												isSelected
													? "border-[#1C2B3E] bg-[#1C2B3E]"
													: "border-white/10",
											)}
										>
											<p className="text-[14px] font-medium text-[#FAFAFA]">
												{template.label}
											</p>
											<p className="mt-1 text-[12px] leading-snug text-[#737373]">
												{template.description}
											</p>
										</button>
									)
								})}
							</div>

							<div className="flex justify-end gap-2">
								<PillButton onClick={handleCancel}>CANCEL</PillButton>
								<PillButton
									onClick={handleSave}
									disabled={!dirty || updateSettings.isPending}
									variant="primary"
								>
									{updateSettings.isPending && (
										<LoaderIcon className="size-3.5 animate-spin" />
									)}
									SAVE
								</PillButton>
							</div>
						</div>
					)}
				</div>
			</SettingsCard>

			<Dialog
				open={!!confirmDialog}
				onOpenChange={(open) => {
					if (!open) setConfirmDialog(null)
				}}
			>
				<DialogContent
					showCloseButton={false}
					className={cn(
						"sm:max-w-[440px] border-none bg-[#1B1F24] p-0 gap-0 rounded-[22px] overflow-hidden",
						dmSansClassName(),
					)}
				>
					<div className="flex flex-col gap-4 p-5">
						<div className="flex items-start justify-between gap-4">
							<div className="space-y-1.5 flex-1">
								<DialogTitle
									className={cn(
										dmSans125ClassName(),
										"text-[18px] font-semibold tracking-[-0.18px] text-[#FAFAFA]",
									)}
								>
									{confirmDialog === "enable"
										? "Enable Organization Context?"
										: "Disable Organization Context?"}
								</DialogTitle>
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[13px] tracking-[-0.13px] leading-relaxed text-[#737373]",
									)}
								>
									{confirmDialog === "enable"
										? "Nova will use your guidance when processing new content across this organization."
										: "Nova will stop using this guidance for new content, and the saved context will be cleared."}
								</p>
							</div>
							<DialogPrimitive.Close
								className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[rgba(115,115,115,0.2)] bg-[#0D121A] text-[#737373] transition-opacity hover:opacity-100 focus:outline-hidden cursor-pointer"
								style={{
									boxShadow:
										"inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
								}}
							>
								<X className="size-4" />
								<span className="sr-only">Close</span>
							</DialogPrimitive.Close>
						</div>
						<div className="flex justify-end gap-2">
							<PillButton onClick={() => setConfirmDialog(null)}>
								CANCEL
							</PillButton>
							<PillButton
								onClick={handleConfirmToggle}
								disabled={updateSettings.isPending}
								variant={confirmDialog === "disable" ? "danger" : "primary"}
							>
								{updateSettings.isPending && (
									<LoaderIcon className="size-3.5 animate-spin" />
								)}
								{confirmDialog === "enable" ? "ENABLE" : "DISABLE"}
							</PillButton>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</section>
	)
}
