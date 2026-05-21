"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Download, X } from "lucide-react"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { RAYCAST_EXTENSION_URL } from "@lib/constants"
import { RaycastIcon } from "@/components/integration-icons"
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"
import type { InstallStep } from "@/lib/plugin-catalog"
import { INSET, InstallSteps } from "./install-steps"

const RAYCAST_STEPS: InstallStep[] = [
	{
		title: "Copy your API key",
		description: "You won't be able to see it again — store it somewhere safe.",
		code: "sm_...",
		copyLabel: "API key",
		secret: true,
	},
	{
		title: "Install the Raycast extension",
		description: "Open the Supermemory extension page in the Raycast Store.",
	},
	{
		title: "Paste your key in Raycast preferences",
		description:
			"Open Raycast preferences → Extensions → Supermemory, then paste the key above.",
	},
	{
		title: 'Run "Add Memory" or "Search Memories"',
		description: "Trigger Raycast and start using Supermemory from anywhere.",
	},
]

function RaycastIconBox() {
	return (
		<div
			className={cn(
				"flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F]",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]",
			)}
		>
			<RaycastIcon className="size-6" />
		</div>
	)
}

export function RaycastSetupModal({
	open,
	onOpenChange,
	apiKey,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	apiKey: string
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0,0,0,0.25), 0.711px 0.711px 0.711px 0 rgba(255,255,255,0.10) inset",
				}}
				className={cn(
					dmSans125ClassName(),
					"flex max-h-[88dvh] flex-col gap-3 overflow-hidden border border-white/[0.12] bg-[#1B1F24] p-0 px-3 pt-3 pb-4 rounded-2xl md:px-4 sm:max-w-[560px] sm:rounded-[22px]",
				)}
			>
				<DialogTitle className="sr-only">Set up Raycast Extension</DialogTitle>

				<div className="flex shrink-0 items-center gap-3">
					<RaycastIconBox />
					<div className="min-w-0 flex-1">
						<p
							className={cn(
								dmSans125ClassName(),
								"truncate text-[16px] font-semibold leading-tight text-[#FAFAFA]",
							)}
						>
							Set up Raycast Extension
						</p>
						<p
							className={cn(
								dmSans125ClassName(),
								"mt-0.5 truncate text-[12px] text-[#A1A1AA]",
							)}
						>
							Copy your key and follow these steps to finish.
						</p>
					</div>
					<DialogPrimitive.Close
						type="button"
						aria-label="Close"
						className={cn(
							"flex size-7 items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80 focus:outline-none",
							INSET,
						)}
					>
						<X className="size-4 text-[#737373]" />
					</DialogPrimitive.Close>
				</div>

				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
					<div
						className={cn(
							"min-w-0 rounded-[14px] bg-[#14161A] p-4 sm:p-5",
							INSET,
						)}
					>
						<InstallSteps steps={RAYCAST_STEPS} apiKey={apiKey} />
					</div>
				</div>

				<div className="flex shrink-0 items-center justify-end gap-2">
					<button
						type="button"
						onClick={() => window.open(RAYCAST_EXTENSION_URL, "_blank")}
						className={cn(
							dmSans125ClassName(),
							"flex h-9 items-center gap-1.5 rounded-full bg-[#0D121A] px-5 text-[13px] font-medium text-[#FAFAFA] transition-opacity hover:opacity-80",
							INSET,
						)}
					>
						<Download className="size-3.5 text-[#A1A1AA]" /> Install extension
					</button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
