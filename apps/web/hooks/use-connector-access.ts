import { useCustomer } from "autumn-js/react"
import { hasActivePlan } from "@lib/queries"
import { useHasCompanyBrain } from "@/hooks/use-company-brain"

// Connector entitlement (pro tier or company_brain) — mirrors backend canAccessConnector. Not for plugins.
export function useConnectorAccess(opts?: { enabled?: boolean }) {
	const enabled = opts?.enabled ?? true
	const autumn = useCustomer({ queryOptions: { enabled } })
	const hasCompanyBrain = useHasCompanyBrain()
	const hasPro = enabled && hasActivePlan(autumn.data?.subscriptions, "api_pro")
	const hasMax = enabled && hasActivePlan(autumn.data?.subscriptions, "api_max")
	return {
		hasPro,
		hasMax,
		hasCompanyBrain,
		connectorAccess: hasPro || hasCompanyBrain,
		loading: enabled && autumn.isLoading,
	}
}
