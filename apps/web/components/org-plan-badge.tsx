import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { PLAN_DISPLAY_NAMES, type PlanType } from "@/hooks/use-token-usage"

const orgPlanBadgeBase = cn(
	dmSans125ClassName(),
	"inline-flex h-[18px] min-w-[42px] shrink-0 items-center justify-center rounded-[3px] px-1.5 text-[10px] uppercase",
)

const ORG_PLAN_BADGE_STYLES: Record<PlanType, string> = {
	free: "bg-[#2E353D] font-mono font-medium tracking-[0.12em] text-[#A3A3A3]",
	pro: "bg-[#4BA0FA] font-bold tracking-[0.36px] text-[#00171A]",
	max: "bg-[#1E7FE0] font-bold tracking-[0.36px] text-[#00171A]",
	scale: "bg-[#0054AD] font-bold tracking-[0.36px] text-[#FAFAFA]",
	enterprise: "bg-[#FAFAFA] font-bold tracking-[0.36px] text-[#0D121A]",
}

export function OrgPlanBadge({ plan }: { plan: PlanType }) {
	return (
		<span className={cn(orgPlanBadgeBase, ORG_PLAN_BADGE_STYLES[plan])}>
			{PLAN_DISPLAY_NAMES[plan]}
		</span>
	)
}

export function resolveOrgPlan(
	orgId: string,
	isCurrent: boolean,
	currentPlan: PlanType,
	planByOrgId: Map<string, PlanType>,
): PlanType {
	const fromSummary = planByOrgId.get(orgId)
	if (fromSummary) return fromSummary
	if (isCurrent) return currentPlan
	return "free"
}
