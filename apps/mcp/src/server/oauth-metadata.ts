export const PROTECTED_RESOURCE_METADATA_PATH =
	"/.well-known/oauth-protected-resource"

// Discovery must use the configured resource, never request-controlled forwarding headers.
export function protectedResourceMetadataUrl(resource: string): string {
	const resourceUrl = new URL(resource)
	const resourcePath = resourceUrl.pathname === "/" ? "" : resourceUrl.pathname
	resourceUrl.pathname = `${PROTECTED_RESOURCE_METADATA_PATH}${resourcePath}`
	return resourceUrl.toString()
}
