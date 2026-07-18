"use client"

import { cn } from "@lib/utils"
import { Blocks, CalendarClock, Cpu } from "lucide-react"
import { useState } from "react"
import CompanyBrainConnections from "@/components/settings/company-brain-connections"
import CompanyBrainModels from "@/components/settings/company-brain-models"
import Proactiveness from "@/components/settings/proactiveness"
import { ErrorBoundary } from "@/components/error-boundary"
import { dmSans125ClassName } from "@/lib/fonts"

type ConfigureSection = "company-brain" | "models" | "automations"

const SECTIONS: {
	id: ConfigureSection
	label: string
	description: string
	icon: typeof Blocks
}[] = [
	{
		id: "company-brain",
		label: "Integrations",
		description:
			"Connect the tools your brain works with. Your account covers your own actions and reads; workspace accounts are a shared fallback.",
		icon: Blocks,
	},
	{
		id: "models",
		label: "Models",
		description: "Choose the models used for reasoning, triage, and research.",
		icon: Cpu,
	},
	{
		id: "automations",
		label: "Automations",
		description:
			"Read-only scheduled summaries posted to Slack channels or DMs. You manage the ones you create.",
		icon: CalendarClock,
	},
]

export function ConfigureView() {
	const [activeSection, setActiveSection] =
		useState<ConfigureSection>("company-brain")
	const active = SECTIONS.find((section) => section.id === activeSection)
	if (!active) return null

	return (
		<div
			className={cn(
				dmSans125ClassName(),
				"mx-auto flex min-h-full w-full max-w-[88rem] flex-col",
			)}
		>
			<section
				aria-label="Configure Company Brain"
				className="flex flex-1 flex-col rounded-[14px] bg-[#191D24] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] sm:p-6"
			>
				<div className="flex flex-1 flex-col gap-5 md:flex-row md:gap-8">
					<nav
						aria-label="Configure sections"
						className="scrollbar-none flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col md:overflow-x-visible"
					>
						<p className="hidden px-3 pb-1.5 font-semibold text-[11px] text-[#5B6675] uppercase tracking-[0.08em] md:block">
							Configure
						</p>
						{SECTIONS.map((section) => {
							const isActive = section.id === activeSection
							const Icon = section.icon
							return (
								<button
									key={section.id}
									type="button"
									aria-current={isActive ? "page" : undefined}
									onClick={() => setActiveSection(section.id)}
									className={cn(
										"flex shrink-0 items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium transition-colors",
										isActive
											? "bg-white/[0.08] text-[#FAFAFA]"
											: "text-[#8B929E] hover:bg-white/[0.04] hover:text-[#FAFAFA]",
									)}
								>
									<Icon
										className={cn(
											"size-4 shrink-0",
											isActive ? "text-[#FAFAFA]" : "text-[#737B87]",
										)}
									/>
									{section.label}
								</button>
							)
						})}
					</nav>

					<div className="min-w-0 flex-1">
						<header className="mb-5">
							<h2
								id="configure-section-title"
								className="text-[14px] font-semibold tracking-[-0.1px] text-[#FAFAFA]"
							>
								{active.label}
							</h2>
							<p className="mt-1 text-[12px] leading-5 text-[#737B87]">
								{active.description}
							</p>
						</header>

						<ErrorBoundary
							key={activeSection}
							fallback={
								<p className="py-6 text-center text-[13px] text-[#8B929E]">
									Something went wrong loading this section.
								</p>
							}
						>
							{activeSection === "company-brain" ? (
								<CompanyBrainConnections />
							) : activeSection === "models" ? (
								<CompanyBrainModels showHeading={false} />
							) : (
								<Proactiveness />
							)}
						</ErrorBoundary>
					</div>
				</div>
			</section>
		</div>
	)
}
