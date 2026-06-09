"use client"

import { useMemo, useState } from "react"
import { useCustomer } from "autumn-js/react"
import { toast } from "sonner"
import {
	Building2,
	Check,
	ChevronsUpDown,
	LoaderIcon,
	Plus,
} from "lucide-react"
import { cn } from "@lib/utils"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import { useAuth } from "@lib/auth-context"
import { authClient } from "@lib/auth"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog"
import { OrgPlanBadge, resolveOrgPlan } from "@/components/org-plan-badge"
import { useOrgSummaries } from "@/hooks/use-org-summaries"
import { useTokenUsage, type PlanType } from "@/hooks/use-token-usage"

const SURFACE_SHADOW =
	"0 2.842px 14.211px 0 rgba(0,0,0,0.25), 0.711px 0.711px 0.711px 0 rgba(255,255,255,0.10) inset"

function generateOrgSlug(name: string): string {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "") || "org"
	return `${base}-${Math.floor(100000 + Math.random() * 900000)}`
}

export function SettingsOrgSwitcher() {
	const { org, organizations, setActiveOrg } = useAuth()
	const autumn = useCustomer()
	const { currentPlan } = useTokenUsage(autumn)
	const { data: orgSummaries } = useOrgSummaries()

	const [open, setOpen] = useState(false)
	const [switchingId, setSwitchingId] = useState<string | null>(null)
	const [createOpen, setCreateOpen] = useState(false)
	const [createName, setCreateName] = useState("")
	const [creating, setCreating] = useState(false)

	const planByOrgId = useMemo(() => {
		const map = new Map<string, PlanType>()
		for (const summary of orgSummaries ?? []) {
			map.set(summary.orgId, summary.plan)
		}
		return map
	}, [orgSummaries])

	const activeOrgPlan = org?.id
		? resolveOrgPlan(org.id, true, currentPlan, planByOrgId)
		: currentPlan

	const sortedOrgs = useMemo(
		() =>
			[...(organizations ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
		[organizations],
	)

	const handleSwitch = async (slug: string, id: string) => {
		if (id === org?.id) {
			setOpen(false)
			return
		}
		setSwitchingId(id)
		try {
			await setActiveOrg(slug)
			window.location.reload()
		} catch (error) {
			console.error("Failed to switch organization:", error)
			setSwitchingId(null)
			toast.error("Failed to switch organization")
		}
	}

	const handleCreate = async () => {
		const name = createName.trim()
		if (!name || creating) return
		setCreating(true)
		try {
			const result = await authClient.organization.create({
				name,
				slug: generateOrgSlug(name),
				metadata: { signupSource: "consumer" },
			})
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to create organization")
			}
			await setActiveOrg(result.data?.slug ?? "")
			window.location.reload()
		} catch (error) {
			setCreating(false)
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to create organization",
			)
		}
	}

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={cn(
							dmSansClassName(),
							"flex w-full items-center gap-2 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 transition-colors cursor-pointer hover:bg-white/[0.06]",
						)}
					>
						<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/55">
							<Building2 className="size-[13px]" />
						</span>
						<span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-white">
							{org?.name ?? "Personal"}
						</span>
						<OrgPlanBadge plan={activeOrgPlan} />
						<ChevronsUpDown className="size-3.5 shrink-0 text-white/40" />
					</button>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					side="bottom"
					sideOffset={6}
					style={{
						maxHeight:
							"min(360px, var(--radix-popover-content-available-height))",
					}}
					className={cn(
						"w-[var(--radix-popover-trigger-width)] min-w-[220px] overflow-y-auto p-1.5",
						"bg-[#14161A] border-white/10 rounded-[14px]",
						"shadow-[0px_8px_28px_rgba(0,0,0,0.5)]",
						dmSansClassName(),
					)}
				>
					{sortedOrgs.map((organization) => {
						const isCurrent = organization.id === org?.id
						const isSwitching = switchingId === organization.id
						const plan = resolveOrgPlan(
							organization.id,
							isCurrent,
							currentPlan,
							planByOrgId,
						)
						return (
							<button
								key={organization.id}
								type="button"
								disabled={isCurrent || isSwitching}
								onClick={() => handleSwitch(organization.slug, organization.id)}
								className={cn(
									"w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors",
									isCurrent ? "bg-white/5" : "hover:bg-white/5 cursor-pointer",
									"disabled:cursor-default",
								)}
							>
								<Building2 className="size-4 shrink-0 text-white/40" />
								<span className="min-w-0 flex-1 truncate text-[13.5px] text-white">
									{organization.name}
								</span>
								{isSwitching ? (
									<LoaderIcon className="size-4 shrink-0 animate-spin text-[#4BA0FA]" />
								) : isCurrent ? (
									<Check className="size-4 shrink-0 text-[#4BA0FA]" />
								) : null}
								<OrgPlanBadge plan={plan} />
							</button>
						)
					})}

					<div className="my-1 h-px bg-white/[0.06]" />

					<button
						type="button"
						onClick={() => {
							setOpen(false)
							setCreateOpen(true)
						}}
						className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[#A3A3A3] transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
					>
						<Plus className="size-4 shrink-0" />
						<span className="text-[13.5px] font-medium">
							Create organization
						</span>
					</button>
				</PopoverContent>
			</Popover>

			<Dialog
				open={createOpen}
				onOpenChange={(next) => {
					setCreateOpen(next)
					if (!next) setCreateName("")
				}}
			>
				<DialogContent
					showCloseButton={false}
					style={{ boxShadow: SURFACE_SHADOW }}
					className={cn(
						"sm:max-w-[420px] border border-white/[0.12] bg-[#1B1F24] p-5 gap-0 rounded-[22px]",
						dmSansClassName(),
					)}
				>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<DialogTitle
								className={cn(
									dmSans125ClassName(),
									"text-[18px] font-semibold tracking-[-0.18px] text-[#FAFAFA]",
								)}
							>
								Create organization
							</DialogTitle>
							<p className="text-[13px] tracking-[-0.13px] leading-relaxed text-[#737373]">
								A separate workspace with its own memories, connections, and
								members.
							</p>
						</div>
						<input
							value={createName}
							onChange={(e) => setCreateName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleCreate()
							}}
							placeholder="Organization name"
							maxLength={80}
							className="w-full rounded-xl border border-[#2A2D35] bg-[#0D0F14] px-4 py-2.5 text-sm text-white placeholder:text-[#525D6E] focus:outline-none focus:border-[#4BA0FA]/50 transition-colors"
						/>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setCreateOpen(false)}
								className="px-4 py-2 rounded-full border border-[#2A2D35] text-sm text-[#8B8B8B] hover:text-white hover:border-[#3A3D45] transition-colors cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={!createName.trim() || creating}
								onClick={handleCreate}
								className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-opacity bg-[#0D121A] text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
							>
								{creating ? (
									<LoaderIcon className="size-[15px] animate-spin" />
								) : (
									<Plus className="size-[15px]" />
								)}
								{creating ? "Creating…" : "Create"}
							</button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
