"use client"
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@ui/components/hover-card"
import { useOnboarding, type OnboardingStep } from "./onboarding-context"
import { useState } from "react"
import { cn } from "@lib/utils"

export function NavMenu({ children }: { children: React.ReactNode }) {
	const { setStep, currentStep, visibleSteps, getStepNumberFor } =
		useOnboarding()
	const [open, setOpen] = useState(false)
	const LABELS: Record<OnboardingStep, string> = {
		intro: "Intro",
		name: "Name",
		bio: "About you",
		// connections: "Connections",
		mcp: "MCP",
		extension: "Extension",
		welcome: "Welcome",
	}
	const navigableSteps = visibleSteps.filter(
		(step) => step !== "intro" && step !== "welcome",
	)
	return (
		<HoverCard openDelay={100} open={open} onOpenChange={setOpen}>
			<HoverCardTrigger className="w-fit" asChild>
				{children}
			</HoverCardTrigger>
			<HoverCardContent
				align="start"
				side="left"
				sideOffset={24}
				className="origin-top-right bg-white border border-zinc-200 text-zinc-900"
			>
				<h2 className="text-zinc-900 text-sm font-medium">Go to step</h2>
				<ul className="text-sm mt-2">
					{navigableSteps.map((step) => (
						<li key={step}>
							<button
								type="button"
								className={cn(
									"py-1.5 px-2 rounded-md hover:bg-zinc-100 w-full text-left",
									currentStep === step && "bg-zinc-100",
								)}
								onClick={() => {
									setStep(step)
									setOpen(false)
								}}
							>
								{getStepNumberFor(step)}. {LABELS[step]}
							</button>
						</li>
					))}
				</ul>
			</HoverCardContent>
		</HoverCard>
	)
}
