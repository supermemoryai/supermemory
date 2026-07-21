"use client"

import { LoaderIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/use-org-settings"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
import { cn } from "@lib/utils"
import { useAuth } from "@lib/auth-context"

const DESCRIPTION_ID = "workspace-persona-description"
const COUNTER_ID = "workspace-persona-counter"
const HEADING_ID = "workspace-persona-heading"

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

function PersonaHeader() {
	return (
		<div className="min-w-0">
			<SectionHeading>Workspace Persona</SectionHeading>
			<p
				id={DESCRIPTION_ID}
				className={cn(
					dmSans125ClassName(),
					"text-[13px] tracking-[-0.13px] text-[#737373]",
				)}
			>
				Guide how Company Brain communicates and works with your workspace.
			</p>
		</div>
	)
}

export function WorkspacePersona() {
	const { org } = useAuth()
	const settingsQuery = useOrgSettings()
	const updateSettings = useUpdateOrgSettings()
	const [persona, setPersona] = useState("")
	const syncedPersona = useRef<{ orgId: string; value: string } | null>(null)

	const savedPersona = settingsQuery.data?.workspacePersona ?? ""
	const dirty = persona.trim() !== savedPersona.trim()

	useEffect(() => {
		if (!settingsQuery.data) return

		const nextPersona = settingsQuery.data.workspacePersona ?? ""
		const orgId = org?.id ?? ""
		const previous = syncedPersona.current

		setPersona((current) => {
			if (!previous || previous.orgId !== orgId) return nextPersona
			return current === previous.value ? nextPersona : current
		})
		syncedPersona.current = { orgId, value: nextPersona }
	}, [org?.id, settingsQuery.data])

	const handleSave = () => {
		updateSettings.mutate({
			workspacePersona: persona.trim() ? persona.trim() : null,
		})
	}

	return (
		<section
			id="workspace-persona"
			aria-labelledby={HEADING_ID}
			className="flex flex-col gap-3 px-1"
		>
			<PersonaHeader />

			{settingsQuery.isLoading ? (
				<div
					className={cn(
						dmSansClassName(),
						"flex min-h-[96px] items-center justify-center gap-2 rounded-[12px] border border-white/[0.08] bg-[#0D121A] text-[12px] text-[#737373]",
					)}
				>
					<LoaderIcon className="size-3 animate-spin" />
					Loading workspace persona…
				</div>
			) : settingsQuery.isError ? (
				<div
					className={cn(dmSansClassName(), "flex flex-col items-start gap-2")}
				>
					<p className="text-[13px] text-[#A3A3A3]">
						Workspace persona could not be loaded.
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
						value={persona}
						onChange={(event) => setPersona(event.target.value)}
						placeholder="Describe your workspace's goals, communication style, and how you prefer Company Brain to collaborate with your team..."
						maxLength={1500}
						className="min-h-[96px] w-full resize-y rounded-[12px] border border-white/[0.08] bg-[#0D121A] px-3.5 py-3 text-[13px] leading-relaxed text-[#FAFAFA] placeholder:text-[#525966] focus:border-white/[0.16] focus:outline-none"
					/>
					<div className="flex items-center justify-between">
						<span
							id={COUNTER_ID}
							className="text-[11px] text-[#737373] tabular-nums"
						>
							{persona.length}/1500
						</span>
						{dirty && (
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setPersona(savedPersona)}
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
