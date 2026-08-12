"use client"

import { motion } from "motion/react"
import { ArrowRight } from "lucide-react"
import { cn } from "@lib/utils"
import { SlackMark } from "@/components/brain-connector-icons"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"

export function SlackHandoff({
	teamName,
	onDismiss,
}: {
	teamName: string | null
	onDismiss: () => void
}) {
	return (
		<div
			className={cn(
				"fixed inset-0 z-[100] flex items-center justify-center bg-[#05080D]/90 backdrop-blur-sm px-4",
				dmSansClassName(),
			)}
		>
			<motion.div
				initial={{ opacity: 0, y: 12, scale: 0.98 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ type: "spring", stiffness: 260, damping: 26 }}
				className="w-full max-w-md rounded-[22px] bg-[#1B1F24] border border-white/[0.06] p-8 text-center"
			>
				<div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-[16px] bg-[#14161A] border border-[rgba(82,89,102,0.2)]">
					<SlackMark className="size-7" />
				</div>
				<h2 className="text-[20px] font-semibold text-[#FAFAFA]">
					{teamName
						? `Company Brain is live in ${teamName}`
						: "Company Brain is live in your Slack"}
				</h2>
				<p className="mt-2 text-[13px] leading-relaxed text-[#8A94A6]">
					We sent you a DM to get started. Ask it anything about your company —
					it answers where your team already works.
				</p>
				<a
					href="slack://open"
					className={cn(
						"mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-[14px] font-semibold text-[#1D1C1D] shadow-[0_4px_24px_rgba(75,160,250,0.25)] transition-opacity hover:opacity-90",
						dmSans125ClassName(),
					)}
				>
					Open Slack
					<ArrowRight className="size-4" />
				</a>
				<button
					type="button"
					onClick={onDismiss}
					className="mt-3 w-full text-[12px] font-medium text-[#525D6E] transition-colors hover:text-[#8A94A6]"
				>
					Stay in the browser
				</button>
			</motion.div>
		</div>
	)
}
