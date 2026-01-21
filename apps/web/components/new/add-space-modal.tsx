"use client"

import { useState } from "react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { Dialog, DialogContent } from "@repo/ui/components/dialog"
import { cn } from "@lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon, Loader2 } from "lucide-react"
import { Button } from "@ui/components/button"
import { useProjectMutations } from "@/hooks/use-project-mutations"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"

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

export function AddSpaceModal({
	isOpen,
	onClose,
}: {
	isOpen: boolean
	onClose: () => void
}) {
	const [spaceName, setSpaceName] = useState("")
	const [emoji, setEmoji] = useState("📁")
	const [isEmojiOpen, setIsEmojiOpen] = useState(false)
	const { createProjectMutation } = useProjectMutations()

	const handleClose = () => {
		onClose()
		setSpaceName("")
		setEmoji("📁")
	}

	const handleCreate = () => {
		const trimmedName = spaceName.trim()
		if (!trimmedName) return

		createProjectMutation.mutate(
			{ name: trimmedName, emoji: emoji || undefined },
			{
				onSuccess: () => {
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
							<p
								className={cn(
									"font-semibold text-[#fafafa]",
									dmSans125ClassName(),
								)}
							>
								Create new space
							</p>
							<p
								className={cn(
									"text-[#737373] font-medium text-[16px] leading-[1.35]",
								)}
							>
								Create spaces to organize your memories and documents and create
								a context rich environment
							</p>
						</div>
						<DialogPrimitive.Close
							className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border border-[rgba(115,115,115,0.2)] shrink-0"
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
									Creating...
								</>
							) : (
								<>
									<span className="text-[10px] mr-1">+</span>
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
