"use client"

import { useState } from "react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"
import { cn } from "@lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon, Loader2 } from "lucide-react"
import { Button } from "@ui/components/button"
import { useProjectMutations } from "@/hooks/use-project-mutations"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import { analytics } from "@/lib/analytics"
import { $fetch } from "@lib/api"

const EMOJI_LIST = [
	"📁",
	"📂",
	"🗂️",
	"📚",
	"📖",
	"📝",
	"✏️",
	"📌",
	"🎯",
	"🚀",
	"💡",
	"⭐",
	"🔥",
	"💎",
	"🎨",
	"🎵",
	"🏠",
	"💼",
	"🛠️",
	"⚙️",
	"🔧",
	"📊",
	"📈",
	"💰",
	"🌟",
	"✨",
	"🌈",
	"🌸",
	"🌺",
	"🍀",
	"🌿",
	"🌴",
	"🐶",
	"🐱",
	"🦊",
	"🦁",
	"🐼",
	"🐨",
	"🦄",
	"🐝",
	"❤️",
	"💜",
	"💙",
	"💚",
	"💛",
	"🧡",
	"🖤",
	"🤍",
]

export const CONTEXT_PRESETS: { label: string; text: string }[] = [
	{
		label: "Work project",
		text: "Tracks a work project — decisions, owners, deadlines, and current status.",
	},
	{
		label: "Client",
		text: "About a client — meetings, requirements, and account context.",
	},
	{
		label: "Research",
		text: "Research notes — sources, key findings, and open questions.",
	},
	{
		label: "Personal",
		text: "My personal space — notes, ideas, and things to remember.",
	},
]

export function AddSpaceModal({
	isOpen,
	onClose,
	onCreated,
}: {
	isOpen: boolean
	onClose: () => void
	onCreated?: (containerTag: string) => void
}) {
	const [spaceName, setSpaceName] = useState("")
	const [spaceContext, setSpaceContext] = useState("")
	const [showContext, setShowContext] = useState(false)
	const [emoji, setEmoji] = useState("📁")
	const [isEmojiOpen, setIsEmojiOpen] = useState(false)
	const { createProjectMutation } = useProjectMutations()

	const handleClose = () => {
		onClose()
		setSpaceName("")
		setSpaceContext("")
		setShowContext(false)
		setEmoji("📁")
	}

	const handleCreate = () => {
		const trimmedName = spaceName.trim()
		if (!trimmedName) return

		createProjectMutation.mutate(
			{ name: trimmedName, emoji: emoji || undefined },
			{
				onSuccess: async (data) => {
					analytics.spaceCreated()
					const tag = data?.containerTag
					const context = showContext ? spaceContext.trim() : ""
					if (tag && context) {
						try {
							await $fetch(`@patch/container-tags/${tag}`, {
								body: { entityContext: context },
							})
						} catch {}
					}
					if (tag) onCreated?.(tag)
					handleClose()
				},
			},
		)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (
			e.key === "Enter" &&
			spaceName.trim() &&
			!createProjectMutation.isPending
		) {
			e.preventDefault()
			handleCreate()
		}
	}

	const handleEmojiSelect = (selectedEmoji: string) => {
		setEmoji(selectedEmoji)
		setIsEmojiOpen(false)
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent
				className={cn(
					"w-[90%]! max-w-[500px]! border-none bg-[#1B1F24] flex flex-col p-4 gap-4 rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<div className="flex flex-col gap-4">
					<div className="flex justify-between items-start gap-4">
						<div className="pl-1 space-y-1 flex-1">
							<DialogTitle
								className={cn(
									"font-semibold text-[#fafafa]",
									dmSans125ClassName(),
								)}
							>
								New space
							</DialogTitle>
							<p
								className={cn(
									dmSansClassName(),
									"text-[#737373] text-[13px] leading-snug",
								)}
							>
								Group related memories and give Nova context for this space.
							</p>
						</div>
						<DialogPrimitive.Close
							className="bg-[#0D121A] size-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border border-[rgba(115,115,115,0.2)] shrink-0"
							style={{
								boxShadow: "inset 1.313px 1.313px 3.938px 0px rgba(0,0,0,0.7)",
							}}
							data-slot="dialog-close"
						>
							<XIcon stroke="#737373" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>

					<div className="flex gap-[6px] items-center">
						<Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
							<PopoverTrigger asChild>
								<button
									type="button"
									id="emoji-picker-trigger"
									className="bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex items-center justify-center p-3 rounded-[12px] size-[45px] cursor-pointer transition-colors hover:bg-[#1a1e24]"
									style={{
										boxShadow:
											"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
									}}
								>
									<span className="text-xl">{emoji}</span>
								</button>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								className="w-[280px] p-3 bg-[#14161A] border border-[rgba(82,89,102,0.2)] rounded-[12px]"
								style={{
									boxShadow:
										"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08)",
								}}
							>
								<div className="grid grid-cols-8 gap-1">
									{EMOJI_LIST.map((e) => (
										<button
											key={e}
											type="button"
											onClick={() => handleEmojiSelect(e)}
											className={cn(
												"size-8 flex items-center justify-center rounded-md text-lg cursor-pointer transition-colors hover:bg-[#1B1F24]",
												emoji === e &&
													"bg-[#1B1F24] ring-1 ring-[rgba(115,115,115,0.3)]",
											)}
										>
											{e}
										</button>
									))}
								</div>
							</PopoverContent>
						</Popover>

						<input
							type="text"
							id="space-name-input"
							value={spaceName}
							onChange={(e) => setSpaceName(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Space name"
							className={cn(
								"flex-1 bg-[#14161A] border border-[rgba(82,89,102,0.2)] px-4 py-3 rounded-[12px] text-[#fafafa] text-[14px] placeholder:text-[#737373] focus:outline-none focus:ring-1 focus:ring-[rgba(115,115,115,0.3)]",
								dmSansClassName(),
							)}
							style={{
								boxShadow:
									"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
							}}
							autoFocus
						/>
					</div>

					{!showContext ? (
						<button
							type="button"
							onClick={() => setShowContext(true)}
							className={cn(
								dmSansClassName(),
								"flex cursor-pointer items-center gap-1.5 self-start pl-1 text-[13px] font-medium text-[#A3A3A3] transition-colors hover:text-[#fafafa]",
							)}
						>
							<span className="text-[16px] leading-none text-[#737373]">+</span>
							<span className="inline-flex items-baseline gap-1.5">
								Tell Nova what to remember
								<span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#4BA0FA]">
									New
								</span>
							</span>
						</button>
					) : (
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-1.5 pl-1">
								<span
									className={cn(
										dmSans125ClassName(),
										"text-[12px] font-medium text-[#A3A3A3]",
									)}
								>
									What to remember
								</span>
								<span className="ml-auto text-[11px] text-[#525966]">
									Optional
								</span>
							</div>
							<textarea
								value={spaceContext}
								onChange={(e) => setSpaceContext(e.target.value)}
								placeholder="Tell Nova what matters here — it shapes which memories get extracted."
								maxLength={750}
								className={cn(
									dmSansClassName(),
									"min-h-[56px] w-full resize-y rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#14161A] px-4 py-3 text-[14px] leading-relaxed text-[#fafafa] placeholder:text-[#737373] focus:outline-none focus:ring-1 focus:ring-[rgba(115,115,115,0.3)]",
								)}
								style={{
									boxShadow:
										"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)",
								}}
							/>
							<div className="flex flex-wrap items-center gap-1.5 pl-1">
								<span className="text-[11px] text-[#737373]">Try a preset</span>
								{CONTEXT_PRESETS.map((preset) => (
									<button
										key={preset.label}
										type="button"
										onClick={() => setSpaceContext(preset.text)}
										className={cn(
											dmSansClassName(),
											"cursor-pointer rounded-full bg-[#1E232B] px-2.5 py-1 text-[11px] font-medium text-[#C8C8C8] transition-colors hover:bg-[#262c36] hover:text-white",
										)}
									>
										{preset.label}
									</button>
								))}
							</div>
						</div>
					)}

					<div className="flex items-center justify-end gap-[22px]">
						<button
							type="button"
							onClick={handleClose}
							disabled={createProjectMutation.isPending}
							className={cn(
								"text-[#737373] font-medium text-[14px] cursor-pointer transition-colors hover:text-[#999]",
								dmSansClassName(),
							)}
						>
							Cancel
						</button>
						<Button
							variant="insideOut"
							onClick={handleCreate}
							disabled={!spaceName.trim() || createProjectMutation.isPending}
							className="px-4 py-[10px] rounded-full"
						>
							{createProjectMutation.isPending ? (
								<>
									<Loader2 className="size-4 animate-spin mr-2" />
									Creating…
								</>
							) : (
								<>
									<span className="mr-1 text-[16px] leading-none">+</span>
									Create Space
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
