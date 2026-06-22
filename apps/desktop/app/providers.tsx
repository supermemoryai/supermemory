"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@ui/components/sonner"
import { ThemeProvider } from "next-themes"
import { type ReactNode, useState } from "react"

export function Providers({ children }: { children: ReactNode }) {
	// One QueryClient for the app's lifetime; lazy init avoids re-creating it on
	// every render (and on Fast Refresh in dev).
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: false,
						staleTime: 60 * 1000,
					},
				},
			}),
	)

	// The app is dark-only, matching apps/web (forcedTheme="dark").
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			enableSystem={false}
			forcedTheme="dark"
			disableTransitionOnChange
		>
			<QueryClientProvider client={queryClient}>
				{children}
				<Toaster />
			</QueryClientProvider>
		</ThemeProvider>
	)
}
