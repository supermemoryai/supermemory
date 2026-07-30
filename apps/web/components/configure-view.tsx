"use client"

import { cn } from "@lib/utils"
import { Blocks, CalendarClock, Cpu, ScrollText } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import CompanyBrainConnections from "@/components/settings/company-brain-connections"
import CompanyBrainModels from "@/components/settings/company-brain-models"
import CompanyBrainProactivity from "@/components/settings/company-brain-proactivity"
import Proactiveness from "@/components/settings/proactiveness"
import { ProactivenessIcon } from "@/components/settings/proactiveness-icon"
import { WorkspacePrompt } from "@/components/settings/workspace-prompt"
import { ErrorBoundary } from "@/components/error-boundary"
import { useAuth } from "@lib/auth-context"
import {
	type ConfigureSection,
	configureSectionToPath,
	DEFAULT_CONFIGURE_SECTION,
	pathToConfigureSection,
} from "@/lib/configure-routes"
import { dmSans125ClassName } from "@/lib/fonts"

const SECTIONS: {
	id: ConfigureSection
	label: string
	description: string
	icon: React.ComponentType<{ className?: string }>
}[] = [
	{
		id: "tools",
		label: "Integrations",
		description:
			"Connect the tools your brain works with. Your account covers your own actions and reads; workspace accounts are a shared fallback.",
		icon: Blocks,
	},
	{
		id: "models",
		label: "Models",
		description:
			"Pick how fast or thorough your brain should be. Fine-tune each task under Advanced.",
		icon: Cpu,
	},
	{
		id: "workspace-prompt",
		label: "Workspace Prompt",
		description:
			"Persistent guidance for how your brain works across the workspace. Fixed safety, access, and approval constraints still apply.",
		icon: ScrollText,
	},
	{
		id: "proactivity",
		label: "Proactivity",
		description:
			"When Company Brain speaks up in Slack without being asked. Quiet channels are still read and remembered.",
		icon: ProactivenessIcon,
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
	const { org } = useAuth()
	const pathname = usePathname()
	// Reachable via ?view=configure too, where the path carries no section.
	const activeSection =
		pathToConfigureSection(pathname) ?? DEFAULT_CONFIGURE_SECTION
	const active = SECTIONS.find((section) => section.id === activeSection)
	if (!active) return null

	return (
		<div
			className={cn(dmSans125ClassName(), "flex min-h-full w-full flex-col")}
		>
			<section
				aria-label="Configure Company Brain"
				className="flex flex-1 flex-col rounded-[14px] bg-[#191D24] p-4 shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] sm:p-6"
			>
				<div className="mx-auto flex w-full max-w-[88rem] flex-1 flex-col gap-5 md:flex-row md:gap-8">
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
								<Link
									key={section.id}
									href={configureSectionToPath(section.id)}
									aria-current={isActive ? "page" : undefined}
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
								</Link>
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
							{activeSection === "tools" ? (
								<CompanyBrainConnections />
							) : activeSection === "models" ? (
								<CompanyBrainModels showHeading={false} />
							) : activeSection === "workspace-prompt" ? (
								<WorkspacePrompt key={org?.id} showHeading={false} />
							) : activeSection === "proactivity" ? (
								<CompanyBrainProactivity />
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
