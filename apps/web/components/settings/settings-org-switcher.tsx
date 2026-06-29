"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
import { dmSansClassName } from "@/lib/fonts"
import { useAuth } from "@lib/auth-context"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover"
import { OrgPlanBadge, resolveOrgPlan } from "@/components/org-plan-badge"
import { useOrgSummaries } from "@/hooks/use-org-summaries"
import { useTokenUsage, type PlanType } from "@/hooks/use-token-usage"

export function SettingsOrgSwitcher() {
	const { org, organizations, setActiveOrg } = useAuth()
	const router = useRouter()
	const autumn = useCustomer()
	const { currentPlan } = useTokenUsage(autumn)
	const { data: orgSummaries } = useOrgSummaries()

	const [open, setOpen] = useState(false)
	const [switchingId, setSwitchingId] = useState<string | null>(null)

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

	const handleCreate = () => {
		setOpen(false)
		router.push("/onboarding?new=1")
	}

	return (
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
				className={cn(
					"w-[var(--radix-popover-trigger-width)] min-w-[220px] p-1.5",
					"bg-[#14161A] border-white/10 rounded-[14px]",
					"shadow-[0px_8px_28px_rgba(0,0,0,0.5)]",
					dmSansClassName(),
				)}
			>
				<div
					className="max-h-[360px] overflow-y-auto overscroll-contain pr-1 -mr-1 scrollbar-thin [scrollbar-gutter:stable]"
					onWheelCapture={(event) => event.stopPropagation()}
					onTouchMoveCapture={(event) => event.stopPropagation()}
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
				</div>

				<div className="my-1 h-px bg-white/[0.06]" />

				<button
					type="button"
					onClick={handleCreate}
					className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[#A3A3A3] transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
				>
					<Plus className="size-4 shrink-0" />
					<span className="text-[13.5px] font-medium">Create organization</span>
				</button>
			</PopoverContent>
		</Popover>
	)
}
