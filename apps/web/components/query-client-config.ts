import { QueryClient } from "@tanstack/react-query"

export interface QueryCacheScope {
	isSessionPending: boolean
	isRestoring: boolean
	sessionId: string | null
	userId: string | null
	activeOrganizationId: string | null
	organizationId: string | null
}

export function shouldScopeQueriesByOrganization(pathname: string): boolean {
	return pathname !== "/oauth/consent" && pathname !== "/oauth/consent/"
}

export function createQueryCacheScope(
	scope: QueryCacheScope,
	options: { includeOrganization?: boolean } = {},
): string {
	const includeOrganization = options.includeOrganization ?? true
	return JSON.stringify([
		scope.isSessionPending,
		scope.isRestoring,
		scope.sessionId,
		scope.userId,
		includeOrganization ? scope.activeOrganizationId : null,
		includeOrganization ? scope.organizationId : null,
	])
}

export function createRouteAwareQueryCacheScope(
	scope: QueryCacheScope,
	pathname: string,
): string {
	return createQueryCacheScope(scope, {
		includeOrganization: shouldScopeQueriesByOrganization(pathname),
	})
}

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		},
	})
}
