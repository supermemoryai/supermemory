import { useAuth } from "@lib/auth-context"
import { isCompanyBrainOrg } from "@/lib/billing-utils"

export function useHasCompanyBrain(): boolean {
	const { org } = useAuth()
	const metadata = org?.metadata as Record<string, unknown> | string | undefined
	return isCompanyBrainOrg(metadata)
}
