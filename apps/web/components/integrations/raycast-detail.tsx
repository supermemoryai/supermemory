"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { RaycastIcon } from "@/components/integration-icons"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { generateId } from "@lib/generate-id"
import { RAYCAST_EXTENSION_URL } from "@lib/constants"
import { useMutation } from "@tanstack/react-query"
import { Download, Key, Loader } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { RaycastSetupModal } from "./raycast-setup-modal"

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

	const createKeyMutation = useMutation({
		mutationFn: async () => {
			if (!org?.id) throw new Error("Organization ID is required")
			const res = await authClient.apiKey.create({
				metadata: { organizationId: org.id, type: "raycast-extension" },
				name: `raycast-${generateId().slice(0, 8)}`,
				prefix: `sm_${org.id}_`,
			})
			if (res.error)
				throw new Error(res.error.message ?? "Failed to create API key")
			if (!res.data?.key) throw new Error("API key missing from response")
			return res.data.key
		},
		onSuccess: (key) => {
			setApiKey(key)
			setShowModal(true)
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
						<RaycastIcon className="shrink-0 size-10" />
						<div className="flex flex-col gap-1">
							<p
								className={cn(
									dmSans125ClassName(),
									"font-semibold text-[16px] text-[#FAFAFA]",
								)}
							>
								Raycast Extension
							</p>
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[14px] text-[#737373]",
								)}
							>
								Add and search memories from Mac and Windows
							</p>
						</div>
					</div>

					<div className="flex gap-4">
						<PillButton
							onClick={() => createKeyMutation.mutate()}
							disabled={createKeyMutation.isPending}
						>
							{createKeyMutation.isPending ? (
								<Loader className="size-4 text-[#FAFAFA] animate-spin" />
							) : (
								<Key className="size-4 text-[#FAFAFA]" />
							)}
							<span className="text-[14px] text-[#FAFAFA] font-medium">
								{createKeyMutation.isPending ? "Generating..." : "Get API key"}
							</span>
						</PillButton>
						<PillButton
							onClick={() => window.open(RAYCAST_EXTENSION_URL, "_blank")}
						>
							<Download className="size-4 text-[#FAFAFA]" />
							<span className="text-[14px] text-[#FAFAFA] font-medium">
								Install extension
							</span>
						</PillButton>
					</div>
				</div>
			</div>

			<RaycastSetupModal
				open={showModal}
				onOpenChange={(open) => {
					setShowModal(open)
					if (!open) setApiKey("")
				}}
				apiKey={apiKey}
			/>
		</>
	)
}
