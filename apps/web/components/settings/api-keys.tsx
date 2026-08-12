"use client"

import { dmSans125ClassName } from "@/lib/fonts"
import { formatRelativeTime } from "@/components/settings/sync-utils"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"
import { authClient } from "@lib/auth"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { PillButton } from "../integrations/install-steps"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
	Check,
	Copy,
	KeyRound,
	Loader2,
	Plus,
	Trash2,
	XIcon,
} from "lucide-react"
import { useCallback, useId, useState } from "react"
import { toast } from "sonner"

type ListedApiKey = {
	id: string
	name: string | null
	start: string | null
	key?: string | null
	createdAt: string
	expiresAt: string | null
	lastRequest: string | null
	enabled: boolean
	isScoped: boolean
	containerTags: string[] | null
	smType: string | null
	smClient: string | null
}

const EXPIRY_OPTIONS = [
	{ label: "1 year", value: "365" },
	{ label: "6 months", value: "180" },
	{ label: "30 days", value: "30" },
	{ label: "7 days", value: "7" },
	{ label: "Never", value: "0" },
] as const

const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

const MODAL_SHADOW =
	"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset"

const pillInputClass =
	"h-9 w-full rounded-full border border-[#1E293B] bg-[#0D121A] px-3.5 text-[13px] font-medium text-[#FAFAFA] outline-none placeholder:text-[#5F6673] focus:border-[#334155]"

function ModalClose() {
	return (
		<DialogPrimitive.Close
			className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[rgba(115,115,115,0.2)] bg-[#0D121A] transition-opacity hover:opacity-100 focus:outline-hidden"
			style={{
				boxShadow:
					"0 0.711px 2.842px 0 rgba(0, 0, 0, 0.25), 0.178px 0.178px 0.178px 0 rgba(255, 255, 255, 0.10) inset",
			}}
		>
			<XIcon className="size-4 text-[#737373]" />
			<span className="sr-only">Close</span>
		</DialogPrimitive.Close>
	)
}

function SettingsCard({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={cn(
				"relative bg-[#14161A] rounded-[14px] p-4 sm:p-6 w-full overflow-hidden",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			{children}
		</div>
	)
}

function formatKeyPreview(start: string | null | undefined): string {
	if (!start) return "sm_••••••"
	return `${start}••••••`
}

function isExpired(expiresAt: string | null): boolean {
	if (!expiresAt) return false
	return new Date(expiresAt).getTime() <= Date.now()
}

function formatExpiresLabel(expiresAt: string | null): string {
	if (!expiresAt) return "Never"
	const date = new Date(expiresAt)
	if (Number.isNaN(date.getTime())) return "—"
	if (date.getTime() <= Date.now()) return "Expired"
	return date.toLocaleDateString()
}

function extractCreatedKey(result: unknown): string {
	if (!result || typeof result !== "object") {
		throw new Error("API key missing from response")
	}
	const r = result as {
		key?: string
		data?: { key?: string }
		error?: { message?: string }
	}
	if (r.error?.message) throw new Error(r.error.message)
	const key = r.key ?? r.data?.key
	if (!key) throw new Error("API key missing from response")
	return key
}

export default function ApiKeys({
	dialogPortalContainer,
}: {
	dialogPortalContainer?: HTMLElement | null
}) {
	const { org } = useAuth()
	const queryClient = useQueryClient()
	const nameId = useId()

	const [createOpen, setCreateOpen] = useState(false)
	const [keyName, setKeyName] = useState("")
	const [expiryDays, setExpiryDays] = useState("365")
	const [createdKey, setCreatedKey] = useState<string | null>(null)
	const [copied, setCopied] = useState(false)
	const [revokeTarget, setRevokeTarget] = useState<ListedApiKey | null>(null)

	const {
		data: keys = [],
		isLoading,
		isError,
		refetch,
	} = useQuery<ListedApiKey[]>({
		queryKey: ["api-keys", org?.id, "manage"],
		queryFn: async () => {
			if (!org?.id) return []
			const res = await fetch(`${API_URL}/v3/auth/keys?type=keys`, {
				credentials: "include",
			})
			if (!res.ok) {
				throw new Error("Failed to load API keys")
			}
			const data = (await res.json()) as { keys?: ListedApiKey[] }
			return data.keys ?? []
		},
		enabled: !!org?.id,
		staleTime: 30 * 1000,
	})

	const invalidateKeys = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["api-keys", org?.id] })
		queryClient.invalidateQueries({ queryKey: ["api-keys", org?.id, "manage"] })
	}, [org?.id, queryClient])

	const createKeyMutation = useMutation({
		mutationFn: async () => {
			if (!org?.id) throw new Error("Organization is required")
			const days = Number(expiryDays)
			const expiresIn = days > 0 ? days * 24 * 60 * 60 : undefined
			const name =
				keyName.trim() || `key-${new Date().toISOString().slice(0, 10)}`

			const res = await authClient.apiKey.create({
				name,
				expiresIn,
				metadata: { organizationId: org.id },
				prefix: `sm_${org.id}_`,
			})
			return extractCreatedKey(res)
		},
		onSuccess: (key) => {
			setCreatedKey(key)
			setKeyName("")
			setExpiryDays("365")
			setCopied(false)
			invalidateKeys()
			toast.success("API key created")
		},
		onError: (error) => {
			toast.error("Failed to create API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const revokeKeyMutation = useMutation({
		mutationFn: async (keyId: string) => {
			const res = await authClient.apiKey.delete({ keyId })
			if (res && typeof res === "object" && "error" in res && res.error) {
				const err = res.error as { message?: string }
				throw new Error(err.message ?? "Failed to revoke API key")
			}
		},
		onSuccess: () => {
			setRevokeTarget(null)
			invalidateKeys()
			toast.success("API key revoked")
		},
		onError: (error) => {
			toast.error("Failed to revoke API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			})
		},
	})

	const handleCopy = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value)
			setCopied(true)
			toast.success("API key copied to clipboard")
			setTimeout(() => setCopied(false), 2000)
		} catch {
			toast.error("Failed to copy API key")
		}
	}

	const resetCreateState = () => {
		setCreateOpen(false)
		setCreatedKey(null)
		setKeyName("")
		setExpiryDays("365")
		setCopied(false)
	}

	const handleCreateOpenChange = (open: boolean) => {
		if (!open) {
			resetCreateState()
			return
		}
		setCreateOpen(true)
	}

	return (
		<div className="flex flex-col gap-8 w-full">
			<section className="flex flex-col gap-4">
				<div className="flex items-center justify-between gap-3 px-1 sm:px-2">
					<div className="flex flex-col gap-1 min-w-0">
						<p
							className={cn(
								dmSans125ClassName(),
								"font-semibold text-[20px] tracking-[-0.2px] text-[#FAFAFA]",
							)}
						>
							API Keys
						</p>
						<p
							className={cn(
								dmSans125ClassName(),
								"text-[13px] text-[#8B8B8B] tracking-[-0.13px]",
							)}
						>
							Create keys for the Supermemory API, SDKs, and custom
							integrations. Keys are shown once at creation.
						</p>
					</div>
					<PillButton
						onClick={() => {
							setCreatedKey(null)
							setCreateOpen(true)
						}}
					>
						<Plus className="size-4" />
						Create key
					</PillButton>
				</div>

				{isLoading ? (
					<SettingsCard>
						<div className="flex items-center justify-center gap-2 py-10 text-[#737373]">
							<Loader2 className="size-4 animate-spin" />
							<span className={cn(dmSans125ClassName(), "text-[13px]")}>
								Loading keys…
							</span>
						</div>
					</SettingsCard>
				) : isError ? (
					<SettingsCard>
						<div className="flex flex-col items-center gap-3 py-10 text-center">
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[14px] text-[#737373]",
								)}
							>
								Couldn&apos;t load API keys.
							</p>
							<button
								type="button"
								onClick={() => refetch()}
								className={cn(
									dmSans125ClassName(),
									"text-[13px] text-[#4BA0FA] hover:underline",
								)}
							>
								Try again
							</button>
						</div>
					</SettingsCard>
				) : keys.length === 0 ? (
					<SettingsCard>
						<div className="flex flex-col items-center gap-3 py-10 text-center">
							<div className="flex size-11 items-center justify-center rounded-full bg-[#0D121A] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]">
								<KeyRound className="size-5 text-[#4BA0FA]" />
							</div>
							<div className="flex flex-col gap-1">
								<p
									className={cn(
										dmSans125ClassName(),
										"font-semibold text-[15px] text-[#FAFAFA]",
									)}
								>
									No API keys yet
								</p>
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[13px] text-[#737373] max-w-sm",
									)}
								>
									Create your first key to use the API programmatically or
									connect custom tools.
								</p>
							</div>
							<div className="mt-1">
								<PillButton
									onClick={() => {
										setCreatedKey(null)
										setCreateOpen(true)
									}}
								>
									<Plus className="size-4" />
									Create key
								</PillButton>
							</div>
						</div>
					</SettingsCard>
				) : (
					<ul className="flex flex-col gap-2">
						{keys.map((key) => {
							const expired = isExpired(key.expiresAt)
							const disabled = key.enabled === false || expired
							return (
								<li
									key={key.id}
									className="flex items-center gap-3 rounded-xl bg-[#14161A] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"
								>
									<div
										className={cn(
											"flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#080B0F] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)]",
											disabled && "opacity-60",
										)}
									>
										<KeyRound className="size-4 text-[#737373]" />
									</div>
									<div
										className={cn(
											"min-w-0 flex-1 flex flex-col gap-1",
											disabled && "opacity-60",
										)}
									>
										<div className="flex items-center gap-2 min-w-0">
											<p
												className={cn(
													dmSans125ClassName(),
													"font-semibold text-[14px] tracking-[-0.15px] text-[#FAFAFA] truncate",
												)}
											>
												{key.name?.trim() || "Unnamed key"}
											</p>
											{key.isScoped && (
												<span
													className={cn(
														dmSans125ClassName(),
														"shrink-0 rounded-full bg-[#4BA0FA]/15 px-2 py-0.5 text-[11px] font-medium text-[#4BA0FA]",
													)}
												>
													Scoped
												</span>
											)}
											{disabled && (
												<span
													className={cn(
														dmSans125ClassName(),
														"shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-[#737373]",
													)}
												>
													{expired ? "Expired" : "Disabled"}
												</span>
											)}
										</div>
										<div
											className={cn(
												dmSans125ClassName(),
												"flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-medium text-[#737373]",
											)}
										>
											<code className="font-mono">
												{formatKeyPreview(key.start ?? key.key)}
											</code>
											<span className="text-[#3D434D]">·</span>
											<span>Created {formatRelativeTime(key.createdAt)}</span>
											<span className="text-[#3D434D]">·</span>
											<span>
												Last used{" "}
												{key.lastRequest
													? formatRelativeTime(key.lastRequest)
													: "never"}
											</span>
											<span className="text-[#3D434D]">·</span>
											<span>Expires {formatExpiresLabel(key.expiresAt)}</span>
										</div>
									</div>
									<button
										type="button"
										onClick={() => setRevokeTarget(key)}
										title="Revoke key"
										className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#737373] transition-colors hover:bg-white/5 hover:text-[#C73B1B]"
									>
										<Trash2 className="size-4" />
										<span className="sr-only">Revoke key</span>
									</button>
								</li>
							)
						})}
					</ul>
				)}

				<p
					className={cn(
						dmSans125ClassName(),
						"px-1 sm:px-2 text-[12px] text-[#6B6B6B]",
					)}
				>
					Need docs?{" "}
					<a
						href="https://supermemory.ai/docs/quickstart"
						target="_blank"
						rel="noopener noreferrer"
						className="text-[#4BA0FA] hover:underline"
					>
						API quickstart
					</a>
					{" · "}
					<a
						href="https://console.supermemory.ai"
						target="_blank"
						rel="noopener noreferrer"
						className="text-[#4BA0FA] hover:underline"
					>
						Developer console
					</a>
				</p>
			</section>

			{/* Create / reveal dialog */}
			<Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
				<DialogContent
					className={cn(
						"w-[90%]! max-w-[440px]! flex flex-col gap-4 rounded-[22px] border-none bg-[#1B1F24] p-4",
						dmSans125ClassName(),
					)}
					style={{ boxShadow: MODAL_SHADOW }}
					portalContainer={dialogPortalContainer}
					showCloseButton={false}
				>
					{createdKey ? (
						<>
							<div className="flex items-start justify-between gap-4">
								<DialogHeader className="flex-1 space-y-1 pl-1">
									<DialogTitle className="font-semibold text-[#FAFAFA]">
										API key created
									</DialogTitle>
									<p className="text-[13px] font-medium leading-[1.35] text-[#737373]">
										Copy this key now. You won&apos;t be able to see it again.
									</p>
								</DialogHeader>
								<ModalClose />
							</div>
							<div className="flex flex-col gap-2">
								<code className="block break-all rounded-[12px] border border-[#1E293B] bg-[#0D121A] px-3.5 py-3 font-mono text-[12px] leading-relaxed text-[#FAFAFA]">
									{createdKey}
								</code>
								<p className="pl-1 text-[12px] font-medium leading-[1.45] text-[#737373]">
									Store it somewhere safe. For security, the full key is only
									shown once.
								</p>
							</div>
							<div className="flex items-center justify-end gap-2 pt-1">
								<button
									type="button"
									onClick={resetCreateState}
									className="h-9 shrink-0 cursor-pointer rounded-full px-4 text-[13px] font-medium text-[#737B87] transition-colors hover:text-[#FAFAFA]"
								>
									Done
								</button>
								<PillButton onClick={() => handleCopy(createdKey)}>
									{copied ? (
										<Check className="size-3.5" />
									) : (
										<Copy className="size-3.5" />
									)}
									{copied ? "Copied" : "Copy key"}
								</PillButton>
							</div>
						</>
					) : (
						<>
							<div className="flex items-start justify-between gap-4">
								<DialogHeader className="flex-1 space-y-1 pl-1">
									<DialogTitle className="font-semibold text-[#FAFAFA]">
										Create API key
									</DialogTitle>
									<p className="text-[13px] font-medium leading-[1.35] text-[#737373]">
										This key has full access to your organization&apos;s
										Supermemory data via the API.
									</p>
								</DialogHeader>
								<ModalClose />
							</div>
							<div className="flex flex-col gap-3">
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor={nameId}
										className="pl-1 text-[12px] font-medium text-[#A3A3A3]"
									>
										Name
									</label>
									<input
										id={nameId}
										value={keyName}
										onChange={(e) => setKeyName(e.target.value)}
										placeholder="e.g. production, local-dev"
										className={pillInputClass}
										autoComplete="off"
										onKeyDown={(e) => {
											if (e.key === "Enter" && !createKeyMutation.isPending) {
												createKeyMutation.mutate()
											}
										}}
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<span className="pl-1 text-[12px] font-medium text-[#A3A3A3]">
										Expires
									</span>
									<Select value={expiryDays} onValueChange={setExpiryDays}>
										<SelectTrigger
											className={cn(pillInputClass, "justify-between")}
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="rounded-[12px] border-[#1E293B] bg-[#1B1F24] text-[#FAFAFA]">
											{EXPIRY_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="flex items-center justify-end gap-2 pt-1">
								<button
									type="button"
									onClick={resetCreateState}
									disabled={createKeyMutation.isPending}
									className="h-9 shrink-0 cursor-pointer rounded-full px-4 text-[13px] font-medium text-[#737B87] transition-colors hover:text-[#FAFAFA] disabled:opacity-50"
								>
									Cancel
								</button>
								<PillButton
									onClick={() => createKeyMutation.mutate()}
									disabled={createKeyMutation.isPending || !org?.id}
								>
									{createKeyMutation.isPending && (
										<Loader2 className="size-3.5 animate-spin" />
									)}
									{createKeyMutation.isPending ? "Creating…" : "Create"}
								</PillButton>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Revoke confirmation */}
			<AlertDialog
				open={!!revokeTarget}
				onOpenChange={(open) => {
					if (!open && !revokeKeyMutation.isPending) setRevokeTarget(null)
				}}
			>
				<AlertDialogContent
					portalContainer={dialogPortalContainer}
					className={cn(
						"w-[90%]! max-w-[440px]! flex flex-col gap-4 rounded-[22px] border-none bg-[#1B1F24] p-4",
						dmSans125ClassName(),
					)}
					style={{ boxShadow: MODAL_SHADOW }}
				>
					<AlertDialogHeader className="space-y-1 pl-1">
						<AlertDialogTitle className="font-semibold text-[#FAFAFA]">
							Revoke API key?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-[13px] font-medium leading-[1.35] text-[#737373]">
							{revokeTarget?.name?.trim()
								? `"${revokeTarget.name}" will stop working immediately.`
								: "This key will stop working immediately."}{" "}
							Any apps or scripts still using it will fail. This cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="items-center gap-2 pt-1 sm:gap-2">
						<AlertDialogCancel
							disabled={revokeKeyMutation.isPending}
							className="h-9 rounded-full border-none bg-transparent px-4 text-[13px] font-medium text-[#737B87] shadow-none hover:bg-transparent hover:text-[#FAFAFA]"
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={revokeKeyMutation.isPending}
							onClick={(e) => {
								e.preventDefault()
								if (revokeTarget) revokeKeyMutation.mutate(revokeTarget.id)
							}}
							className="h-9 rounded-full bg-[#C73B1B] px-4 text-[13px] font-semibold text-white hover:bg-[#A83217]"
						>
							{revokeKeyMutation.isPending ? (
								<span className="inline-flex items-center gap-1.5">
									<Loader2 className="size-3.5 animate-spin" />
									Revoking…
								</span>
							) : (
								"Revoke key"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
