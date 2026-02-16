"use client"

import { useMemo } from "react"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import { dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { NotionDoc, SyncLogoIcon } from "@ui/assets/icons"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

// Extract structured blocks from markdown content for a visual preview
function parseContentBlocks(content: string) {
	const lines = content.split("\n").filter((l) => l.trim())
	const blocks: {
		type: "heading" | "text" | "bullet" | "todo" | "divider"
		text: string
		checked?: boolean
	}[] = []

	for (const line of lines) {
		if (blocks.length >= 6) break
		const trimmed = line.trim()

		if (trimmed.startsWith("# ")) {
			blocks.push({ type: "heading", text: trimmed.replace(/^#+\s*/, "") })
		} else if (trimmed.startsWith("- [x]") || trimmed.startsWith("- [ ]")) {
			blocks.push({
				type: "todo",
				text: trimmed.replace(/^- \[.\]\s*/, ""),
				checked: trimmed.includes("[x]"),
			})
		} else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
			blocks.push({ type: "bullet", text: trimmed.replace(/^[-*]\s*/, "") })
		} else if (trimmed === "---") {
			blocks.push({ type: "divider", text: "" })
		} else if (trimmed.length > 0) {
			blocks.push({
				type: "text",
				text: trimmed.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, ""),
			})
		}
	}

	return blocks
}

export function NotionPreview({
	document,
}: {
	document: DocumentWithMemories
}) {
	const blocks = useMemo(
		() => parseContentBlocks(document.content || document.summary || ""),
		[document.content, document.summary],
	)

	return (
		<div className="bg-[#0B1017] rounded-[18px] overflow-hidden">
			{/* Header with Notion branding */}
			<div className="px-3 pt-3 pb-2 flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<NotionDoc className="size-[14px]" />
					<span
						className={cn(
							dmSansClassName(),
							"text-[10px] tracking-wide text-[#929292] uppercase",
						)}
					>
						Notion
					</span>
				</div>
				{/* Decorative dots mimicking Notion's block handles */}
				<div className="flex gap-[3px]">
					<div className="w-[3px] h-[3px] rounded-full bg-[#333]" />
					<div className="w-[3px] h-[3px] rounded-full bg-[#333]" />
					<div className="w-[3px] h-[3px] rounded-full bg-[#333]" />
				</div>
			</div>

			{/* Content area — structured block preview */}
			<div className="px-3 pb-3 space-y-[5px]">
				{document.title && (
					<p
						className={cn(
							dmSansClassName(),
							"text-[12px] font-semibold text-[#E5E5E5] line-clamp-2 leading-[140%]",
						)}
					>
						{document.title}
					</p>
				)}

				{blocks.length > 0 ? (
					<div className="space-y-[3px]">
						{blocks.map((block, i) => {
							if (block.type === "divider") {
								return <div key={i} className="h-px bg-[#1F2937] my-1" />
							}

							if (block.type === "heading") {
								return (
									<p
										key={i}
										className={cn(
											dmSansClassName(),
											"text-[11px] font-semibold text-[#B0B0B0] line-clamp-1",
										)}
									>
										{block.text}
									</p>
								)
							}

							if (block.type === "todo") {
								return (
									<div key={i} className="flex items-start gap-1.5">
										<div
											className={cn(
												"mt-[2px] w-[10px] h-[10px] rounded-[2px] border shrink-0",
												block.checked
													? "bg-[#2F81F7] border-[#2F81F7]"
													: "border-[#3B3B3B] bg-transparent",
											)}
										>
											{block.checked && (
												<svg
													viewBox="0 0 10 10"
													className="w-full h-full text-white"
												>
													<path
														d="M2.5 5L4.5 7L7.5 3.5"
														stroke="currentColor"
														strokeWidth="1.2"
														fill="none"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											)}
										</div>
										<p
											className={cn(
												"text-[10px] line-clamp-1 leading-[140%]",
												block.checked
													? "text-[#555] line-through"
													: "text-[#737373]",
											)}
										>
											{block.text}
										</p>
									</div>
								)
							}

							if (block.type === "bullet") {
								return (
									<div key={i} className="flex items-start gap-1.5">
										<div className="mt-[5px] w-[4px] h-[4px] rounded-full bg-[#555] shrink-0" />
										<p className="text-[10px] text-[#737373] line-clamp-1 leading-[140%]">
											{block.text}
										</p>
									</div>
								)
							}

							return (
								<p
									key={i}
									className="text-[10px] text-[#737373] line-clamp-1 leading-[140%]"
								>
									{block.text}
								</p>
							)
						})}
					</div>
				) : document.summary ? (
					<p className="text-[10px] text-[#737373] line-clamp-4">
						{document.summary}
					</p>
				) : null}
			</div>

			{/* Footer */}
			{(document.memoryEntries.length > 0 || document.createdAt) && (
				<div className="px-3 pb-2.5 flex items-center justify-between">
					{document.memoryEntries.length > 0 && (
						<p
							className={cn(
								dmSansClassName(),
								"text-[10px] font-semibold flex items-center gap-1",
							)}
							style={{
								background:
									"linear-gradient(94deg, #369BFD 4.8%, #36FDFD 77.04%, #36FDB5 143.99%)",
								backgroundClip: "text",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
							}}
						>
							<SyncLogoIcon className="w-[12.33px] h-[10px]" />
							{document.memoryEntries.length}
						</p>
					)}
					<p className={cn(dmSansClassName(), "text-[10px] text-[#737373]")}>
						{new Date(document.createdAt).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							year: "numeric",
						})}
					</p>
				</div>
			)}
		</div>
	)
}
