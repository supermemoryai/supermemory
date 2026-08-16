interface OrganizationWithMetadata {
	id: string
	metadata?: unknown
}

export function mergeOrganizationMetadata<
	Organization extends OrganizationWithMetadata,
>(
	current: Organization | null,
	organizationId: string,
	partial: Record<string, unknown>,
): Organization | null {
	if (!current || current.id !== organizationId) return current

	return {
		...current,
		metadata: {
			...(current.metadata as Record<string, unknown> | null),
			...partial,
		},
	} as Organization
}
