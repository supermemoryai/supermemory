export const PROTECTED_RESOURCE_METADATA_PATH =
	"/.well-known/oauth-protected-resource"

/**
 * Builds the protected-resource metadata URL advertised to OAuth clients.
 *
 * The canonical resource is the single source of truth so the advertised URL
 * and the metadata document cannot disagree. Forwarded headers are intentionally
 * excluded because they are request-controlled in some proxy deployments.
 */
export function protectedResourceMetadataUrl(resource: string): string {
	const resourceUrl = new URL(resource)
	const resourcePath = resourceUrl.pathname === "/" ? "" : resourceUrl.pathname
	resourceUrl.pathname = `${PROTECTED_RESOURCE_METADATA_PATH}${resourcePath}`
	return resourceUrl.toString()
}
