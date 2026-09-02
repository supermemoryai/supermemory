"use client"

import { Gmail, GoogleDrive, Granola, MCPIcon, Notion } from "@ui/assets/icons"
import { GradientLogo } from "@ui/assets/Logo"
import { cn } from "@lib/utils"
import { SlackMark } from "@/components/brain-connector-icons"
import { dmSans125ClassName } from "@/lib/fonts"

export const CHECKOUT_RETURN_PARAM = "brainTrial"

const ORBIT = [
	{ key: "slack", r: 74, deg: 0, node: <SlackMark className="size-4" /> },
	{ key: "gmail", r: 74, deg: 128, node: <Gmail className="size-4" /> },
	{ key: "notion", r: 74, deg: 236, node: <Notion className="size-4" /> },
	{ key: "drive", r: 112, deg: 58, node: <GoogleDrive className="size-4" /> },
	{ key: "granola", r: 112, deg: 172, node: <Granola className="size-4" /> },
	{ key: "mcp", r: 112, deg: 296, node: <MCPIcon className="size-4" /> },
]

const SPIN = "motion-safe:animate-[spin_44s_linear_infinite]"
const SPIN_BACK = "motion-safe:animate-[spin_44s_linear_infinite_reverse]"

function BrainPanel() {
	return (
		<div className="relative hidden aspect-[3/2] w-[56%] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0B0E13] ring-1 ring-white/[0.06] md:flex">
			<span
				aria-hidden="true"
				className="pointer-events-none absolute size-44 rounded-full bg-[#4BA0FA]/15 blur-3xl"
			/>

			<div aria-hidden="true" className="relative size-[248px]">
				<span className="absolute left-1/2 top-1/2 size-[148px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]" />
				<span className="absolute left-1/2 top-1/2 size-[224px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />

				<div className={cn("absolute inset-0", SPIN)}>
					{ORBIT.map(({ key, r, deg, node }) => (
						<span
							key={key}
							style={{
								transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${r}px)`,
							}}
							className="absolute left-1/2 top-1/2 flex size-8 items-center justify-center rounded-full bg-[#161B22] ring-1 ring-white/10"
						>
							<span
								className={cn("flex", SPIN_BACK)}
								style={{ rotate: `${-deg}deg` }}
							>
								{node}
							</span>
						</span>
					))}
				</div>

				<GradientLogo className="absolute left-1/2 top-1/2 h-auto w-[68px] -translate-x-1/2 -translate-y-1/2" />
			</div>

			<p className="absolute inset-x-0 bottom-5 text-center text-[13px] font-medium text-[#8b8b8b]">
				Meet <span className="text-[#4BA0FA]">@supermemory</span>
			</p>
		</div>
	)
}

// Trial checkout is disabled while new Company Brain signups are paused.
export function StepTrial(_props: { onActive: () => void }) {
	return (
		<div className="flex gap-6">
			<div className="flex min-w-0 flex-1 flex-col justify-center gap-5">
				<div className="flex flex-col gap-1.5">
					<h2
						className={cn(
							dmSans125ClassName(),
							"text-[22px] leading-tight font-medium text-[#fafafa]",
						)}
					>
						New signups are paused
					</h2>
					<p className="text-[13px] leading-relaxed text-[#8b8b8b]">
						Company Brain isn't accepting new workspaces right now. If you have
						questions, reach us at support@supermemory.com.
					</p>
				</div>
			</div>

			<BrainPanel />
		</div>
	)
}
