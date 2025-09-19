import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "../globals.css";
import "@ui/globals.css";
import { AuthProvider } from "@lib/auth-context";
import { ErrorTrackingProvider } from "@lib/error-tracking";
import { PostHogProvider } from "@lib/posthog";
import { QueryProvider } from "@lib/query-client";
import { AutumnProvider } from "autumn-js/react";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { TourProvider } from "@/components/tour";
import { MobilePanelProvider } from "@/lib/mobile-panel-context";
import { NuqsAdapter } from 'nuqs/adapters/next/app'


import { ViewModeProvider } from "@/lib/view-mode-context";

const sans = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

const mono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
});

const serif = Instrument_Serif({
	subsets: ["latin"],
	variable: "--font-serif",
	weight: ["400"],
});

export const metadata: Metadata = {
	metadataBase: new URL("https://app.supermemory.ai"),
	description: "Your memories, wherever you are",
	title: "supermemory app",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html className="dark bg-sm-black" lang="en">
			<body
				className={`${sans.variable} ${mono.variable} ${serif.variable} antialiased bg-[#0f1419] overflow-x-hidden`}
			>
				<AutumnProvider
					backendUrl={
						process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
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
												<TourProvider>
													<Suspense>{children}</Suspense>
													<Toaster richColors theme="dark" />
												</TourProvider>
											</NuqsAdapter>
										</ErrorTrackingProvider>
									</PostHogProvider>
								</MobilePanelProvider>
							</ViewModeProvider>
						</AuthProvider>
					</QueryProvider>
				</AutumnProvider>
			</body>
		</html>
	);
}
