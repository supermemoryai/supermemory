"use client"

import { cn } from "@lib/utils"
import { dmSans125ClassName } from "@/lib/fonts"
import { ChromeIcon } from "@/components/new/integration-icons"
import { Check, Download } from "lucide-react"
import { analytics } from "@/lib/analytics"

function PillButton({
	children,
	onClick,
}: {
	children: React.ReactNode
	onClick?: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative flex items-center justify-center gap-2",
				"bg-[#0D121A]",
				"rounded-full h-11 px-6",
				"cursor-pointer transition-opacity hover:opacity-80",
				"shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)]",
				dmSans125ClassName(),
			)}
		>
			{children}
		</button>
	)
}

export function ChromeDetail() {
	const handleInstall = () => {
		window.open(
			"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc",
			"_blank",
			"noopener,noreferrer",
		)
		analytics.onboardingChromeExtensionClicked({ source: "integrations" })
	}

	return (
		<div
			className={cn(
				"bg-[#14161A] rounded-[14px] p-6",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			<div className="flex flex-col gap-6">
				<div className="flex items-center gap-4">
					<ChromeIcon className="shrink-0 w-10 h-10" />
					<div className="flex flex-col gap-1">
						<p
							className={cn(
								dmSans125ClassName(),
								"font-semibold text-[16px] text-[#FAFAFA]",
							)}
						>
							Chrome Extension
						</p>
						<p
							className={cn(
								dmSans125ClassName(),
								"text-[14px] text-[#737373]",
							)}
						>
							Save any webpage directly from your browser
						</p>
					</div>
				</div>

				<PillButton onClick={handleInstall}>
					<Download className="size-4 text-[#FAFAFA]" />
					<span className="text-[14px] text-[#FAFAFA] font-medium">
						Add to Chrome
					</span>
				</PillButton>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{[
						"Import all Twitter bookmarks",
						"Sync ChatGPT memories",
						"Save any webpage",
						"One time setup",
					].map((text) => (
						<div key={text} className="flex items-center gap-2">
							<Check className="size-4 shrink-0 text-[#4BA0FA]" />
							<span
								className={cn(
									dmSans125ClassName(),
									"text-[14px] text-white",
								)}
							>
								{text}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
