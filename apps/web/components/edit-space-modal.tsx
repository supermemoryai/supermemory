"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Loader2, XIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { useSpaceContext, useUpdateSpace } from "@/hooks/use-space-context"
import { CONTEXT_PRESETS } from "@/components/add-space-modal"
import { DEFAULT_PROJECT_ID } from "@lib/constants"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog"

const INPUT_SHADOW =
	"0px 1px 2px 0px rgba(0,43,87,0.1), inset 0px 0px 0px 1px rgba(43,49,67,0.08), inset 0px 1px 1px 0px rgba(0,0,0,0.08), inset 0px 2px 4px 0px rgba(0,0,0,0.02)"

type EditSpaceModalProps = {
	containerTag: string
	currentName: string
	currentEmoji?: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function EditSpaceModal({
	containerTag,
	currentName,
	currentEmoji = "📁",
	open,
	onOpenChange,
}: EditSpaceModalProps) {
	const isDefault = !containerTag || containerTag === DEFAULT_PROJECT_ID
	const { data, isLoading } = useSpaceContext(containerTag, open)
	const update = useUpdateSpace()
	const [name, setName] = useState(currentName)
	const [context, setContext] = useState("")

	useEffect(() => {
		if (!open) return
		setName(data?.name ?? currentName ?? "")
		setContext(data?.entityContext ?? "")
	}, [open, data?.name, data?.entityContext, currentName])

	const handleSave = () => {
		update.mutate(
			{
				containerTag,
				name: isDefault ? undefined : name.trim() || undefined,
				entityContext: context.trim() ? context.trim() : null,
			},
			{ onSuccess: () => onOpenChange(false) },
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
								Edit space
							</DialogTitle>
							<p
								className={cn(
									dmSansClassName(),
									"text-[#737373] text-[13px] leading-snug",
								)}
							>
								Rename this space and tell Nova what to remember in it.
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

					<div className="flex flex-col gap-1.5">
						<div className="flex gap-[6px] items-center">
							<div
								className="bg-[#14161A] border border-[rgba(82,89,102,0.2)] flex size-[45px] shrink-0 items-center justify-center rounded-[12px] p-3"
								style={{ boxShadow: INPUT_SHADOW }}
								aria-hidden
							>
								<span className="text-xl">{currentEmoji}</span>
							</div>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={isDefault || update.isPending}
								placeholder="Space name"
								maxLength={120}
								className={cn(
									"flex-1 bg-[#14161A] border border-[rgba(82,89,102,0.2)] px-4 py-3 rounded-[12px] text-[#fafafa] text-[14px] placeholder:text-[#737373] focus:outline-none focus:ring-1 focus:ring-[rgba(115,115,115,0.3)] disabled:opacity-60",
									dmSansClassName(),
								)}
								style={{ boxShadow: INPUT_SHADOW }}
							/>
						</div>
						{isDefault && (
							<span className="pl-1 text-[11px] text-[#525966]">
								The default space can't be renamed.
							</span>
						)}
					</div>

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
							value={context}
							onChange={(e) => setContext(e.target.value)}
							disabled={isLoading || update.isPending}
							placeholder="Tell Nova what matters here — it shapes which memories get extracted."
							maxLength={750}
							className={cn(
								dmSansClassName(),
								"min-h-[56px] w-full resize-y rounded-[12px] border border-[rgba(82,89,102,0.2)] bg-[#14161A] px-4 py-3 text-[14px] leading-relaxed text-[#fafafa] placeholder:text-[#737373] focus:outline-none focus:ring-1 focus:ring-[rgba(115,115,115,0.3)] disabled:opacity-60",
							)}
							style={{ boxShadow: INPUT_SHADOW }}
						/>
						<div className="flex flex-wrap items-center gap-1.5 pl-1">
							<span className="text-[11px] text-[#737373]">Try a preset</span>
							{CONTEXT_PRESETS.map((preset) => (
								<button
									key={preset.label}
									type="button"
									onClick={() => setContext(preset.text)}
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

					<div className="flex items-center justify-end gap-[22px]">
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							disabled={update.isPending}
							className={cn(
								"text-[#737373] font-medium text-[14px] cursor-pointer transition-colors hover:text-[#999]",
								dmSansClassName(),
							)}
						>
							Cancel
						</button>
						<Button
							variant="insideOut"
							onClick={handleSave}
							disabled={update.isPending}
							className="px-4 py-[10px] rounded-full"
						>
							{update.isPending ? (
								<>
									<Loader2 className="size-4 animate-spin mr-2" />
									Saving…
								</>
							) : (
								"Save"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
