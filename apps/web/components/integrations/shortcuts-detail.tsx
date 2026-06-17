"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { AppleShortcutsIcon } from "@/components/integration-icons"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { generateId } from "@lib/generate-id"
import {
	ADD_MEMORY_SHORTCUT_URL,
	SEARCH_MEMORY_SHORTCUT_URL,
} from "@lib/constants"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogPortal,
} from "@ui/components/dialog"
import { useMutation } from "@tanstack/react-query"
import { Check, Copy, Loader, Plus, Search } from "lucide-react"
import Image from "next/image"
import { useId, useState } from "react"
import { toast } from "sonner"

type ShortcutType = "add" | "search"

function PillButton({
	children,
	onClick,
	disabled,
	className,
}: {
	children: React.ReactNode
	onClick?: (e: React.MouseEvent) => void
	disabled?: boolean
	className?: string
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
				className,
			)}
		>
			{children}
		</button>
	)
}

export function useShortcutsConnect() {
	const { org } = useAuth()
	const [showSetupDialog, setShowSetupDialog] = useState(false)
	const [apiKey, setApiKey] = useState("")
	const [copied, setCopied] = useState(false)
	const [shortcutType, setShortcutType] = useState<ShortcutType | null>(null)

	const copyApiKey = async (key: string) => {
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
				metadata: { organizationId: org.id, type: "ios-shortcut" },
				name: `ios-${generateId().slice(0, 8)}`,
				prefix: `sm_${org.id}_`,
			})
			if (res.error)
				throw new Error(res.error.message ?? "Failed to create API key")
			if (!res.data?.key) throw new Error("API key missing from response")
			return res.data.key
		},
		onSuccess: (key) => {
			setApiKey(key)
			setShowSetupDialog(true)
			setCopied(false)
			copyApiKey(key)
		},
		onError: (error) => {
			toast.error("Failed to create API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const connect = (type: ShortcutType) => {
		if (createKeyMutation.isPending) return
		setShortcutType(type)
		createKeyMutation.mutate()
	}

	const openShortcut = () => {
		if (shortcutType === "add") {
			window.open(ADD_MEMORY_SHORTCUT_URL, "_blank")
		} else if (shortcutType === "search") {
			window.open(SEARCH_MEMORY_SHORTCUT_URL, "_blank")
		}
	}

	const dialog = (
		<ShortcutsSetupDialog
			apiKey={apiKey}
			copied={copied}
			onCopy={() => copyApiKey(apiKey)}
			onOpenChange={(open) => {
				setShowSetupDialog(open)
				if (!open) {
					setShortcutType(null)
					setApiKey("")
					setCopied(false)
				}
			}}
			onOpenShortcut={openShortcut}
			open={showSetupDialog}
			shortcutType={shortcutType}
		/>
	)

	return {
		connect,
		dialog,
		isPending: createKeyMutation.isPending,
		pendingType: createKeyMutation.isPending ? shortcutType : null,
	}
}

export type ShortcutsConnectController = ReturnType<typeof useShortcutsConnect>

export function ShortcutsConnectButtons({
	controller,
}: {
	controller: ShortcutsConnectController
}) {
	const { connect, isPending, pendingType } = controller
	return (
		<div className="flex flex-col gap-2 sm:flex-row">
			<PillButton
				className="h-9 flex-none min-w-[88px]"
				onClick={(e) => {
					e.stopPropagation()
					connect("add")
				}}
				disabled={isPending}
			>
				{pendingType === "add" ? (
					<Loader className="size-4 text-[#FAFAFA] animate-spin" />
				) : (
					<Plus className="size-4 shrink-0 text-[#FAFAFA]" />
				)}
				<span className="text-[13px] text-[#FAFAFA] font-medium whitespace-nowrap">
					{pendingType === "add" ? "Creating..." : "Add"}
				</span>
			</PillButton>
			<PillButton
				className="h-9 flex-none min-w-[88px]"
				onClick={(e) => {
					e.stopPropagation()
					connect("search")
				}}
				disabled={isPending}
			>
				{pendingType === "search" ? (
					<Loader className="size-4 text-[#FAFAFA] animate-spin" />
				) : (
					<Search className="size-4 shrink-0 text-[#FAFAFA]" />
				)}
				<span className="text-[13px] text-[#FAFAFA] font-medium whitespace-nowrap">
					{pendingType === "search" ? "Creating..." : "Search"}
				</span>
			</PillButton>
		</div>
	)
}

function ShortcutsSetupDialog({
	apiKey,
	copied,
	onCopy,
	onOpenChange,
	onOpenShortcut,
	open,
	shortcutType,
}: {
	apiKey: string
	copied: boolean
	onCopy: () => void
	onOpenChange: (open: boolean) => void
	onOpenShortcut: () => void
	open: boolean
	shortcutType: ShortcutType | null
}) {
	const apiKeyId = useId()
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPortal>
				<DialogContent className="bg-[#14161A] border border-white/10 text-[#FAFAFA] md:max-w-md z-100">
					<DialogHeader>
						<DialogTitle
							className={cn(
								dmSans125ClassName(),
								"text-[#FAFAFA] text-lg font-semibold",
							)}
						>
							Setup Apple Shortcut
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<label
								htmlFor={apiKeyId}
								className={cn(
									dmSans125ClassName(),
									"text-sm font-medium text-[#737373]",
								)}
							>
								Your API Key
							</label>
							<div className="flex items-center gap-2">
								<input
									id={apiKeyId}
									type="text"
									value={apiKey}
									readOnly
									className={cn(
										"flex-1 bg-[#0D121A] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#FAFAFA] font-mono",
										dmSans125ClassName(),
									)}
								/>
								<button
									type="button"
									onClick={onCopy}
									className="p-2 rounded-lg bg-[#0D121A] border border-white/10 text-[#737373] hover:text-[#FAFAFA] transition-colors"
								>
									{copied ? (
										<Check className="size-4 text-[#4BA0FA]" />
									) : (
										<Copy className="size-4" />
									)}
								</button>
							</div>
						</div>
						<div className="space-y-3">
							<h4
								className={cn(
									dmSans125ClassName(),
									"text-sm font-medium text-[#737373]",
								)}
							>
								Follow these steps:
							</h4>
							<div className="space-y-2">
								{[
									'Click "Add to Shortcuts" below to open the shortcut',
									"Paste your API key when prompted",
									"Start using your shortcut!",
								].map((text, i) => (
									<div key={text} className="flex items-start gap-3">
										<div className="shrink-0 size-6 bg-[#4BA0FA]/20 text-[#4BA0FA] rounded-full flex items-center justify-center text-xs font-medium">
											{i + 1}
										</div>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-sm text-[#737373]",
											)}
										>
											{text}
										</p>
									</div>
								))}
							</div>
						</div>
						<button
							type="button"
							onClick={onOpenShortcut}
							disabled={!shortcutType}
							className={cn(
								"w-full flex items-center justify-center gap-2",
								"bg-[#4BA0FA] hover:bg-[#4BA0FA]/90 text-white",
								"rounded-lg h-11 px-4 font-medium text-sm",
								"disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
								dmSans125ClassName(),
							)}
						>
							<Image
								src="/images/ios-shortcuts.png"
								alt="iOS Shortcuts"
								width={16}
								height={16}
							/>
							Add to Shortcuts
						</button>
					</div>
				</DialogContent>
			</DialogPortal>
		</Dialog>
	)
}

export function ShortcutsDetail() {
	const controller = useShortcutsConnect()
	const { connect, dialog, isPending, pendingType } = controller

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
						<AppleShortcutsIcon />
						<div className="flex flex-col gap-1">
							<p
								className={cn(
									dmSans125ClassName(),
									"font-semibold text-[16px] text-[#FAFAFA]",
								)}
							>
								Apple Shortcuts
							</p>
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[14px] text-[#737373]",
								)}
							>
								Add memories directly from iPhone, iPad or Mac
							</p>
						</div>
					</div>

					<div className="flex gap-4">
						<PillButton onClick={() => connect("add")} disabled={isPending}>
							{pendingType === "add" ? (
								<Loader className="size-4 text-[#FAFAFA] animate-spin" />
							) : (
								<Plus className="size-4 text-[#FAFAFA]" />
							)}
							<span className="text-[14px] text-[#FAFAFA] font-medium">
								{pendingType === "add" ? "Creating..." : "Add memory shortcut"}
							</span>
						</PillButton>
						<PillButton onClick={() => connect("search")} disabled={isPending}>
							{pendingType === "search" ? (
								<Loader className="size-4 text-[#FAFAFA] animate-spin" />
							) : (
								<Search className="size-4 text-[#FAFAFA]" />
							)}
							<span className="text-[14px] text-[#FAFAFA] font-medium">
								{pendingType === "search"
									? "Creating..."
									: "Search memory shortcut"}
							</span>
						</PillButton>
					</div>
				</div>
			</div>
			{dialog}
		</>
	)
}
