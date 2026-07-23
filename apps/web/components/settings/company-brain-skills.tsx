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
} from "./company-brain-skills/domain"
import { SkillCard } from "./company-brain-skills/skill-card"
import { SkillEditor } from "./company-brain-skills/skill-editor"

type UnsavedDraft = {
	key: number
	kind: "new" | "upload"
	draft: SkillDraft
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
	const [openId, setOpenId] = useState<string | null>(null)
	const [openSkillDirty, setOpenSkillDirty] = useState(false)
	const [pendingOpenId, setPendingOpenId] = useState<string | null>(null)
	const [drafts, setDrafts] = useState<UnsavedDraft[]>([])
	const [uploadError, setUploadError] = useState<string | null>(null)
	const fileInput = useRef<HTMLInputElement>(null)
	const draftKey = useRef(0)
	const hasUnsavedChanges = openSkillDirty || drafts.length > 0

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
	const addDraft = (kind: UnsavedDraft["kind"], draft: SkillDraft) => {
		setDrafts((current) => [
			...current,
			{
				key: draftKey.current++,
				kind,
				draft: skillDraftForRole(draft, isAdmin),
			},
		])
	}
	const removeDraft = (key: number) => {
		setDrafts((current) => current.filter((item) => item.key !== key))
	}
	const closeOpenSkill = () => {
		setOpenId(null)
		setOpenSkillDirty(false)
		setPendingOpenId(null)
	}
	const requestOpenSkill = (skillId: string) => {
		if (openId && openId !== skillId && openSkillDirty) {
			setPendingOpenId(skillId)
			return
		}
		setOpenId(skillId)
		setOpenSkillDirty(false)
	}
	const confirmOpenSkill = () => {
		if (!pendingOpenId) return
		setOpenId(pendingOpenId)
		setOpenSkillDirty(false)
		setPendingOpenId(null)
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
			addDraft("upload", uploadedDraft(local, result.draft))
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
	const orgDrafts = drafts.filter((draft) => draft.draft.scope === "org")
	const personalDrafts = drafts.filter(
		(draft) => draft.draft.scope === "personal",
	)
	const renderSkill = (skill: BrainSkill) =>
		openId === skill.id ? (
			<div key={skill.id} className="sm:col-span-2 lg:col-span-3">
				<SkillEditor
					key={`${skill.id}:${skill.version}:${skill.updatedAt}`}
					skill={skill}
					initialDraft={draftFromSkill(skill)}
					isAdmin={isAdmin}
					viewerId={viewerId}
					onClose={closeOpenSkill}
					onDirtyChange={setOpenSkillDirty}
				/>
			</div>
		) : (
			<SkillCard
				key={skill.id}
				skill={skill}
				onOpen={() => requestOpenSkill(skill.id)}
			/>
		)
	const renderDraft = ({ key, kind, draft }: UnsavedDraft) => (
		<div key={key} className="sm:col-span-2 lg:col-span-3">
			<SkillEditor
				skill={null}
				initialDraft={draft}
				isAdmin={isAdmin}
				viewerId={viewerId}
				draftKind={kind}
				createOrigin={kind === "upload" ? "upload" : "web"}
				onClose={() => removeDraft(key)}
			/>
		</div>
	)

	return (
		<section className={cn(dmSans125ClassName(), "flex flex-col gap-3 px-1")}>
			<div className="flex justify-end">
				<div>
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
						className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.09] px-4 text-[12px] font-medium text-[#9AA3B2] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-45"
					>
						{upload.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<FileUp className="size-4" />
						)}
						{upload.isPending ? "Reading…" : "Upload .md"}
					</button>
				</div>
			</div>

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
				<div className="flex flex-col gap-7">
					<section
						aria-labelledby="org-skills-heading"
						className="flex flex-col gap-3"
					>
						<div>
							<h3
								id="org-skills-heading"
								className="text-[13px] font-semibold text-[#E5E7EB]"
							>
								Org-wide skills
							</h3>
							<p className="mt-0.5 text-[11px] text-[#596270]">
								Shared with the workspace and managed by admins and owners.
							</p>
						</div>
						{orgSkills.length > 0 || orgDrafts.length > 0 || isAdmin ? (
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{orgSkills.map(renderSkill)}
								{orgDrafts.map(renderDraft)}
								{isAdmin ? (
									<button
										type="button"
										onClick={() =>
											addDraft("new", {
												...emptySkillDraft(),
												scope: "org",
											})
										}
										className={cn(
											dmSans125ClassName(),
											"flex min-h-[150px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2A313C] border-dashed",
											"text-[13px] font-medium text-[#737B87] transition-colors hover:border-[#3A4150] hover:text-[#FAFAFA]",
										)}
									>
										<Plus className="size-4" /> New org-wide skill
									</button>
								) : null}
							</div>
						) : (
							<p className="rounded-xl border border-white/[0.06] border-dashed px-4 py-6 text-center text-[12px] text-[#596270]">
								No org-wide skills yet.
							</p>
						)}
					</section>

					<section
						aria-labelledby="personal-skills-heading"
						className="flex flex-col gap-3"
					>
						<div>
							<h3
								id="personal-skills-heading"
								className="text-[13px] font-semibold text-[#E5E7EB]"
							>
								Personal skills
							</h3>
							<p className="mt-0.5 text-[11px] text-[#596270]">
								Private to you and managed only by you.
							</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{personalSkills.map(renderSkill)}
							{personalDrafts.map(renderDraft)}
							<button
								type="button"
								onClick={() => addDraft("new", emptySkillDraft())}
								className={cn(
									dmSans125ClassName(),
									"flex min-h-[150px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2A313C] border-dashed",
									"text-[13px] font-medium text-[#737B87] transition-colors hover:border-[#3A4150] hover:text-[#FAFAFA]",
								)}
							>
								<Plus className="size-4" /> New personal skill
							</button>
						</div>
					</section>
				</div>
			)}

			<AlertDialog
				open={pendingOpenId !== null}
				onOpenChange={(open) => {
					if (!open) setPendingOpenId(null)
				}}
			>
				<AlertDialogContent className="border-white/[0.08] bg-[#191D24] text-[#FAFAFA]">
					<AlertDialogHeader>
						<AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
						<AlertDialogDescription className="text-[#8B929E]">
							Opening another skill will discard the edits in this skill.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep editing</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmOpenSkill}
							className="bg-red-600 text-white hover:bg-red-500"
						>
							Discard and open
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	)
}
