import {
	getBrainMode,
	getBrainWorkspaceDomain,
	getCompanyBrainOverride,
	hasCompanyBrain,
} from "./billing-utils"

export type BrainEntryOrganization = {
	id: string
	name: string
	slug: string
	metadata?: Record<string, unknown> | string | null
}

export type CompanyBrainEntryDecision =
	| { action: "use"; organization: BrainEntryOrganization }
	| { action: "switch"; organization: BrainEntryOrganization }
	| { action: "choose"; organizations: BrainEntryOrganization[] }
	| { action: "create" }

export function isCompanyBrainOrganization(
	organization: BrainEntryOrganization,
): boolean {
	const override = getCompanyBrainOverride(organization.metadata)
	if (override !== undefined) return override
	return (
		hasCompanyBrain(organization.metadata) ||
		getBrainMode(organization.metadata) === "team"
	)
}

export function getCompanyBrainOrganizations(
	organizations: BrainEntryOrganization[],
): BrainEntryOrganization[] {
	return organizations.filter(isCompanyBrainOrganization)
}

function normalizeDomain(domain: string): string {
	return domain
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, "")
		.replace(/^www\./, "")
		.replace(/\/.*$/, "")
}

export function resolveCompanyBrainEntry(
	activeOrganizationId: string | null | undefined,
	organizations: BrainEntryOrganization[],
	requestedDomain?: string,
): CompanyBrainEntryDecision {
	const normalizedRequestedDomain = requestedDomain
		? normalizeDomain(requestedDomain)
		: null
	const companyBrains = getCompanyBrainOrganizations(organizations).filter(
		(organization) => {
			if (!normalizedRequestedDomain) return true
			const organizationDomain = getBrainWorkspaceDomain(organization.metadata)
			return (
				organizationDomain !== null &&
				normalizeDomain(organizationDomain) === normalizedRequestedDomain
			)
		},
	)
	const active = organizations.find(
		(organization) => organization.id === activeOrganizationId,
	)
	if (
		active &&
		companyBrains.some((organization) => organization.id === active.id)
	) {
		return { action: "use", organization: active }
	}
	if (companyBrains.length === 1 && companyBrains[0]) {
		return { action: "switch", organization: companyBrains[0] }
	}
	if (companyBrains.length > 1) {
		return { action: "choose", organizations: companyBrains }
	}
	return { action: "create" }
}
