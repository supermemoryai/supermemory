import { useAuth } from "@lib/auth-context"
import {
	getBrainMode,
	getCompanyBrainOverride,
	hasCompanyBrain,
} from "@/lib/billing-utils"

export function useHasCompanyBrain(): boolean {
	const { org } = useAuth()
	const metadata = org?.metadata as Record<string, unknown> | string | undefined
	// An explicit concierge override wins over the team-onboarding fallback.
	const override = getCompanyBrainOverride(metadata)
	if (override !== undefined) return override
	// Team-brain orgs use brain spaces even before the add-on webhook lands.
	return hasCompanyBrain(metadata) || getBrainMode(metadata) === "team"
}
