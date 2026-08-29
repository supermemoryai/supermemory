import { getBrainWorkspaceDomain, hasCompanyBrain } from "./billing-utils"

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

// Paid add-on or concierge override only; never-activated shell orgs fall to "create".
export function getCompanyBrainOrganizations(
	organizations: BrainEntryOrganization[],
): BrainEntryOrganization[] {
	return organizations.filter((organization) =>
		hasCompanyBrain(organization.metadata),
	)
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
