/**
 * React Query configuration for supermemory browser extension
 */
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
			retry: (failureCount, error) => {
				// Don't retry on authentication errors
				if (error?.constructor?.name === "AuthenticationError") {
					return false
				}
				return failureCount < 3
			},
			refetchOnMount: true,
			refetchOnWindowFocus: false,
		},
		mutations: {
			retry: 1,
		},
	},
})
