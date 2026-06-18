import { useAuth } from "@lib/auth-context"
import { getBrainMode, hasCompanyBrain } from "@/lib/billing-utils"

export function useHasCompanyBrain(): boolean {
	const { org } = useAuth()
	const metadata = org?.metadata as Record<string, unknown> | string | undefined
	// Team-brain orgs use brain spaces even before the add-on webhook lands.
	return hasCompanyBrain(metadata) || getBrainMode(metadata) === "team"
}
