import { DM_Mono, DM_Sans } from "next/font/google"

export const dmSansFont = DM_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "700"],
	variable: "--font-dm-sans",
})

export const dmMonoFont = DM_Mono({
	subsets: ["latin"],
	weight: ["400"],
	variable: "--font-dm-mono",
})
