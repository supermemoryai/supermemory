"use client"

import { useAuth } from "@lib/auth-context"
import { cn } from "@lib/utils"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@ui/components/sheet"
import { FileUp, Loader2, Plus, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
	type BrainSkill,
	useBrainSkills,
	useUploadBrainSkill,
} from "@/hooks/use-brain-skills"
import { dmSans125ClassName } from "@/lib/fonts"
import {
	emptySkillDraft,
	parseSkillMarkdown,
	skillDraftForRole,
	type SkillDraft,
	type SkillScope,
} from "./company-brain-skills/domain"
import { SkillEditor } from "./company-brain-skills/skill-editor"
import { SkillRow } from "./company-brain-skills/skill-row"

type EditorTarget =
	| { mode: "existing"; skillId: string }
	| { mode: "new" | "upload"; key: number; draft: SkillDraft }

type PendingIntent = { type: "close" } | { type: "open"; target: EditorTarget }

type ScopeFilter = "all" | "org" | "personal"

const SCOPE_HINTS: Record<ScopeFilter, string> = {
	all: "Org-wide skills are shared with the workspace and managed by admins and owners. Personal skills stay private to you.",
	org: "Shared with the workspace and managed by admins and owners.",
	personal: "Private to you and managed only by you.",
}

const EMPTY_MESSAGES: Record<ScopeFilter, string> = {
	all: "No skills yet. Create one or upload a .md playbook to get started.",
	org: "No org-wide skills yet.",
	personal: "No personal skills yet.",
}

function draftFromSkill(skill: BrainSkill): SkillDraft {
	return {
		name: skill.name,
		description: skill.description,
		body: skill.body,
		scope: skill.scope,
	}
}

function uploadedDraft(
	local: ReturnType<typeof parseSkillMarkdown>,
	server: Partial<SkillDraft>,
): SkillDraft {
	return {
		name: typeof server.name === "string" ? server.name : local.name,
		description:
			typeof server.description === "string"
				? server.description
				: local.description,
		body: typeof server.body === "string" ? server.body : local.body,
		scope: "personal",
	}
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback
}

export default function CompanyBrainSkills({
	onUnsavedChangesChange,
}: {
	onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void
}) {
	const { org, user } = useAuth()
	return (
		<CompanyBrainSkillsContent
			key={`${org?.id ?? "no-org"}:${user?.id ?? "no-user"}`}
			userId={user?.id ?? ""}
			onUnsavedChangesChange={onUnsavedChangesChange}
		/>
	)
}

function CompanyBrainSkillsContent({
	userId,
	onUnsavedChangesChange,
}: {
	userId: string
	onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void
}) {
	const skillsQuery = useBrainSkills()
	const upload = useUploadBrainSkill()
	const [editing, setEditing] = useState<EditorTarget | null>(null)
	const [editorDirty, setEditorDirty] = useState(false)
	const [pending, setPending] = useState<PendingIntent | null>(null)
	const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all")
	const [uploadError, setUploadError] = useState<string | null>(null)
	const fileInput = useRef<HTMLInputElement>(null)
	const draftKey = useRef(0)
	// An uploaded draft holds real content the user hasn't saved, so it guards too.
	const hasUnsavedChanges = editorDirty || editing?.mode === "upload"

	useEffect(() => {
		onUnsavedChangesChange?.(hasUnsavedChanges)
	}, [hasUnsavedChanges, onUnsavedChangesChange])

	useEffect(
		() => () => {
			onUnsavedChangesChange?.(false)
		},
		[onUnsavedChangesChange],
	)

	const data = skillsQuery.data
	const viewerId = data?.viewerId ?? userId
	const isAdmin = data?.isAdmin ?? false
	const openEditor = (target: EditorTarget) => {
		setEditing(target)
		setEditorDirty(false)
	}
	const closeEditor = () => {
		setEditing(null)
		setEditorDirty(false)
		setPending(null)
	}
	const requestOpen = (target: EditorTarget) => {
		if (editing && hasUnsavedChanges) {
			setPending({ type: "open", target })
			return
		}
		openEditor(target)
	}
	const requestClose = () => {
		if (editing && hasUnsavedChanges) {
			setPending({ type: "close" })
			return
		}
		closeEditor()
	}
	const confirmPending = () => {
		if (!pending) return
		if (pending.type === "close") closeEditor()
		else openEditor(pending.target)
		setPending(null)
	}
	const openDraft = (kind: "new" | "upload", draft: SkillDraft) => {
		requestOpen({
			mode: kind,
			key: draftKey.current++,
			draft: skillDraftForRole(draft, isAdmin),
		})
	}

	const onUpload = async (file: File | undefined) => {
		if (!file || upload.isPending) return
		setUploadError(null)
		upload.reset()
		if (!file.name.toLowerCase().endsWith(".md")) {
			setUploadError("Choose a Markdown file ending in .md.")
			return
		}
		try {
			const content = await file.text()
			// Client parsing gives immediate, deterministic feedback; the harness runs
			// the same validation and remains authoritative before the draft opens.
			const local = parseSkillMarkdown(content)
			const result = await upload.mutateAsync(content)
			openDraft("upload", uploadedDraft(local, result.draft))
			toast.success("Skill file is ready to review.")
		} catch (error) {
			setUploadError(errorMessage(error, "Couldn't read this skill file."))
		}
	}

	const orgSkills = (data?.skills ?? []).filter(
		(skill) => skill.scope === "org",
	)
	const personalSkills = (data?.skills ?? []).filter(
		(skill) => skill.scope === "personal" && skill.creatorUserId === viewerId,
	)
	const visibleSkills =
		scopeFilter === "org"
			? orgSkills
			: scopeFilter === "personal"
				? personalSkills
				: [...orgSkills, ...personalSkills]
	const newSkillScope: SkillScope =
		scopeFilter === "org" && isAdmin ? "org" : "personal"
	const target = editing
	const editingSkill =
		target?.mode === "existing"
			? ((data?.skills ?? []).find((skill) => skill.id === target.skillId) ??
				null)
			: null
	const renderSkill = (skill: BrainSkill) => (
		<SkillRow
			key={skill.id}
			skill={skill}
			onOpen={() => requestOpen({ mode: "existing", skillId: skill.id })}
		/>
	)

	return (
		<section className={cn(dmSans125ClassName(), "flex flex-col gap-3")}>
			{skillsQuery.isLoading ? (
				<div className="flex min-h-32 items-center justify-center gap-2 text-[13px] text-[#7E8794]">
					<Loader2 className="size-4 animate-spin" /> Loading skills…
				</div>
			) : skillsQuery.isError ? (
				<div
					role="alert"
					className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-[12px] border border-red-400/10 bg-red-400/[0.025] px-4 text-center"
				>
					<p className="text-[13px] text-red-300">
						{errorMessage(skillsQuery.error, "Couldn't load skills.")}
					</p>
					<button
						type="button"
						disabled={skillsQuery.isFetching}
						onClick={() => void skillsQuery.refetch()}
						className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 px-3 text-[12px] text-[#B5BDC9] hover:bg-white/[0.04] disabled:opacity-45"
					>
						<RotateCcw
							className={cn(
								"size-3.5",
								skillsQuery.isFetching && "animate-spin",
							)}
						/>
						Try again
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div
							role="tablist"
							aria-label="Filter skills by scope"
							className="flex items-center gap-0.5 rounded-full bg-white/[0.04] p-0.5"
						>
							{(
								[
									{
										id: "all",
										label: "All",
										count: orgSkills.length + personalSkills.length,
									},
									{ id: "org", label: "Org-wide", count: orgSkills.length },
									{
										id: "personal",
										label: "Personal",
										count: personalSkills.length,
									},
								] as const
							).map((tab) => (
								<button
									key={tab.id}
									type="button"
									role="tab"
									aria-selected={scopeFilter === tab.id}
									onClick={() => setScopeFilter(tab.id)}
									className={cn(
										"inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors",
										scopeFilter === tab.id
											? "bg-white/[0.09] text-[#FAFAFA]"
											: "text-[#8B929E] hover:text-[#FAFAFA]",
									)}
								>
									{tab.label}
									{tab.count > 0 ? (
										<span className="tabular-nums text-[11px] text-[#6B7482]">
											{tab.count}
										</span>
									) : null}
								</button>
							))}
						</div>

						<div className="flex shrink-0 items-center gap-2">
							<input
								ref={fileInput}
								type="file"
								accept=".md,text/markdown,text/plain"
								hidden
								onChange={(event) => {
									const file = event.currentTarget.files?.[0]
									event.currentTarget.value = ""
									void onUpload(file)
								}}
							/>
							<button
								type="button"
								disabled={upload.isPending}
								onClick={() => fileInput.current?.click()}
								className="inline-flex h-8 items-center gap-2 rounded-full border border-white/[0.09] px-3.5 text-[12px] font-medium text-[#9AA3B2] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-45"
							>
								{upload.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<FileUp className="size-4" />
								)}
								{upload.isPending ? "Reading…" : "Upload .md"}
							</button>
							<button
								type="button"
								onClick={() =>
									openDraft("new", {
										...emptySkillDraft(),
										scope: newSkillScope,
									})
								}
								className="inline-flex h-8 items-center gap-2 rounded-full bg-white/[0.09] px-3.5 text-[12px] font-medium text-[#FAFAFA] transition-colors hover:bg-white/[0.14]"
							>
								<Plus className="size-4" /> New skill
							</button>
						</div>
					</div>

					<p className="text-[11px] leading-5 text-[#596270]">
						{SCOPE_HINTS[scopeFilter]} Skills created through Company Brain
						appear here automatically.
					</p>

					{uploadError ? (
						<div
							role="alert"
							className="flex items-center justify-between gap-3 rounded-[9px] border border-red-400/15 bg-red-400/[0.05] px-3 py-2 text-[12px] text-red-300"
						>
							<span>{uploadError}</span>
							<button
								type="button"
								onClick={() => setUploadError(null)}
								className="shrink-0 text-[11px] text-red-200 hover:text-white"
							>
								Dismiss
							</button>
						</div>
					) : null}

					{visibleSkills.length > 0 ? (
						<div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#14161A]">
							<div className="divide-y divide-white/[0.05]">
								{visibleSkills.map(renderSkill)}
							</div>
						</div>
					) : (
						<p className="rounded-xl border border-white/[0.06] border-dashed px-4 py-5 text-center text-[12px] text-[#596270]">
							{EMPTY_MESSAGES[scopeFilter]}
						</p>
					)}
				</div>
			)}

			<Sheet
				open={target !== null}
				onOpenChange={(open) => {
					if (!open) requestClose()
				}}
			>
				<SheetContent
					side="right"
					className="flex w-full flex-col gap-0 border-white/[0.06] bg-[#14161A] p-0 sm:max-w-[720px]"
				>
					<SheetTitle className="sr-only">Skill editor</SheetTitle>
					<SheetDescription className="sr-only">
						Edit the name, scope, description and Markdown instructions for this
						skill.
					</SheetDescription>
					{target?.mode === "existing" ? (
						editingSkill ? (
							<SkillEditor
								key={`${editingSkill.id}:${editingSkill.version}:${editingSkill.updatedAt}`}
								skill={editingSkill}
								initialDraft={draftFromSkill(editingSkill)}
								isAdmin={isAdmin}
								viewerId={viewerId}
								onClose={closeEditor}
								onDirtyChange={setEditorDirty}
							/>
						) : (
							<p className="p-5 text-[13px] text-[#8B929E]">
								This skill is no longer available.
							</p>
						)
					) : target ? (
						<SkillEditor
							key={target.key}
							skill={null}
							initialDraft={target.draft}
							isAdmin={isAdmin}
							viewerId={viewerId}
							draftKind={target.mode}
							createOrigin={target.mode === "upload" ? "upload" : "web"}
							onClose={closeEditor}
							onDirtyChange={setEditorDirty}
						/>
					) : null}
				</SheetContent>
			</Sheet>

			<AlertDialog
				open={pending !== null}
				onOpenChange={(open) => {
					if (!open) setPending(null)
				}}
			>
				<AlertDialogContent className="border-white/[0.08] bg-[#191D24] text-[#FAFAFA]">
					<AlertDialogHeader>
						<AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
						<AlertDialogDescription className="text-[#8B929E]">
							{pending?.type === "open"
								? "Opening another skill will discard the edits in this skill."
								: "Closing the editor will discard the edits in this skill."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep editing</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmPending}
							className="bg-red-600 text-white hover:bg-red-500"
						>
							{pending?.type === "open" ? "Discard and open" : "Discard"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	)
}
