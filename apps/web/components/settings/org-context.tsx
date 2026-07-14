"use client"

import { useEffect, useState } from "react"
import { LoaderIcon } from "lucide-react"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/use-org-settings"
import { cn } from "@lib/utils"

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p
			className={cn(
				dmSans125ClassName(),
				"font-semibold text-[14px] tracking-[-0.14px] text-[#FAFAFA]",
			)}
		>
			{children}
		</p>
	)
}

export function OrgContext() {
	const { data: settings, isLoading, isError } = useOrgSettings()
	const updateSettings = useUpdateOrgSettings()
	const [prompt, setPrompt] = useState("")

	const enabled = settings?.shouldLLMFilter ?? false
	const savedPrompt = settings?.filterPrompt ?? ""
	const dirty = prompt.trim() !== savedPrompt.trim()
	const settingsReady = !isLoading && !isError

	useEffect(() => {
		setPrompt(settings?.filterPrompt ?? "")
	}, [settings?.filterPrompt])

	const handleToggle = (next: boolean) => {
		updateSettings.mutate({ shouldLLMFilter: next })
	}

	const handleSave = () => {
		updateSettings.mutate({
			shouldLLMFilter: true,
			filterPrompt: prompt.trim() ? prompt.trim() : null,
		})
	}

	return (
		<section id="organization-context" className="flex flex-col gap-3 px-1">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0">
					<SectionTitle>Organization Context</SectionTitle>
					<p
						className={cn(
							dmSans125ClassName(),
							"text-[13px] tracking-[-0.13px] text-[#737373]",
						)}
					>
						Guide how Supermemory processes and remembers your content.
					</p>
				</div>
				<button
					type="button"
					disabled={!settingsReady || updateSettings.isPending}
					onClick={() => handleToggle(!enabled)}
					className={cn(
						dmSansClassName(),
						"inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[12px] font-semibold transition-[color,opacity] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
						enabled
							? "text-[#737373] hover:bg-white/[0.04] hover:text-[#A3A3A3]"
							: "bg-[#0D121A] text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] hover:opacity-80",
					)}
				>
					{updateSettings.isPending && (
						<LoaderIcon className="size-3 animate-spin" />
					)}
					{enabled ? "DISABLE" : "ENABLE"}
				</button>
			</div>

			{enabled && (
				<div className={cn(dmSansClassName(), "flex flex-col gap-2")}>
					<textarea
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
						placeholder="Tell Nova what to focus on, extract, and skip when turning your content into memories..."
						maxLength={750}
						className="min-h-[96px] w-full resize-y rounded-[12px] border border-white/[0.08] bg-[#0D121A] px-3.5 py-3 text-[13px] leading-relaxed text-[#FAFAFA] placeholder:text-[#525966] focus:border-white/[0.16] focus:outline-none"
					/>
					<div className="flex items-center justify-between">
						<span className="text-[11px] text-[#737373] tabular-nums">
							{prompt.length}/750
						</span>
						{dirty && (
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setPrompt(savedPrompt)}
									disabled={updateSettings.isPending}
									className={cn(
										dmSansClassName(),
										"h-7 rounded-full px-3 text-[12px] font-medium text-[#737373] transition-colors hover:text-[#A3A3A3] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
									)}
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleSave}
									disabled={updateSettings.isPending}
									className={cn(
										dmSansClassName(),
										"inline-flex h-7 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-semibold text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
									)}
								>
									{updateSettings.isPending && (
										<LoaderIcon className="size-3 animate-spin" />
									)}
									Save
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</section>
	)
}
