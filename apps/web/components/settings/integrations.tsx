"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { analytics } from "@/lib/analytics"
import { cn } from "@lib/utils"
import { authClient } from "@lib/auth"
import { useAuth } from "@lib/auth-context"
import { generateId } from "@lib/generate-id"
import {
	ADD_MEMORY_SHORTCUT_URL,
	RAYCAST_EXTENSION_URL,
	SEARCH_MEMORY_SHORTCUT_URL,
} from "@repo/lib/constants"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogPortal,
} from "@ui/components/dialog"
import { useMutation } from "@tanstack/react-query"
import { Check, Copy, Download, Key, Loader, Plus, Search } from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useId, useState } from "react"
import { toast } from "sonner"
import {
	ChromeIcon,
	AppleShortcutsIcon,
	RaycastIcon,
} from "@/components/integration-icons"

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

function IntegrationCard({
	children,
	id,
}: {
	children: React.ReactNode
	id?: string
}) {
	return (
		<div
			id={id}
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
	className,
	disabled,
}: {
	children: React.ReactNode
	onClick?: () => void
	className?: string
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
				className,
			)}
		>
			{children}
		</button>
	)
}

function FeatureItem({ text }: { text: string }) {
	return (
		<div className="flex items-center gap-2">
			<Check className="size-4 shrink-0 text-[#4BA0FA]" />
			<span
				className={cn(
					dmSans125ClassName(),
					"text-[14px] tracking-[-0.14px] text-white",
				)}
			>
				{text}
			</span>
		</div>
	)
}

export default function Integrations() {
	const { org } = useAuth()
	const searchParams = useSearchParams()

	// iOS Shortcuts state
	const [showApiKeyModal, setShowApiKeyModal] = useState(false)
	const [apiKey, setApiKey] = useState<string>("")
	const [copied, setCopied] = useState(false)
	const [selectedShortcutType, setSelectedShortcutType] = useState<
		"add" | "search" | null
	>(null)
	const apiKeyId = useId()

	// Raycast state
	const [showRaycastApiKeyModal, setShowRaycastApiKeyModal] = useState(false)
	const [raycastApiKey, setRaycastApiKey] = useState<string>("")
	const [raycastCopied, setRaycastCopied] = useState(false)
	const [hasTriggeredRaycast, setHasTriggeredRaycast] = useState(false)
	const raycastApiKeyId = useId()

	const handleCopyApiKey = async (key: string, isRaycast = false) => {
		try {
			await navigator.clipboard.writeText(key)
			if (isRaycast) {
				setRaycastCopied(true)
				setTimeout(() => setRaycastCopied(false), 2000)
			} else {
				setCopied(true)
				setTimeout(() => setCopied(false), 2000)
			}
			toast.success("API key copied to clipboard!")
		} catch {
			toast.error("Failed to copy API key")
		}
	}

	const createApiKeyMutation = useMutation({
		mutationFn: async () => {
			const res = await authClient.apiKey.create({
				metadata: {
					organizationId: org?.id,
					type: "ios-shortcut",
				},
				name: `ios-${generateId().slice(0, 8)}`,
				prefix: `sm_${org?.id}_`,
			})
			return res.key
		},
		onSuccess: (key) => {
			setApiKey(key)
			setShowApiKeyModal(true)
			setCopied(false)
			handleCopyApiKey(key)
		},
		onError: (error) => {
			toast.error("Failed to create API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const createRaycastApiKeyMutation = useMutation({
		mutationFn: async () => {
			if (!org?.id) {
				throw new Error("Organization ID is required")
			}

			const res = await authClient.apiKey.create({
				metadata: {
					organizationId: org.id,
					type: "raycast-extension",
				},
				name: `raycast-${generateId().slice(0, 8)}`,
				prefix: `sm_${org.id}_`,
			})
			return res.key
		},
		onSuccess: (key) => {
			setRaycastApiKey(key)
			setShowRaycastApiKeyModal(true)
			setRaycastCopied(false)
			handleCopyApiKey(key, true)
		},
		onError: (error) => {
			toast.error("Failed to create Raycast API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	useEffect(() => {
		const qParam = searchParams.get("q")
		if (
			qParam === "raycast" &&
			!hasTriggeredRaycast &&
			!createRaycastApiKeyMutation.isPending &&
			org?.id
		) {
			setHasTriggeredRaycast(true)
			createRaycastApiKeyMutation.mutate()
		}
	}, [searchParams, hasTriggeredRaycast, createRaycastApiKeyMutation, org])

	const handleChromeInstall = () => {
		window.open(
			"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc",
			"_blank",
			"noopener,noreferrer",
		)
		analytics.onboardingChromeExtensionClicked({ source: "settings" })
		analytics.extensionInstallClicked()
	}

	const handleShortcutClick = (shortcutType: "add" | "search") => {
		setSelectedShortcutType(shortcutType)
		createApiKeyMutation.mutate()
	}

	const handleOpenShortcut = () => {
		if (!selectedShortcutType) {
			toast.error("No shortcut type selected")
			return
		}

		if (selectedShortcutType === "add") {
			window.open(ADD_MEMORY_SHORTCUT_URL, "_blank")
		} else if (selectedShortcutType === "search") {
			window.open(SEARCH_MEMORY_SHORTCUT_URL, "_blank")
		}
	}

	const handleRaycastClick = () => {
		createRaycastApiKeyMutation.mutate()
	}

	const handleRaycastInstall = () => {
		window.open(RAYCAST_EXTENSION_URL, "_blank")
		analytics.onboardingChromeExtensionClicked({ source: "settings" })
		analytics.extensionInstallClicked()
	}

	const handleDialogClose = (open: boolean) => {
		setShowApiKeyModal(open)
		if (!open) {
			setSelectedShortcutType(null)
			setApiKey("")
			setCopied(false)
		}
	}

	const handleRaycastDialogClose = (open: boolean) => {
		setShowRaycastApiKeyModal(open)
		if (!open) {
			setRaycastApiKey("")
			setRaycastCopied(false)
		}
	}

	return (
		<div className="flex flex-col gap-4 pt-4 w-full">
			<SectionTitle>Integrations</SectionTitle>

			<IntegrationCard id="chrome-extension-card">
				<div className="flex flex-col gap-6">
					<div id="chrome-extension-header" className="flex items-center gap-4">
						<ChromeIcon className="shrink-0 w-10 h-10" />
						<div className="flex flex-col gap-1.5">
							<p
								className={cn(
									dmSans125ClassName(),
									"font-semibold text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
								)}
							>
								Chrome extension
							</p>
							<p
								className={cn(
									dmSans125ClassName(),
									"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
								)}
							>
								Save any webpage directly from your browser
							</p>
						</div>
					</div>

					<div id="chrome-extension-cta" className="flex gap-4">
						<PillButton onClick={handleChromeInstall}>
							<Download className="size-4 text-[#FAFAFA]" />
							<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
								Add to Chrome
							</span>
						</PillButton>
					</div>

					<div
						id="chrome-extension-features"
						className="grid grid-cols-1 sm:grid-cols-2 gap-2"
					>
						<FeatureItem text="Import all Twitter bookmarks" />
						<FeatureItem text="Sync ChatGPT memories" />
						<FeatureItem text="Save any webpage" />
						<FeatureItem text="One time setup" />
					</div>
				</div>
			</IntegrationCard>

			<IntegrationCard id="apple-shortcuts-card">
				<div className="flex flex-col gap-6">
					<div id="apple-shortcuts-header" className="flex items-center gap-4">
						<AppleShortcutsIcon />
						<div className="flex flex-col gap-1.5">
							<p
								className={cn(
									dmSans125ClassName(),
									"font-semibold text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
								)}
							>
								Apple shortcuts
							</p>
							<p
								className={cn(
									dmSans125ClassName(),
									"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
								)}
							>
								Add memories directly from iPhone, iPad or Mac
							</p>
						</div>
					</div>

					<div id="apple-shortcuts-cta" className="flex gap-4">
						<PillButton
							onClick={() => handleShortcutClick("add")}
							disabled={createApiKeyMutation.isPending}
						>
							{createApiKeyMutation.isPending &&
							selectedShortcutType === "add" ? (
								<Loader className="size-4 text-[#FAFAFA] animate-spin" />
							) : (
								<Plus className="size-4 text-[#FAFAFA]" />
							)}
							<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
								{createApiKeyMutation.isPending &&
								selectedShortcutType === "add"
									? "Creating..."
									: "Add memory shortcut"}
							</span>
						</PillButton>
						<PillButton
							onClick={() => handleShortcutClick("search")}
							disabled={createApiKeyMutation.isPending}
						>
							{createApiKeyMutation.isPending &&
							selectedShortcutType === "search" ? (
								<Loader className="size-4 text-[#FAFAFA] animate-spin" />
							) : (
								<Search className="size-4 text-[#FAFAFA]" />
							)}
							<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
								{createApiKeyMutation.isPending &&
								selectedShortcutType === "search"
									? "Creating..."
									: "Search memory shortcut"}
							</span>
						</PillButton>
					</div>
				</div>
			</IntegrationCard>

			<IntegrationCard id="raycast-extension-card">
				<div className="flex flex-col gap-6">
					<div
						id="raycast-extension-header"
						className="flex items-center gap-4"
					>
						<RaycastIcon className="shrink-0 w-10 h-10" />
						<div className="flex flex-col gap-1.5">
							<p
								className={cn(
									dmSans125ClassName(),
									"font-semibold text-[16px] tracking-[-0.16px] text-[#FAFAFA]",
								)}
							>
								Raycast extension
							</p>
							<p
								className={cn(
									dmSans125ClassName(),
									"font-medium text-[16px] tracking-[-0.16px] text-[#737373]",
								)}
							>
								Add and search memories from Mac and Windows
							</p>
						</div>
					</div>

					<div id="raycast-extension-cta" className="flex gap-4">
						<PillButton
							onClick={handleRaycastClick}
							disabled={createRaycastApiKeyMutation.isPending}
						>
							{createRaycastApiKeyMutation.isPending ? (
								<Loader className="size-4 text-[#FAFAFA] animate-spin" />
							) : (
								<Key className="size-4 text-[#FAFAFA]" />
							)}
							<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
								{createRaycastApiKeyMutation.isPending
									? "Generating..."
									: "Get API key"}
							</span>
						</PillButton>
						<PillButton onClick={handleRaycastInstall}>
							<Download className="size-4 text-[#FAFAFA]" />
							<span className="text-[14px] tracking-[-0.14px] text-[#FAFAFA] font-medium">
								Install extension
							</span>
						</PillButton>
					</div>
				</div>
			</IntegrationCard>

			<Dialog open={showApiKeyModal} onOpenChange={handleDialogClose}>
				<DialogPortal>
					<DialogContent
						id="ios-shortcuts-modal"
						className="bg-[#14161A] border border-white/10 text-[#FAFAFA] md:max-w-md z-100"
					>
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
							<div id="ios-shortcuts-api-key-section" className="space-y-2">
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
										onClick={() => handleCopyApiKey(apiKey)}
										className="p-2 rounded-lg bg-[#0D121A] border border-white/10 text-[#737373] hover:text-[#FAFAFA] transition-colors"
									>
										{copied ? (
											<Check className="h-4 w-4 text-[#4BA0FA]" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>

							<div id="ios-shortcuts-steps" className="space-y-3">
								<h4
									className={cn(
										dmSans125ClassName(),
										"text-sm font-medium text-[#737373]",
									)}
								>
									Follow these steps:
								</h4>
								<div className="space-y-2">
									<div className="flex items-start gap-3">
										<div className="shrink-0 w-6 h-6 bg-[#4BA0FA]/20 text-[#4BA0FA] rounded-full flex items-center justify-center text-xs font-medium">
											1
										</div>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-sm text-[#737373]",
											)}
										>
											Click "Add to Shortcuts" below to open the shortcut
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="shrink-0 w-6 h-6 bg-[#4BA0FA]/20 text-[#4BA0FA] rounded-full flex items-center justify-center text-xs font-medium">
											2
										</div>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-sm text-[#737373]",
											)}
										>
											Paste your API key when prompted
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="shrink-0 w-6 h-6 bg-[#4BA0FA]/20 text-[#4BA0FA] rounded-full flex items-center justify-center text-xs font-medium">
											3
										</div>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-sm text-[#737373]",
											)}
										>
											Start using your shortcut!
										</p>
									</div>
								</div>
							</div>

							<div className="flex gap-2 pt-2">
								<button
									type="button"
									onClick={handleOpenShortcut}
									disabled={!selectedShortcutType}
									className={cn(
										"flex-1 flex items-center justify-center gap-2",
										"bg-[#4BA0FA] hover:bg-[#4BA0FA]/90 text-white",
										"rounded-lg h-11 px-4 font-medium text-sm",
										"disabled:opacity-50 disabled:cursor-not-allowed",
										"transition-colors",
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
						</div>
					</DialogContent>
				</DialogPortal>
			</Dialog>

			<Dialog
				open={showRaycastApiKeyModal}
				onOpenChange={handleRaycastDialogClose}
			>
				<DialogPortal>
					<DialogContent
						id="raycast-api-key-modal"
						className="bg-[#14161A] border border-white/10 text-[#FAFAFA] md:max-w-md z-100"
					>
						<DialogHeader>
							<DialogTitle
								className={cn(
									dmSans125ClassName(),
									"text-[#FAFAFA] text-lg font-semibold",
								)}
							>
								Setup Raycast Extension
							</DialogTitle>
						</DialogHeader>

						<div className="space-y-4">
							<div id="raycast-api-key-section" className="space-y-2">
								<label
									htmlFor={raycastApiKeyId}
									className={cn(
										dmSans125ClassName(),
										"text-sm font-medium text-[#737373]",
									)}
								>
									Your Raycast API Key
								</label>
								<div className="flex items-center gap-2">
									<input
										id={raycastApiKeyId}
										type="text"
										value={raycastApiKey}
										readOnly
										className={cn(
											"flex-1 bg-[#0D121A] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#FAFAFA] font-mono",
											dmSans125ClassName(),
										)}
									/>
									<button
										type="button"
										onClick={() => handleCopyApiKey(raycastApiKey, true)}
										className="p-2 rounded-lg bg-[#0D121A] border border-white/10 text-[#737373] hover:text-[#FAFAFA] transition-colors"
									>
										{raycastCopied ? (
											<Check className="h-4 w-4 text-[#4BA0FA]" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>

							<div id="raycast-steps" className="space-y-3">
								<h4
									className={cn(
										dmSans125ClassName(),
										"text-sm font-medium text-[#737373]",
									)}
								>
									Follow these steps:
								</h4>
								<div className="space-y-2">
									<div className="flex items-start gap-3">
										<div className="shrink-0 w-6 h-6 bg-[#FF6363]/20 text-[#FF6363] rounded-full flex items-center justify-center text-xs font-medium">
											1
										</div>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-sm text-[#737373]",
											)}
										>
											Install the Raycast extension from the Raycast Store
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="shrink-0 w-6 h-6 bg-[#FF6363]/20 text-[#FF6363] rounded-full flex items-center justify-center text-xs font-medium">
											2
										</div>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-sm text-[#737373]",
											)}
										>
											Open Raycast preferences and paste your API key
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="shrink-0 w-6 h-6 bg-[#FF6363]/20 text-[#FF6363] rounded-full flex items-center justify-center text-xs font-medium">
											3
										</div>
										<p
											className={cn(
												dmSans125ClassName(),
												"text-sm text-[#737373]",
											)}
										>
											Use "Add Memory" or "Search Memories" commands!
										</p>
									</div>
								</div>
							</div>

							<div className="flex gap-2 pt-2">
								<button
									type="button"
									onClick={handleRaycastInstall}
									className={cn(
										"flex-1 flex items-center justify-center gap-2",
										"bg-[#FF6363] hover:bg-[#FF6363]/90 text-white",
										"rounded-lg h-11 px-4 font-medium text-sm",
										"transition-colors",
										dmSans125ClassName(),
									)}
								>
									<RaycastIcon className="size-4" />
									Install Extension
								</button>
							</div>
						</div>
					</DialogContent>
				</DialogPortal>
			</Dialog>
		</div>
	)
}
