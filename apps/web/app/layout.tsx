import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import "../globals.css"
import "@ui/globals.css"
import { AuthProvider } from "@lib/auth-context"
import { ErrorTrackingProvider } from "@lib/error-tracking"
import { PostHogProvider } from "@lib/posthog"
import { QueryProvider } from "../components/query-client"
import { AutumnProvider } from "autumn-js/react"
import { Suspense } from "react"
import { Toaster } from "@ui/components/sonner"
import { MobilePanelProvider } from "@/lib/mobile-panel-context"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ThemeProvider } from "@/lib/theme-provider"

import { ViewModeProvider } from "@/lib/view-mode-context"

const font = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-sans",
})

export const metadata: Metadata = {
	metadataBase: new URL("https://app.supermemory.ai"),
	description: "Your memories, wherever you are",
	title: "supermemory app",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{process.env.NODE_ENV === "development" && (
					<script
						crossOrigin="anonymous"
						src="https://unpkg.com/react-scan/dist/auto.global.js"
					/>
				)}
			</head>
			<body
				className={`${font.variable} antialiased overflow-x-hidden`}
				suppressHydrationWarning
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem={false}
					disableTransitionOnChange
				>
					<AutumnProvider
						backendUrl={
							process.env.NEXT_PUBLIC_BACKEND_URL ??
							"https://api.supermemory.ai"
						}
						includeCredentials={true}
					>
						<QueryProvider>
							<AuthProvider>
								<ViewModeProvider>
									<MobilePanelProvider>
										<PostHogProvider>
											<ErrorTrackingProvider>
												<NuqsAdapter>
													<Suspense>{children}</Suspense>
													<Toaster />
												</NuqsAdapter>
											</ErrorTrackingProvider>
										</PostHogProvider>
									</MobilePanelProvider>
								</ViewModeProvider>
							</AuthProvider>
						</QueryProvider>
					</AutumnProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
