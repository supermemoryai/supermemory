"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { $fetch } from "@lib/api"
import { cn } from "@lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"
import { Granola } from "@ui/assets/icons"
import { dmSans125ClassName } from "@/lib/fonts"
import { INSET } from "./integrations/install-steps"

function GranolaIconBox() {
	return (
		<div
			className={cn(
				"flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F]",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]",
			)}
		>
			<Granola className="size-6" />
		</div>
	)
}

export function GranolaConnectModal({
	open,
	onOpenChange,
	containerTags,
	onSuccess,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	containerTags?: string[]
	onSuccess?: () => void
}) {
	const queryClient = useQueryClient()
	const [apiKey, setApiKey] = useState("")
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	// Reset form whenever the modal opens.
	useEffect(() => {
		if (open) {
			setApiKey("")
			setErrorMessage(null)
		}
	}, [open])

	const connectMutation = useMutation({
		mutationFn: async (key: string) => {
			const response = await $fetch("@post/connections/:provider", {
				params: { provider: "granola" },
				body: {
					containerTags,
					metadata: { apiKey: key },
				},
			})
			if (response.error) {
				const msg =
					(response.error as { message?: string })?.message ||
					"Failed to connect"
				throw new Error(msg)
			}
			return response.data
		},
		onSuccess: () => {
			toast.success("Granola connected")
			queryClient.invalidateQueries({ queryKey: ["connections"] })
			onSuccess?.()
			onOpenChange(false)
		},
		onError: (error) => {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to connect",
			)
		},
	})

	const trimmedKey = apiKey.trim()
	const canConnect = trimmedKey.length > 0 && !connectMutation.isPending

	const handleConnect = () => {
		setErrorMessage(null)
		connectMutation.mutate(trimmedKey)
	}

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
					"flex max-h-[88dvh] flex-col gap-3 overflow-hidden border border-white/[0.12] bg-[#1B1F24] p-0 px-3 pt-3 pb-4 rounded-2xl md:px-4 sm:max-w-[480px] sm:rounded-[22px]",
				)}
			>
				<DialogTitle className="sr-only">Connect Granola</DialogTitle>

				<div className="flex shrink-0 items-center gap-3">
					<GranolaIconBox />
					<div className="min-w-0 flex-1">
						<p
							className={cn(
								dmSans125ClassName(),
								"truncate text-[16px] font-semibold leading-tight text-[#FAFAFA]",
							)}
						>
							Connect Granola
						</p>
						<p
							className={cn(
								dmSans125ClassName(),
								"mt-0.5 truncate text-[12px] text-[#A1A1AA]",
							)}
						>
							Paste your API key to sync meeting notes.
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

				<div
					className={cn(
						"min-w-0 rounded-[14px] bg-[#14161A] p-4 sm:p-5",
						INSET,
					)}
				>
					<label
						htmlFor="granola-api-key"
						className={cn(
							dmSans125ClassName(),
							"mb-2 block text-[12px] font-medium text-[#A1A1AA]",
						)}
					>
						Granola API Key
					</label>
					<input
						id="granola-api-key"
						type="password"
						autoComplete="off"
						spellCheck={false}
						value={apiKey}
						onChange={(e) => {
							setApiKey(e.target.value)
							if (errorMessage) setErrorMessage(null)
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" && canConnect) handleConnect()
						}}
						placeholder="grn_..."
						className={cn(
							dmSans125ClassName(),
							"w-full rounded-[10px] bg-[#0D121A] px-3 py-2.5 text-[13px] text-[#FAFAFA] placeholder:text-[#52525B] outline-none border border-white/[0.06] focus:border-white/[0.16]",
						)}
					/>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-2 text-[11px] leading-snug text-[#737373]",
						)}
					>
						Create one in Granola → Settings → Connectors → API keys. Requires a
						Business or Enterprise plan.
					</p>
					{errorMessage && (
						<p
							className={cn(
								dmSans125ClassName(),
								"mt-2 text-[12px] leading-snug text-[#F87171]",
							)}
						>
							{errorMessage}
						</p>
					)}
				</div>

				<div className="flex shrink-0 items-center justify-end gap-2">
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className={cn(
							dmSans125ClassName(),
							"flex h-9 items-center gap-1.5 rounded-full bg-[#0D121A] px-5 text-[13px] font-medium text-[#A1A1AA] transition-opacity hover:opacity-80",
							INSET,
						)}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleConnect}
						disabled={!canConnect}
						className={cn(
							dmSans125ClassName(),
							"flex h-9 items-center gap-1.5 rounded-full bg-[#4BA0FA] px-5 text-[13px] font-semibold text-[#00171A] transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed",
						)}
					>
						{connectMutation.isPending && (
							<Loader2 className="size-3.5 animate-spin" />
						)}
						Connect
					</button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
