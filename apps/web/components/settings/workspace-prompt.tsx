"use client"

import { LoaderIcon } from "lucide-react"
import { useState } from "react"
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/use-org-settings"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"

const DESCRIPTION_ID = "workspace-prompt-description"
const COUNTER_ID = "workspace-prompt-counter"
const HEADING_ID = "workspace-prompt-heading"

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<h2
			id={HEADING_ID}
			className={cn(
				dmSans125ClassName(),
				"font-semibold text-[14px] tracking-[-0.14px] text-[#FAFAFA]",
			)}
		>
			{children}
		</h2>
	)
}

function PromptHeader() {
	return (
		<div className="min-w-0">
			<SectionHeading>Workspace Prompt</SectionHeading>
			<p
				id={DESCRIPTION_ID}
				className={cn(
					dmSans125ClassName(),
					"text-[13px] tracking-[-0.13px] text-[#737373]",
				)}
			>
				Set persistent guidance for how Company Brain works across your
				workspace.
			</p>
		</div>
	)
}

export function WorkspacePrompt() {
	const settingsQuery = useOrgSettings()
	const updateSettings = useUpdateOrgSettings()
	const [draft, setDraft] = useState<string | null>(null)

	const savedPrompt = settingsQuery.data?.workspacePrompt ?? ""
	const prompt = draft ?? savedPrompt
	const dirty = draft !== null && draft.trim() !== savedPrompt.trim()

	const handleSave = () => {
		updateSettings.mutate(
			{
				workspacePrompt: prompt.trim() ? prompt.trim() : null,
			},
			{ onSuccess: () => setDraft(null) },
		)
	}

	return (
		<section
			id="workspace-prompt"
			aria-labelledby={HEADING_ID}
			aria-busy={settingsQuery.isLoading || updateSettings.isPending}
			className="flex flex-col gap-3 px-1"
		>
			<PromptHeader />

			{settingsQuery.isLoading ? (
				<output
					aria-live="polite"
					className={cn(
						dmSansClassName(),
						"flex min-h-[96px] items-center justify-center gap-2 rounded-[12px] border border-white/[0.08] bg-[#0D121A] text-[12px] text-[#737373]",
					)}
				>
					<LoaderIcon aria-hidden="true" className="size-3 animate-spin" />
					Loading workspace prompt…
				</output>
			) : settingsQuery.isError ? (
				<div
					role="alert"
					className={cn(dmSansClassName(), "flex flex-col items-start gap-2")}
				>
					<p className="text-[13px] text-[#A3A3A3]">
						Workspace prompt could not be loaded.
					</p>
					<button
						type="button"
						onClick={() => void settingsQuery.refetch()}
						disabled={settingsQuery.isFetching}
						className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-semibold text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA0FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1F24] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
					>
						{settingsQuery.isFetching && (
							<LoaderIcon aria-hidden="true" className="size-3 animate-spin" />
						)}
						Try again
					</button>
				</div>
			) : (
				<div className={cn(dmSansClassName(), "flex flex-col gap-2")}>
					<textarea
						aria-labelledby={HEADING_ID}
						aria-describedby={`${DESCRIPTION_ID} ${COUNTER_ID}`}
						value={prompt}
						onChange={(event) => setDraft(event.target.value)}
						placeholder="Describe operating preferences, priorities, source and tool choices, workflows, terminology, formatting, and communication style. Fixed safety, access, and approval constraints still apply."
						maxLength={1500}
						className="min-h-[96px] w-full resize-none rounded-[12px] border border-white/[0.08] bg-[#0D121A] px-3.5 py-3 text-[13px] leading-relaxed text-[#FAFAFA] placeholder:text-[#525966] focus-visible:border-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA0FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1F24]"
					/>
					<div className="flex items-center justify-between">
						<span
							id={COUNTER_ID}
							className="text-[11px] text-[#737373] tabular-nums"
						>
							{prompt.length}/1500
						</span>
						{dirty && (
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setDraft(null)}
									disabled={updateSettings.isPending}
									className={cn(
										dmSansClassName(),
										"h-7 rounded-full px-3 text-[12px] font-medium text-[#737373] transition-colors hover:text-[#A3A3A3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA0FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1F24] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
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
										"inline-flex h-7 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-semibold text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA0FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1F24] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
									)}
								>
									{updateSettings.isPending && (
										<LoaderIcon
											aria-hidden="true"
											className="size-3 animate-spin"
										/>
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
