"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Phone, Users, X as XIcon } from "lucide-react"
import { useLobbyside } from "@lobbyside/react"
import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { analytics } from "@/lib/analytics"

const STORAGE_KEY = "sm_next_app_research_cta_dismissed_v1"

const BOOK_CALL_HREF = "https://cal.com/supermemory/growth"

const LOBBYSIDE_WIDGET_ID = "e385c52f-4dd3-4fb2-81eb-da3a78059014"

function ResearchCtaHeroGraphic({
	avatarUrl,
	hostName,
}: {
	avatarUrl?: string
	hostName?: string
}) {
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
				<div className="flex size-9 items-center justify-center">
					<Phone className="size-[24px] text-[#7EB0FF]" strokeWidth={1.65} />
				</div>
				<span
					className={cn(
						dmSans125ClassName(),
						"select-none text-[17px] font-light leading-none text-[#6B9FFF]/75",
					)}
				>
					×
				</span>
				{avatarUrl ? (
					<span className="relative inline-flex">
						<img
							src={avatarUrl}
							alt={hostName ?? ""}
							className="size-9 rounded-full object-cover ring-1 ring-[#B49CFB]/40"
						/>
						<span
							aria-hidden
							className="absolute bottom-0 right-0 size-[10px] rounded-full bg-[#22c55e] ring-2 ring-[#0D121A]"
						/>
					</span>
				) : (
					<div className="flex size-9 items-center justify-center">
						<Users className="size-[24px] text-[#B49CFB]" strokeWidth={1.65} />
					</div>
				)}
			</div>
		</div>
	)
}

export function NextAppResearchCta() {
	const pathname = usePathname()
	const [mounted, setMounted] = useState(false)
	const [dismissed, setDismissed] = useState(false)
	const widget = useLobbyside(LOBBYSIDE_WIDGET_ID)
	const { user, org } = useAuth()

	useEffect(() => {
		setMounted(true)
		setDismissed(localStorage.getItem(STORAGE_KEY) === "1")
	}, [])

	const handleDismiss = useCallback((e: React.MouseEvent) => {
		e.stopPropagation()
		localStorage.setItem(STORAGE_KEY, "1")
		setDismissed(true)
		analytics.nextAppResearchCtaDismissed()
	}, [])

	const handleJoinCall = useCallback(async () => {
		if (widget.status !== "online" || widget.isQueueFull) return
		analytics.nextAppResearchCtaLobbysideCallClicked()
		// Open the tab synchronously so Safari/iOS keep the user-activation
		// gesture. We redirect it once joinCall() resolves, or fall back to
		// the book-a-call URL if the host goes offline / queue fills / the
		// request errors between render and click.
		const pendingTab = window.open("", "_blank")
		const navigate = (url: string) => {
			if (pendingTab && !pendingTab.closed) {
				pendingTab.location.href = url
			} else {
				window.open(url, "_blank", "noopener,noreferrer")
			}
		}
		try {
			const visitor: Record<string, string> = {}
			if (user?.email) visitor.email = user.email
			if (user?.name) visitor.name = user.name
			if (org?.name) visitor.company = org.name
			const github = (user as { github?: unknown } | null)?.github
			if (typeof github === "string" && github) visitor.github = github
			const joinArgs = Object.keys(visitor).length > 0 ? { visitor } : undefined
			const { entryUrl } = await widget.joinCall(joinArgs)
			navigate(entryUrl)
		} catch (err) {
			console.error("[Lobbyside] joinCall failed", err)
			navigate(BOOK_CALL_HREF)
		}
	}, [widget, user, org])

	const handleCardKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLElement>) => {
			if (e.target !== e.currentTarget) return
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault()
				handleJoinCall()
			}
		},
		[handleJoinCall],
	)

	const handleBookClick = useCallback(() => {
		analytics.nextAppResearchCtaBookCallClicked()
	}, [])

	if (
		!mounted ||
		dismissed ||
		pathname.startsWith("/onboarding") ||
		widget.status === "loading"
	) {
		return null
	}

	const cardBaseClasses = cn(
		"fixed z-[45] bottom-4 left-4 min-w-[280px] max-w-[min(calc(100vw-2rem),22.5rem)]",
		"rounded-xl border border-white/[0.08] bg-[#0D121A]/95 backdrop-blur-md",
		"shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-3.5",
	)

	if (widget.status !== "online" || widget.isQueueFull) {
		return (
			<section
				id="next-app-research-cta"
				className={cardBaseClasses}
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
							Share what you want next. We’d love a quick call.
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

	return (
		<button
			type="button"
			id="next-app-research-cta"
			tabIndex={0}
			onClick={handleJoinCall}
			onKeyDown={handleCardKeyDown}
			className={cn(
				cardBaseClasses,
				"cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
			)}
			aria-label={`${widget.buttonText} with ${widget.hostName}`}
		>
			<div className="flex flex-col gap-3">
				<ResearchCtaHeroGraphic
					avatarUrl={widget.avatarUrl}
					hostName={widget.hostName}
				/>
				<div className="min-w-0 w-full">
					<div className="flex items-start gap-1">
						<p
							className={cn(
								dmSans125ClassName(),
								"flex-1 min-w-0 font-medium text-[12px] text-[#FAFAFA] tracking-[-0.12px]",
							)}
						>
							{widget.ctaText}
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
					<div className="mt-2.5 flex items-center justify-between gap-2">
						<div className="min-w-0 flex-1">
							<p
								className={cn(
									dmSans125ClassName(),
									"truncate text-[12px] font-medium text-[#FAFAFA] tracking-[-0.12px]",
								)}
							>
								{widget.hostName}
							</p>
							{widget.hostTitle ? (
								<p
									className={cn(
										dmSans125ClassName(),
										"truncate text-[11px] text-[#737373] tracking-[-0.11px]",
									)}
								>
									{widget.hostTitle}
								</p>
							) : null}
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								handleJoinCall()
							}}
							className={cn(
								dmSans125ClassName(),
								"shrink-0 inline-flex text-[13px] font-medium text-[#A3A3A3]",
								"tracking-[-0.13px] underline underline-offset-4 decoration-white/20",
								"hover:text-[#FAFAFA] hover:decoration-white/40 transition-colors",
								"cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
							)}
						>
							{widget.buttonText}
						</button>
					</div>
				</div>
			</div>
		</button>
	)
}
