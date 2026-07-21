"use client"

import { LoaderIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/use-org-settings"
import { dmSans125ClassName, dmSansClassName } from "@/lib/fonts"
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

export function WorkspacePersona() {
	const { data: settings, isLoading, isError } = useOrgSettings()
	const updateSettings = useUpdateOrgSettings()
	const [persona, setPersona] = useState("")

	const savedPersona = settings?.workspacePersona ?? ""
	const dirty = persona.trim() !== savedPersona.trim()
	const settingsReady = !isLoading && !isError

	useEffect(() => {
		setPersona(settings?.workspacePersona ?? "")
	}, [settings?.workspacePersona])

	const handleSave = () => {
		updateSettings.mutate({
			workspacePersona: persona.trim() ? persona.trim() : null,
		})
	}

	return (
		<section id="workspace-persona" className="flex flex-col gap-3 px-1">
			<div className="min-w-0">
				<SectionTitle>Workspace Persona</SectionTitle>
				<p
					className={cn(
						dmSans125ClassName(),
						"text-[13px] tracking-[-0.13px] text-[#737373]",
					)}
				>
					Guide how Company Brain communicates and works with your workspace.
				</p>
			</div>

			<div className={cn(dmSansClassName(), "flex flex-col gap-2")}>
				<textarea
					value={persona}
					onChange={(event) => setPersona(event.target.value)}
					placeholder="Describe your workspace's goals, communication style, and how you prefer Company Brain to collaborate with your team..."
					maxLength={1500}
					disabled={!settingsReady || updateSettings.isPending}
					className="min-h-[96px] w-full resize-y rounded-[12px] border border-white/[0.08] bg-[#0D121A] px-3.5 py-3 text-[13px] leading-relaxed text-[#FAFAFA] placeholder:text-[#525966] focus:border-white/[0.16] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				/>
				<div className="flex items-center justify-between">
					<span className="text-[11px] text-[#737373] tabular-nums">
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
		</section>
	)
}
