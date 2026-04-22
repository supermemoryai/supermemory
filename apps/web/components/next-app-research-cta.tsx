"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Phone, Users, X as XIcon } from "lucide-react"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { analytics } from "@/lib/analytics"

const STORAGE_KEY = "sm_next_app_research_cta_dismissed_v1"

const BOOK_CALL_HREF = "https://cal.com/supermemory/growth"

function ResearchCtaHeroGraphic() {
	return (
		<div
			id="next-app-research-cta-hero"
			className={cn(
				"relative flex min-h-[4.5rem] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl py-5",
				"border border-white/[0.1] bg-gradient-to-b from-[#141c28] to-[#0D121A]",
			)}
			aria-hidden
		>
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.45]"
				style={{
					background:
						"radial-gradient(ellipse 85% 90% at 50% 30%, rgba(59, 130, 246, 0.2), transparent 65%)",
				}}
			/>
			<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
				<div
					className="h-[120%] w-px bg-gradient-to-b from-transparent via-[#5B8DEF]/35 to-transparent"
					style={{ transform: "rotate(52deg)" }}
				/>
				<div
					className="absolute h-[120%] w-px bg-gradient-to-b from-transparent via-[#9B7AFF]/30 to-transparent"
					style={{ transform: "rotate(-52deg)" }}
				/>
			</div>
			<div className="relative z-10 flex flex-row items-center justify-center gap-10 px-3">
				<Phone className="size-[24px] text-[#7EB0FF]" strokeWidth={1.65} />
				<span
					className={cn(
						dmSans125ClassName(),
						"select-none text-[17px] font-light leading-none text-[#6B9FFF]/75",
					)}
				>
					×
				</span>
				<Users className="size-[24px] text-[#B49CFB]" strokeWidth={1.65} />
			</div>
		</div>
	)
}

export function NextAppResearchCta() {
	const pathname = usePathname()
	const [mounted, setMounted] = useState(false)
	const [dismissed, setDismissed] = useState(false)

	useEffect(() => {
		setMounted(true)
		setDismissed(localStorage.getItem(STORAGE_KEY) === "1")
	}, [])

	const handleDismiss = useCallback(() => {
		localStorage.setItem(STORAGE_KEY, "1")
		setDismissed(true)
		analytics.nextAppResearchCtaDismissed()
	}, [])

	const handleBookClick = useCallback(() => {
		analytics.nextAppResearchCtaBookCallClicked()
	}, [])

	if (!mounted || dismissed || pathname.startsWith("/onboarding")) {
		return null
	}

	return (
		<section
			id="next-app-research-cta"
			className={cn(
				"fixed z-[45] bottom-4 left-4 max-w-[min(calc(100vw-2rem),19rem)]",
				"rounded-xl border border-white/[0.08] bg-[#0D121A]/95 backdrop-blur-md",
				"shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-3.5",
			)}
			aria-label="Research participant invitation"
		>
			<div className="flex flex-col gap-3">
				<ResearchCtaHeroGraphic />
				<div className="min-w-0 w-full">
					<div className="flex items-start gap-1">
						<p
							className={cn(
								dmSans125ClassName(),
								"flex-1 min-w-0 font-medium text-[12px] text-[#FAFAFA] tracking-[-0.12px]",
							)}
						>
							Be part of the next supermemory app
						</p>
						<button
							type="button"
							onClick={handleDismiss}
							className={cn(
								"shrink-0 rounded-md p-1 -mr-1 -mt-0.5",
								"text-muted-foreground hover:text-foreground transition-colors",
								"cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
							)}
							aria-label="Dismiss"
						>
							<XIcon className="size-4" />
						</button>
					</div>
					<p
						className={cn(
							dmSans125ClassName(),
							"mt-1 text-[12px] text-[#737373] tracking-[-0.12px]",
						)}
					>
						Share what you want next—we’d love a quick call.
					</p>
					<div className="mt-2.5 flex justify-end">
						<a
							href={BOOK_CALL_HREF}
							onClick={handleBookClick}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(
								dmSans125ClassName(),
								"inline-flex text-[13px] font-medium text-[#A3A3A3]",
								"tracking-[-0.13px] underline underline-offset-4 decoration-white/20",
								"hover:text-[#FAFAFA] hover:decoration-white/40 transition-colors",
							)}
						>
							Book a call
						</a>
					</div>
				</div>
			</div>
		</section>
	)
}
