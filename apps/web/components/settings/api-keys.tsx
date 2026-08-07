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
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog"
import { Input } from "@ui/components/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react"
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
	if (!start) return "sm_••••••••"
	const TYPICAL_TOTAL_LEN = 48
	const TAIL_STARS_MIN = 8
	const tailStars = Math.max(TAIL_STARS_MIN, TYPICAL_TOTAL_LEN - start.length)
	return `${start}${"•".repeat(Math.min(tailStars, 16))}`
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

export default function ApiKeys() {
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
					<button
						type="button"
						onClick={() => {
							setCreatedKey(null)
							setCreateOpen(true)
						}}
						className={cn(
							"inline-flex shrink-0 items-center justify-center gap-1.5",
							"h-9 rounded-full px-4 text-[13px] font-semibold text-[#FAFAFA]",
							"bg-[#4BA0FA] hover:bg-[#3B90EA] transition-colors",
							"disabled:cursor-not-allowed disabled:opacity-50",
							dmSans125ClassName(),
						)}
					>
						<Plus className="size-4" />
						Create key
					</button>
				</div>

				<SettingsCard>
					{isLoading ? (
						<div className="flex items-center justify-center gap-2 py-10 text-[#8B8B8B]">
							<Loader2 className="size-4 animate-spin" />
							<span className={cn(dmSans125ClassName(), "text-[13px]")}>
								Loading keys…
							</span>
						</div>
					) : isError ? (
						<div className="flex flex-col items-center gap-3 py-10 text-center">
							<p
								className={cn(
									dmSans125ClassName(),
									"text-[14px] text-[#8B8B8B]",
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
					) : keys.length === 0 ? (
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
										"text-[13px] text-[#8B8B8B] max-w-sm",
									)}
								>
									Create your first key to use the API programmatically or
									connect custom tools.
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									setCreatedKey(null)
									setCreateOpen(true)
								}}
								className={cn(
									"inline-flex items-center justify-center gap-1.5 mt-1",
									"h-9 rounded-full px-4 text-[13px] font-semibold text-[#FAFAFA]",
									"bg-[#14161A] shadow-inside-out hover:bg-[#121820] transition-colors",
									dmSans125ClassName(),
								)}
							>
								<Plus className="size-4" />
								Create key
							</button>
						</div>
					) : (
						<ul className="flex flex-col divide-y divide-white/[0.06]">
							{keys.map((key) => {
								const expired = isExpired(key.expiresAt)
								const disabled = key.enabled === false || expired
								return (
									<li
										key={key.id}
										className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
									>
										<div className="min-w-0 flex flex-col gap-1.5">
											<div className="flex items-center gap-2 min-w-0">
												<p
													className={cn(
														dmSans125ClassName(),
														"font-semibold text-[14px] text-[#FAFAFA] truncate",
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
															"shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-[#8B8B8B]",
														)}
													>
														{expired ? "Expired" : "Disabled"}
													</span>
												)}
											</div>
											<code
												className={cn(
													dmSans125ClassName(),
													"block truncate font-mono text-[12px] text-[#8B8B8B]",
												)}
												title={formatKeyPreview(key.start ?? key.key)}
											>
												{formatKeyPreview(key.start ?? key.key)}
											</code>
											<div
												className={cn(
													dmSans125ClassName(),
													"flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[#6B6B6B]",
												)}
											>
												<span>Created {formatRelativeTime(key.createdAt)}</span>
												<span>
													Last used{" "}
													{key.lastRequest
														? formatRelativeTime(key.lastRequest)
														: "never"}
												</span>
												<span>Expires {formatExpiresLabel(key.expiresAt)}</span>
											</div>
										</div>
										<button
											type="button"
											onClick={() => setRevokeTarget(key)}
											className={cn(
												"inline-flex shrink-0 items-center justify-center gap-1.5 self-start sm:self-center",
												"h-8 rounded-full px-3 text-[12px] font-medium",
												"text-[#C73B1B] hover:bg-[#290F0A]/60 transition-colors",
												dmSans125ClassName(),
											)}
										>
											<Trash2 className="size-3.5" />
											Revoke
										</button>
									</li>
								)
							})}
						</ul>
					)}
				</SettingsCard>

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
				<DialogContent className="border-white/[0.08] bg-[#191D24] text-[#FAFAFA] sm:max-w-md">
					{createdKey ? (
						<>
							<DialogHeader>
								<DialogTitle
									className={cn(dmSans125ClassName(), "text-[18px]")}
								>
									API key created
								</DialogTitle>
								<DialogDescription className="text-[#8B8B8B]">
									Copy this key now. You won&apos;t be able to see it again.
								</DialogDescription>
							</DialogHeader>
							<div className="flex flex-col gap-3 py-1">
								<div className="flex min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.08] bg-[#0D121A] px-3 py-2.5">
									<code
										className={cn(
											dmSans125ClassName(),
											"min-w-0 flex-1 truncate font-mono text-[12px] text-[#FAFAFA]",
										)}
									>
										{createdKey}
									</code>
									<button
										type="button"
										onClick={() => handleCopy(createdKey)}
										className={cn(
											"inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5",
											"bg-[#4BA0FA] text-[12px] font-semibold text-white hover:bg-[#3B90EA]",
											dmSans125ClassName(),
										)}
									>
										{copied ? (
											<Check className="size-3.5" />
										) : (
											<Copy className="size-3.5" />
										)}
										{copied ? "Copied" : "Copy"}
									</button>
								</div>
								<p
									className={cn(
										dmSans125ClassName(),
										"text-[12px] text-[#A37A2E]",
									)}
								>
									Store it somewhere safe. For security, the full key is only
									shown once.
								</p>
							</div>
							<DialogFooter>
								<button
									type="button"
									onClick={resetCreateState}
									className={cn(
										"inline-flex h-9 items-center justify-center rounded-full px-4",
										"bg-[#4BA0FA] text-[13px] font-semibold text-white hover:bg-[#3B90EA]",
										dmSans125ClassName(),
									)}
								>
									Done
								</button>
							</DialogFooter>
						</>
					) : (
						<>
							<DialogHeader>
								<DialogTitle
									className={cn(dmSans125ClassName(), "text-[18px]")}
								>
									Create API key
								</DialogTitle>
								<DialogDescription className="text-[#8B8B8B]">
									This key has full access to your organization&apos;s
									Supermemory data via the API.
								</DialogDescription>
							</DialogHeader>
							<div className="flex flex-col gap-4 py-1">
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor={nameId}
										className={cn(
											dmSans125ClassName(),
											"text-[12px] font-medium uppercase tracking-[0.04em] text-[#8B8B8B]",
										)}
									>
										Name
									</label>
									<Input
										id={nameId}
										value={keyName}
										onChange={(e) => setKeyName(e.target.value)}
										placeholder="e.g. production, local-dev"
										className="h-10 border-white/[0.08] bg-[#0D121A] text-[#FAFAFA] placeholder:text-[#6B6B6B]"
										autoComplete="off"
										onKeyDown={(e) => {
											if (e.key === "Enter" && !createKeyMutation.isPending) {
												createKeyMutation.mutate()
											}
										}}
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<span
										className={cn(
											dmSans125ClassName(),
											"text-[12px] font-medium uppercase tracking-[0.04em] text-[#8B8B8B]",
										)}
									>
										Expires
									</span>
									<Select value={expiryDays} onValueChange={setExpiryDays}>
										<SelectTrigger className="h-10 border-white/[0.08] bg-[#0D121A] text-[#FAFAFA]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="border-white/[0.08] bg-[#191D24] text-[#FAFAFA]">
											{EXPIRY_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<DialogFooter className="gap-2 sm:gap-2">
								<button
									type="button"
									onClick={resetCreateState}
									disabled={createKeyMutation.isPending}
									className={cn(
										"inline-flex h-9 items-center justify-center rounded-full px-4",
										"text-[13px] font-medium text-[#8B8B8B] hover:bg-white/[0.04] hover:text-white",
										"disabled:opacity-50",
										dmSans125ClassName(),
									)}
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => createKeyMutation.mutate()}
									disabled={createKeyMutation.isPending || !org?.id}
									className={cn(
										"inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4",
										"bg-[#4BA0FA] text-[13px] font-semibold text-white hover:bg-[#3B90EA]",
										"disabled:cursor-not-allowed disabled:opacity-50",
										dmSans125ClassName(),
									)}
								>
									{createKeyMutation.isPending ? (
										<>
											<Loader2 className="size-3.5 animate-spin" />
											Creating…
										</>
									) : (
										"Create"
									)}
								</button>
							</DialogFooter>
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
				<AlertDialogContent className="border-white/[0.08] bg-[#191D24] text-[#FAFAFA]">
					<AlertDialogHeader>
						<AlertDialogTitle className={cn(dmSans125ClassName())}>
							Revoke API key?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-[#8B8B8B]">
							{revokeTarget?.name?.trim()
								? `"${revokeTarget.name}" will stop working immediately.`
								: "This key will stop working immediately."}{" "}
							Any apps or scripts still using it will fail. This cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							disabled={revokeKeyMutation.isPending}
							className="rounded-full border-white/[0.08] bg-transparent text-[#FAFAFA] hover:bg-white/[0.04]"
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={revokeKeyMutation.isPending}
							onClick={(e) => {
								e.preventDefault()
								if (revokeTarget) revokeKeyMutation.mutate(revokeTarget.id)
							}}
							className="rounded-full bg-[#C73B1B] text-white hover:bg-[#A83217]"
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
