import { useAuth } from "@lib/auth-context"
import { hasCompanyBrain } from "@/lib/billing-utils"

export function useHasCompanyBrain(): boolean {
	const { org } = useAuth()
	return hasCompanyBrain(
		org?.metadata as Record<string, unknown> | string | undefined,
	)
}
