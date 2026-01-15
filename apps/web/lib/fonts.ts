import { DM_Mono, DM_Sans } from "next/font/google"
import { cn } from "@lib/utils"

// DM Sans font
export const dmSansFont = DM_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "700"],
	variable: "--font-dm-sans",
})

// DM Mono font
export const dmMonoFont = DM_Mono({
	subsets: ["latin"],
	weight: ["400"],
	variable: "--font-dm-mono",
})

/**
 * Utility function that combines dmSansFont.className with required typography styles
 * (letter-spacing: -0.01em and line-height: 135%)
 */
export function dmSansClassName(additionalClasses?: string) {
	return cn(
		dmSansFont.className,
		"tracking-[-0.01em]",
		"leading-[135%]",
		additionalClasses,
	)
}

/**
 * Utility function that combines dmSansFont.className with required typography styles
 * (letter-spacing: -0.01em and line-height: 125%)
 */
export function dmSans125ClassName(additionalClasses?: string) {
	return cn(
		dmSansFont.className,
		"tracking-[-0.01em]",
		"leading-[125%]",
		additionalClasses,
	)
}

/**
 * Utility function that combines dmMonoFont.className with required typography styles
 * (letter-spacing: -0.01em and line-height: 135%)
 */
export function dmMonoClassName(additionalClasses?: string) {
	return cn(
		dmMonoFont.className,
		"tracking-[-0.01em]",
		"leading-[135%]",
		additionalClasses,
	)
}
