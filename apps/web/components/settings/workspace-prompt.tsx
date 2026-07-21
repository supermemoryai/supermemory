"use client"

import { LoaderIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/use-org-settings"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"

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
				Set persistent guidance for operating preferences, priorities, source
				and tool choices, workflows, terminology, formatting, and communication
				style. This guidance cannot override fixed safety, access, or approval
				constraints.
			</p>
		</div>
	)
}

export function WorkspacePrompt() {
	const { org } = useAuth()
	const settingsQuery = useOrgSettings()
	const updateSettings = useUpdateOrgSettings()
	const [prompt, setPrompt] = useState("")
	const syncedPrompt = useRef<{ orgId: string; value: string } | null>(null)

	const savedPrompt = settingsQuery.data?.workspacePrompt ?? ""
	const dirty = prompt.trim() !== savedPrompt.trim()

	useEffect(() => {
		if (!settingsQuery.data) return

		const nextPrompt = settingsQuery.data.workspacePrompt ?? ""
		const orgId = org?.id ?? ""
		const previous = syncedPrompt.current

		setPrompt((current) => {
			if (!previous || previous.orgId !== orgId) return nextPrompt
			return current === previous.value ? nextPrompt : current
		})
		syncedPrompt.current = { orgId, value: nextPrompt }
	}, [org?.id, settingsQuery.data])

	const handleSave = () => {
		updateSettings.mutate({
			workspacePrompt: prompt.trim() ? prompt.trim() : null,
		})
	}

	return (
		<section
			id="workspace-prompt"
			aria-labelledby={HEADING_ID}
			className="flex flex-col gap-3 px-1"
		>
			<PromptHeader />

			{settingsQuery.isLoading ? (
				<div
					className={cn(
						dmSansClassName(),
						"flex min-h-[96px] items-center justify-center gap-2 rounded-[12px] border border-white/[0.08] bg-[#0D121A] text-[12px] text-[#737373]",
					)}
				>
					<LoaderIcon className="size-3 animate-spin" />
					Loading workspace prompt…
				</div>
			) : settingsQuery.isError ? (
				<div
					className={cn(dmSansClassName(), "flex flex-col items-start gap-2")}
				>
					<p className="text-[13px] text-[#A3A3A3]">
						Workspace prompt could not be loaded.
					</p>
					<button
						type="button"
						onClick={() => void settingsQuery.refetch()}
						disabled={settingsQuery.isFetching}
						className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#0D121A] px-3 text-[12px] font-semibold text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
					>
						{settingsQuery.isFetching && (
							<LoaderIcon className="size-3 animate-spin" />
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
						onChange={(event) => setPrompt(event.target.value)}
						placeholder="Add persistent guidance for how Company Brain should operate across your workspace..."
						maxLength={1500}
						className="min-h-[96px] w-full resize-y rounded-[12px] border border-white/[0.08] bg-[#0D121A] px-3.5 py-3 text-[13px] leading-relaxed text-[#FAFAFA] placeholder:text-[#525966] focus:border-white/[0.16] focus:outline-none"
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
