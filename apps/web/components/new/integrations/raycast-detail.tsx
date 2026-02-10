"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { RaycastIcon } from "@/components/new/integration-icons"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { generateId } from "@lib/generate-id"
import { RAYCAST_EXTENSION_URL } from "@repo/lib/constants"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogPortal,
} from "@ui/components/dialog"
import { useMutation } from "@tanstack/react-query"
import { Check, Copy, Download, Key, Loader } from "lucide-react"
import { useId, useState } from "react"
import { toast } from "sonner"

function PillButton({
	children,
	onClick,
	disabled,
}: {
	children: React.ReactNode
	onClick?: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"relative flex items-center justify-center gap-2",
				"bg-[#0D121A]",
				"rounded-full h-11 px-4 flex-1",
				"cursor-pointer transition-opacity hover:opacity-80",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				dmSans125ClassName(),
			)}
		>
			{children}
		</button>
	)
}

export function RaycastDetail() {
	const { org } = useAuth()
	const [showModal, setShowModal] = useState(false)
	const [apiKey, setApiKey] = useState("")
	const [copied, setCopied] = useState(false)
	const apiKeyId = useId()

	const handleCopy = async (key: string) => {
		try {
			await navigator.clipboard.writeText(key)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
			toast.success("API key copied to clipboard!")
		} catch {
			toast.error("Failed to copy API key")
		}
	}

	const createKeyMutation = useMutation({
		mutationFn: async () => {
			if (!org?.id) throw new Error("Organization ID is required")
			const res = await authClient.apiKey.create({
				metadata: { organizationId: org.id, type: "raycast-extension" },
				name: `raycast-${generateId().slice(0, 8)}`,
				prefix: `sm_${org.id}_`,
			})
			return res.key
		},
		onSuccess: (key) => {
			setApiKey(key)
			setShowModal(true)
			setCopied(false)
			handleCopy(key)
		},
		onError: (error) => {
			toast.error("Failed to create API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	return (
		<>
			<div
				className={cn(
					"bg-[#14161A] rounded-[14px] p-6",
					"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				)}
			>
				<div className="flex flex-col gap-6">
					<div className="flex items-center gap-4">
						<RaycastIcon className="shrink-0 w-10 h-10" />
						<div className="flex flex-col gap-1">
							<p className={cn(dmSans125ClassName(), "font-semibold text-[16px] text-[#FAFAFA]")}>
								Raycast Extension
							</p>
							<p className={cn(dmSans125ClassName(), "text-[14px] text-[#737373]")}>
								Add and search memories from Mac and Windows
							</p>
						</div>
					</div>

					<div className="flex gap-4">
						<PillButton onClick={() => createKeyMutation.mutate()} disabled={createKeyMutation.isPending}>
							{createKeyMutation.isPending ? (
								<Loader className="size-4 text-[#FAFAFA] animate-spin" />
							) : (
								<Key className="size-4 text-[#FAFAFA]" />
							)}
							<span className="text-[14px] text-[#FAFAFA] font-medium">
								{createKeyMutation.isPending ? "Generating..." : "Get API key"}
							</span>
						</PillButton>
						<PillButton onClick={() => window.open(RAYCAST_EXTENSION_URL, "_blank")}>
							<Download className="size-4 text-[#FAFAFA]" />
							<span className="text-[14px] text-[#FAFAFA] font-medium">Install extension</span>
						</PillButton>
					</div>
				</div>
			</div>

			<Dialog open={showModal} onOpenChange={(open) => {
				setShowModal(open)
				if (!open) { setApiKey(""); setCopied(false) }
			}}>
				<DialogPortal>
					<DialogContent className="bg-[#14161A] border border-white/10 text-[#FAFAFA] md:max-w-md z-100">
						<DialogHeader>
							<DialogTitle className={cn(dmSans125ClassName(), "text-[#FAFAFA] text-lg font-semibold")}>
								Setup Raycast Extension
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<label htmlFor={apiKeyId} className={cn(dmSans125ClassName(), "text-sm font-medium text-[#737373]")}>
									Your Raycast API Key
								</label>
								<div className="flex items-center gap-2">
									<input
										id={apiKeyId}
										type="text"
										value={apiKey}
										readOnly
										className={cn("flex-1 bg-[#0D121A] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#FAFAFA] font-mono", dmSans125ClassName())}
									/>
									<button
										type="button"
										onClick={() => handleCopy(apiKey)}
										className="p-2 rounded-lg bg-[#0D121A] border border-white/10 text-[#737373] hover:text-[#FAFAFA] transition-colors"
									>
										{copied ? <Check className="h-4 w-4 text-[#4BA0FA]" /> : <Copy className="h-4 w-4" />}
									</button>
								</div>
							</div>
							<div className="space-y-3">
								<h4 className={cn(dmSans125ClassName(), "text-sm font-medium text-[#737373]")}>Follow these steps:</h4>
								<div className="space-y-2">
									{[
										"Install the Raycast extension from the Raycast Store",
										"Open Raycast preferences and paste your API key",
										"Use \"Add Memory\" or \"Search Memories\" commands!",
									].map((text, i) => (
										<div key={text} className="flex items-start gap-3">
											<div className="shrink-0 w-6 h-6 bg-[#FF6363]/20 text-[#FF6363] rounded-full flex items-center justify-center text-xs font-medium">
												{i + 1}
											</div>
											<p className={cn(dmSans125ClassName(), "text-sm text-[#737373]")}>{text}</p>
										</div>
									))}
								</div>
							</div>
							<button
								type="button"
								onClick={() => window.open(RAYCAST_EXTENSION_URL, "_blank")}
								className={cn(
									"w-full flex items-center justify-center gap-2",
									"bg-[#FF6363] hover:bg-[#FF6363]/90 text-white",
									"rounded-lg h-11 px-4 font-medium text-sm transition-colors",
									dmSans125ClassName(),
								)}
							>
								<RaycastIcon className="size-4" />
								Install Extension
							</button>
						</div>
					</DialogContent>
				</DialogPortal>
			</Dialog>
		</>
	)
}
