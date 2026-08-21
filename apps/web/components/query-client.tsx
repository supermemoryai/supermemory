"use client"

import { useAuth } from "@lib/auth-context"
import { QueryClientProvider } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import {
	createQueryClient,
	createRouteAwareQueryCacheScope,
} from "./query-client-config"

function QueryClientOwner({ children }: { children: ReactNode }) {
	const [queryClient] = useState(createQueryClient)
	useEffect(() => () => queryClient.clear(), [queryClient])

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

export function ScopedQueryProvider({
	children,
	scope,
}: {
	children: ReactNode
	scope: string
}) {
	return <QueryClientOwner key={scope}>{children}</QueryClientOwner>
}

export function QueryProvider({ children }: { children: ReactNode }) {
	const { session, user, org, isSessionPending, isRestoring } = useAuth()
	const pathname = usePathname()
	const scope = createRouteAwareQueryCacheScope(
		{
			isSessionPending,
			isRestoring,
			sessionId: session?.id ?? null,
			userId: user?.id ?? null,
			activeOrganizationId: session?.activeOrganizationId ?? null,
			organizationId: org?.id ?? null,
		},
		pathname,
	)

	return <ScopedQueryProvider scope={scope}>{children}</ScopedQueryProvider>
}
