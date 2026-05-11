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

	const textMuted = isDetail ? "text-[#B0B0B0]" : "text-muted-foreground"
	const border = isDetail ? "border-[#3D434D]" : "border-border"
	const spine = isDetail ? "bg-[#7C8C9E]" : "bg-muted-foreground/40"
	const circleBorder = isDetail
		? "border-[#9CA8B8]"
		: "border-muted-foreground/50"
	const circleBg = isDetail ? "bg-[#080B0F]" : "bg-background"
	const codeBg = isDetail ? "bg-[#050608]" : "bg-muted"
	const imgBorder = isDetail ? "border-[#3D434D]" : "border-border"
	const screenshotBed = isDetail ? "bg-[#2A2D35]" : "bg-muted"

	return (
		<div
			className={cn(
				"space-y-0",
				isDetail
					? "rounded-2xl border border-[#3D434D] bg-[#080B0F] p-5 sm:p-6"
					: "rounded-xl border border-border bg-muted/50 p-4 sm:p-5",
			)}
		>
			<div className="relative">
				<div
					className={cn(
						"absolute top-4.5 bottom-4.5 left-4.5 w-0.5 rounded-full",
						spine,
					)}
					aria-hidden
				/>

				<ol className="relative m-0 list-none space-y-10">
					{STEPS.map((item) => (
						<li className="relative flex gap-4 sm:gap-5" key={item.step}>
							<div className="relative z-1 flex w-9 shrink-0 justify-center pt-0.5">
								<div
									className={cn(
										"flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums shadow-sm",
										circleBorder,
										circleBg,
										isDetail ? "text-[#FAFAFA]" : "text-foreground",
									)}
								>
									{item.step}
								</div>
							</div>
							<div className="min-w-0 flex-1 space-y-3">
								<p className={cn("text-sm leading-relaxed", textMuted)}>
									{item.body}
								</p>

								{item.step === 1 ? (
									isDetail ? (
										<div className="relative">
											<pre
												className={cn(
													"max-w-full overflow-x-auto rounded-lg border p-4 pr-12 text-xs",
													border,
													codeBg,
												)}
											>
												<code
													className={cn(
														"block font-mono whitespace-pre-wrap break-all text-emerald-400",
														dmMonoClassName(),
													)}
												>
													{CLAUDE_DESKTOP_MCP_SNIPPET}
												</code>
											</pre>
											<button
												type="button"
												className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-md border border-[#3D434D] bg-[#121820] hover:bg-[#1a2230]"
												onClick={onCopySnippet}
											>
												{snippetCopied ? (
													<span className="text-xs text-emerald-500">✓</span>
												) : (
													<CopyIcon className="size-3.5 text-[#8B8B8B] hover:text-white" />
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
