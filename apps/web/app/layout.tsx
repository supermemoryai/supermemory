import type { Metadata, Viewport } from "next"
import { DM_Sans } from "next/font/google"
import "./globals.css"

const font = DM_Sans({
	subsets: ["latin"],
	variable: "--font-sans",
	weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
	metadataBase: new URL("https://app.supermemory.ai"),
	title: "Supermemory has moved",
	description: "Supermemory now lives at console.supermemory.ai",
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
			{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
		],
		apple: [
			{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
		],
	},
	manifest: "/site.webmanifest",
	openGraph: {
		title: "Supermemory has moved",
		description: "Supermemory now lives at console.supermemory.ai",
		images: [{ url: "/OG.png", width: 1800, height: 945, alt: "Supermemory" }],
		siteName: "Supermemory",
		type: "website",
	},
	robots: { index: false, follow: true },
}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#05080d",
}

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={font.variable} lang="en">
			<body>{children}</body>
		</html>
	)
}
