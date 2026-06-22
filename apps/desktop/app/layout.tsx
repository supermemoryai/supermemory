import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import type { ReactNode } from "react"
import "@ui/globals.css"
import "./globals.css"
import { Providers } from "./providers"

const font = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-sans",
})

export const metadata: Metadata = {
	title: "Supermemory",
	description: "Your memories, wherever you are",
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${font.variable} antialiased`} suppressHydrationWarning>
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
