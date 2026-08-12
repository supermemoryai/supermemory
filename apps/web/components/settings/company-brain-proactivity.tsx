"use client"

import { useQuery } from "@tanstack/react-query"
import { cn } from "@lib/utils"
import { Check, Loader2, Lock, Plus, X } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@lib/auth-context"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@ui/components/command"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import {
	type BrainChannelProactivity,
	type BrainProactivityDefault,
	useBrainSettings,
	useUpdateBrainSettings,
} from "@/hooks/use-brain-settings"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"
import { useOrgMemberRole } from "@/hooks/use-org-member-role"
import { dmSans125ClassName } from "@/lib/fonts"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

type Channel = { id: string; name: string; isPrivate: boolean }

const HOME_CHANNEL_NAME = "company-brain"

const MODES: {
	id: BrainProactivityDefault
	label: string
	description: string
}[] = [
	{
		id: "all_channels",
		label: "All channels",
		description: "Joins any conversation it's been added to when it can help.",
	},
	{
		id: "own_channel_only",
		label: "Only its own channel",
		description: "Speaks only in #company-brain unless @mentioned or DMed.",
	},
]

const fieldLabel = cn(
	dmSans125ClassName(),
	"text-[11px] font-medium uppercase tracking-[0.06em] text-[#5B6675]",
)
const selectContentClass = cn(
	dmSans125ClassName(),
	"rounded-[10px] border-white/[0.08] bg-[#1B1F24] text-[#FAFAFA] shadow-[0px_8px_24px_rgba(0,0,0,0.5)]",
)
const commandItemClass =
	"cursor-pointer rounded-[8px] text-[13px] text-[#FAFAFA] data-[selected=true]:bg-white/10 data-[selected=true]:text-white"

export default function CompanyBrainProactivity() {
	const isCompanyBrain = useHasCompanyBrain()
	const { isAdmin } = useOrgMemberRole(isCompanyBrain)
	const { org } = useAuth()

	const settingsQuery = useBrainSettings(isCompanyBrain)
	const update = useUpdateBrainSettings()
	const [pickerOpen, setPickerOpen] = useState(false)

	const slackStatusQuery = useQuery({
		queryKey: ["brain", "slack-status", org?.id],
		queryFn: async () => {
			const res = await fetch(`${BACKEND}/brain/slack/status`, {
				credentials: "include",
			})
			if (!res.ok) throw new Error("Failed to load Slack status")
			return (await res.json()) as { connected: boolean }
		},
		enabled: isCompanyBrain,
		staleTime: 60_000,
	})

	// Same key + endpoint as the automations picker so react-query dedupes.
	const channelsQuery = useQuery({
		queryKey: ["company-brain-automations", "channels", org?.id],
		queryFn: async () => {
			const res = await fetch(`${BACKEND}/brain/automations/channels`, {
				credentials: "include",
			})
			if (!res.ok) throw new Error("Failed to load channels")
			return ((await res.json()) as { channels: Channel[] }).channels ?? []
		},
		enabled: isCompanyBrain,
		staleTime: 60_000,
	})

	if (!isCompanyBrain) {
		return (
			<div className="px-1 pt-2">
				<p className={cn(dmSans125ClassName(), "text-[13px] text-[#6B6B6B]")}>
					Company Brain isn't enabled for this organization.
				</p>
			</div>
		)
	}

	const proactivity = settingsQuery.data?.proactivity
	const activeMode = proactivity?.default ?? "all_channels"
	const overrides = proactivity?.channels ?? {}
	const channels = channelsQuery.data ?? []
	const channelName = (id: string) =>
		channels.find((ch) => ch.id === id)?.name ?? id
	const addable = channels.filter(
		(ch) => !overrides[ch.id] && ch.name !== HOME_CHANNEL_NAME,
	)
	const disabled = !isAdmin || settingsQuery.isLoading || update.isPending

	const setMode = (mode: BrainProactivityDefault) => {
		if (mode === activeMode) return
		update.mutate({ proactivity: { default: mode } })
	}
	const setOverride = (
		channelId: string,
		value: BrainChannelProactivity | null,
	) => {
		update.mutate({ proactivity: { channels: { [channelId]: value } } })
	}

	return (
		<section className="flex w-full max-w-3xl flex-col gap-4 px-1">
			{settingsQuery.isLoading ? (
				<div className="flex items-center gap-2 text-[13px] text-[#9A9A9A]">
					<Loader2 className="size-4 animate-spin" />
					Loading proactivity…
				</div>
			) : settingsQuery.isError ? (
				<p className={cn(dmSans125ClassName(), "text-[13px] text-red-400")}>
					Couldn't load proactivity settings.
				</p>
			) : (
				<div className="flex flex-col gap-4">
					<div className="grid gap-3 sm:grid-cols-2">
						{MODES.map((mode) => {
							const isActive = mode.id === activeMode
							return (
								<button
									key={mode.id}
									type="button"
									disabled={disabled}
									aria-pressed={isActive}
									onClick={() => setMode(mode.id)}
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
											{mode.label}
											{mode.id === "all_channels" ? (
												<span className="ml-1.5 text-[11px] font-medium text-[#737B87]">
													Default
												</span>
											) : null}
										</span>
										{isActive ? (
											<Check className="size-4 shrink-0 text-[#6BB0FF]" />
										) : null}
									</span>
									<span className="text-[12px] font-medium leading-[1.5] text-[#737373]">
										{mode.description}
									</span>
								</button>
							)
						})}
					</div>

					<div className="flex flex-col gap-2">
						<span className={fieldLabel}>Channel exceptions</span>
						<div className="overflow-hidden rounded-xl bg-[#14161A] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
							<div className="max-h-[420px] overflow-y-auto">
								{Object.entries(overrides).map(([channelId, value]) => (
									<div
										key={channelId}
										className="flex min-h-[52px] items-center justify-between gap-3 border-white/[0.06] border-b px-4 py-2"
									>
										<span
											className={cn(
												dmSans125ClassName(),
												"min-w-0 truncate text-[13px] font-medium text-[#FAFAFA]",
											)}
										>
											#{channelName(channelId)}
										</span>
										<div className="flex shrink-0 items-center gap-2">
											<div className="flex items-center gap-0.5 rounded-full bg-[#0D121A] p-0.5 shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.5)]">
												{(["proactive", "quiet"] as const).map((option) => (
													<button
														key={option}
														type="button"
														aria-pressed={value === option}
														disabled={disabled}
														onClick={() => {
															if (value !== option)
																setOverride(channelId, option)
														}}
														className={cn(
															dmSans125ClassName(),
															"h-7 cursor-pointer rounded-full px-3 text-[11.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
															value === option
																? "bg-white/[0.10] text-[#FAFAFA]"
																: "text-[#8B929E] hover:text-[#FAFAFA]",
														)}
													>
														{option === "proactive" ? "Proactive" : "Quiet"}
													</button>
												))}
											</div>
											<button
												type="button"
												disabled={disabled}
												onClick={() => setOverride(channelId, null)}
												className="cursor-pointer text-[#6B6B6B] transition-colors hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-50"
												aria-label={`Remove exception for #${channelName(channelId)}`}
											>
												<X className="size-4" />
											</button>
										</div>
									</div>
								))}
							</div>
							{addable.length > 0 ? (
								<Popover open={pickerOpen} onOpenChange={setPickerOpen}>
									<PopoverTrigger asChild>
										<button
											type="button"
											disabled={disabled}
											aria-expanded={pickerOpen}
											className={cn(
												dmSans125ClassName(),
												"flex min-h-[52px] w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-[13px] text-[#8B929E] outline-none transition-colors hover:bg-white/[0.03] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-50",
											)}
										>
											<Plus className="size-4 shrink-0" />
											<span className="truncate">Add a channel exception</span>
										</button>
									</PopoverTrigger>
									<PopoverContent
										align="start"
										className={cn(
											selectContentClass,
											"w-(--radix-popover-trigger-width) min-w-64 p-0",
										)}
									>
										<Command className="bg-transparent text-[#FAFAFA]">
											<CommandInput
												placeholder="Search channels…"
												className="text-[13px] text-[#FAFAFA] placeholder:text-[#737373]"
											/>
											<CommandList>
												<CommandEmpty className="py-6 text-center text-[13px] text-[#737373]">
													No channels found.
												</CommandEmpty>
												<CommandGroup>
													{addable.map((ch) => (
														<CommandItem
															key={ch.id}
															value={ch.id}
															keywords={[ch.name]}
															className={commandItemClass}
															onSelect={() => {
																setOverride(
																	ch.id,
																	activeMode === "all_channels"
																		? "quiet"
																		: "proactive",
																)
																setPickerOpen(false)
															}}
														>
															{ch.isPrivate ? "🔒 " : "# "}
															{ch.name}
														</CommandItem>
													))}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							) : channelsQuery.isLoading ||
								slackStatusQuery.isLoading ? null : (
								<p
									className={cn(
										dmSans125ClassName(),
										"px-4 py-3 text-[12px] text-[#737373]",
									)}
								>
									{slackStatusQuery.data?.connected === false
										? "Connect Slack to set per-channel exceptions."
										: "Invite Company Brain to a Slack channel to list it here."}
								</p>
							)}
						</div>
					</div>

					{!isAdmin ? (
						<div className="flex items-center gap-1.5 text-[12px] text-[#737373]">
							<Lock className="size-3.5" />
							Only organization admins can change these.
						</div>
					) : null}
				</div>
			)}
		</section>
	)
}
