"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import Image from "next/image"
import { Button } from "@ui/components/button"
import { CLAUDE_DESKTOP_MCP_SNIPPET } from "@/lib/mcp-manual-instructions"
import { cn } from "@lib/utils"
import { dmMonoClassName } from "@/lib/fonts"

const GUIDE_IMAGES = {
	step2: "/mcp-supported-tools/guides/claude-desktop/step-1.png",
	step3: "/mcp-supported-tools/guides/claude-desktop/step-2.png",
	step4: "/mcp-supported-tools/guides/claude-desktop/step-3.png",
	step5: "/mcp-supported-tools/guides/claude-desktop/step-4.png",
} as const

const STEPS: {
	step: number
	body: string
	imageSrc?: string
	imageAlt?: string
}[] = [
	{
		step: 1,
		body: "Copy the supermemory block below. You will paste it inside mcpServers in a later step.",
	},
	{
		step: 2,
		body: "In Claude Desktop, open Settings → Developer, then click Edit Config.",
		imageSrc: GUIDE_IMAGES.step2,
		imageAlt:
			"Claude Desktop settings: Developer in the sidebar and Edit Config highlighted",
	},
	{
		step: 3,
		body: "When claude_desktop_config.json opens in your editor, keep it ready for the next step.",
		imageSrc: GUIDE_IMAGES.step3,
		imageAlt: "File list with claude_desktop_config.json selected",
	},
	{
		step: 4,
		body: "Paste what you copied under mcpServers (merge with existing servers if the file already has some), then save.",
		imageSrc: GUIDE_IMAGES.step4,
		imageAlt: "JSON editor showing supermemory mcpServers configuration",
	},
	{
		step: 5,
		body: "Restart Claude Desktop. Open Settings → Connectors, find supermemory, and click Configure.",
		imageSrc: GUIDE_IMAGES.step5,
		imageAlt:
			"Claude Desktop Connectors settings with supermemory and Configure highlighted",
	},
	{
		step: 6,
		body: "supermemory is installed in your Claude Desktop and ready to use.",
	},
]

type ClaudeDesktopManualTimelineProps = {
	variant: "detail" | "modal"
	onCopySnippet: () => void
	snippetCopied: boolean
}

export function ClaudeDesktopManualTimeline({
	variant,
	onCopySnippet,
	snippetCopied,
}: ClaudeDesktopManualTimelineProps) {
	const isDetail = variant === "detail"

	const textMuted = isDetail ? "text-[#A1A1AA]" : "text-muted-foreground"
	const border = isDetail ? "border-white/[0.07]" : "border-border"
	const spine = isDetail ? "bg-white/[0.14]" : "bg-muted-foreground/40"
	const circleBorder = isDetail
		? "border-white/[0.12]"
		: "border-muted-foreground/50"
	const circleBg = isDetail ? "bg-[#0D121A]" : "bg-background"
	const codeBg = isDetail ? "bg-[#0B0E13]" : "bg-muted"
	const imgBorder = isDetail ? "border-white/[0.07]" : "border-border"
	const screenshotBed = isDetail ? "bg-[#0B0E13]" : "bg-muted"

	return (
		<div
			className={cn(
				"space-y-0",
				isDetail
					? ""
					: "rounded-xl border border-border bg-muted/50 p-4 sm:p-5",
			)}
		>
			<div className="relative">
				<div
					className={cn(
						isDetail
							? "absolute top-3 bottom-3 left-[10.5px] w-px"
							: "absolute top-4.5 bottom-4.5 left-4.5 w-0.5 rounded-full",
						spine,
					)}
					aria-hidden
				/>

				<ol className="relative m-0 list-none space-y-7">
					{STEPS.map((item) => (
						<li className="relative flex gap-4 sm:gap-5" key={item.step}>
							<div
								className={cn(
									"relative z-1 flex shrink-0 justify-center pt-0.5",
									isDetail ? "w-[22px]" : "w-9",
								)}
							>
								{isDetail ? (
									<div
										className={cn(
											"flex size-[22px] items-center justify-center rounded-full bg-[#0D121A] text-[11px] font-semibold tabular-nums text-[#4BA0FA]",
											"shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]",
										)}
									>
										{item.step}
									</div>
								) : (
									<div
										className={cn(
											"flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums shadow-sm",
											circleBorder,
											circleBg,
											"text-foreground",
										)}
									>
										{item.step}
									</div>
								)}
							</div>
							<div className="min-w-0 flex-1 space-y-3">
								<p
									className={cn(
										isDetail
											? "text-[13px] leading-relaxed text-[#A1A1AA]"
											: cn("text-sm leading-relaxed", textMuted),
									)}
								>
									{item.body}
								</p>

								{item.step === 1 ? (
									isDetail ? (
										<div className="relative">
											<pre
												className={cn(
													"max-w-full overflow-x-auto rounded-[10px] border p-4 pr-12 text-xs",
													border,
													codeBg,
												)}
											>
												<code
													className={cn(
														"block font-mono whitespace-pre-wrap break-all text-[#E4E4E7]",
														dmMonoClassName(),
													)}
												>
													{CLAUDE_DESKTOP_MCP_SNIPPET}
												</code>
											</pre>
											<button
												type="button"
												className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-[#0D121A] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.6)] transition-opacity hover:opacity-80"
												onClick={onCopySnippet}
											>
												{snippetCopied ? (
													<CheckIcon className="size-3.5 text-[#4BA0FA]" />
												) : (
													<CopyIcon className="size-3.5 text-[#737373]" />
												)}
											</button>
										</div>
									) : (
										<div className="relative max-w-full">
											<pre
												className={cn(
													"max-h-80 max-w-full overflow-x-auto overflow-y-auto rounded-lg border p-4 pr-12 text-xs",
													border,
													codeBg,
												)}
											>
												<code
													className={cn(
														"block font-mono whitespace-pre-wrap break-all",
														dmMonoClassName(),
													)}
												>
													{CLAUDE_DESKTOP_MCP_SNIPPET}
												</code>
											</pre>
											<Button
												className="absolute top-2 right-2 size-8 cursor-pointer p-0 bg-muted/80 hover:bg-muted"
												onClick={onCopySnippet}
												size="icon"
												type="button"
												variant="ghost"
											>
												{snippetCopied ? (
													<CheckIcon className="size-3.5 text-green-600" />
												) : (
													<CopyIcon className="size-3.5" />
												)}
											</Button>
										</div>
									)
								) : null}

								{item.imageSrc ? (
									<div
										className={cn(
											"overflow-hidden rounded-xl border",
											imgBorder,
											screenshotBed,
										)}
									>
										<div className="max-h-[min(420px,70vh)] overflow-auto p-2 sm:p-3">
											<Image
												alt={item.imageAlt ?? ""}
												className="mx-auto h-auto w-full max-w-full rounded-md object-contain object-top"
												height={720}
												src={item.imageSrc}
												unoptimized
												width={1200}
											/>
										</div>
									</div>
								) : null}
							</div>
						</li>
					))}
				</ol>
			</div>
		</div>
	)
}
