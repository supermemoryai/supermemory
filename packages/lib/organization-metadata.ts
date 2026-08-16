interface OrganizationWithMetadata {
	id: string
	metadata?: unknown
}

function isMetadataRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function mergeOrganizationMetadata<
	Organization extends OrganizationWithMetadata,
>(
	current: Organization | null,
	organizationId: string,
	partial: Record<string, unknown>,
): Organization | null {
	if (!current || current.id !== organizationId) return current

	const metadata = {
		...(isMetadataRecord(current.metadata) ? current.metadata : {}),
		...partial,
	}

	return Object.assign({}, current, { metadata })
}
