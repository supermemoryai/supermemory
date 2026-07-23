"use client"

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
import { Building2, Loader2, Trash2, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"
import {
	type BrainSkill,
	useDeleteBrainSkill,
	useSaveBrainSkill,
} from "@/hooks/use-brain-skills"
import { dmSans125ClassName } from "@/lib/fonts"
import {
	canSelectSkillScope,
	SKILL_BODY_MAX_LENGTH,
	SKILL_DESCRIPTION_MAX_LENGTH,
	setSkillDraftScope,
	skillDraftPayload,
	skillDraftForRole,
	skillDraftsEqual,
	type NewSkillOrigin,
	type SkillDraft,
	type SkillScope,
} from "./domain"

const inputClass = cn(
	dmSans125ClassName(),
	"w-full rounded-[10px] border border-white/[0.08] bg-[#0D0F14] px-3 text-[13px] text-[#FAFAFA] outline-none transition-colors focus:border-white/[0.16] read-only:cursor-default read-only:text-[#B5BDC9] disabled:opacity-50",
)
const labelClass = cn(
	dmSans125ClassName(),
	"text-[11px] font-medium uppercase tracking-[0.06em] text-[#687282]",
)
const secondaryButtonClass = cn(
	dmSans125ClassName(),
	"inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/10 px-4 text-[13px] font-medium text-[#9AA3B2] transition-colors hover:bg-white/[0.04] hover:text-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-45",
)
const primaryButtonClass = cn(
	dmSans125ClassName(),
	"inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#14161A] px-4 text-[13px] font-semibold text-[#FAFAFA] shadow-inside-out transition-colors hover:bg-[#121820] disabled:cursor-not-allowed disabled:opacity-45",
)

function messageFor(error: unknown): string | null {
	return error instanceof Error
		? error.message
		: error
			? "Something went wrong."
			: null
}

function ScopeButton({
	value,
	label,
	icon,
	selected,
	disabled,
	onSelect,
}: {
	value: SkillScope
	label: string
	icon: React.ReactNode
	selected: boolean
	disabled: boolean
	onSelect: (scope: SkillScope) => void
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			aria-pressed={selected}
			onClick={() => onSelect(value)}
			className={cn(
				dmSans125ClassName(),
				"inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
				selected
					? "border-[#3B82F6]/40 bg-[#2563EB]/10 text-[#BFDBFE]"
					: "border-white/[0.08] text-[#7E8794] hover:border-white/[0.14] hover:text-[#FAFAFA]",
			)}
		>
			{icon}
			{label}
		</button>
	)
}

function MarkdownPreview({ body }: { body: string }) {
	return (
		<div
			className={cn(
				dmSans125ClassName(),
				"prose prose-invert prose-sm min-h-[280px] max-w-none overflow-auto rounded-[10px] border border-white/[0.08] bg-[#0D0F14] px-4 py-3 text-[#C6CDD7]",
				"prose-headings:text-[#FAFAFA] prose-a:text-[#93C5FD] prose-code:text-[#D8B4FE] prose-strong:text-[#FAFAFA]",
			)}
		>
			{body.trim() ? (
				<ReactMarkdown>{body}</ReactMarkdown>
			) : (
				<p className="not-prose text-[13px] text-[#596270]">
					Nothing to preview yet.
				</p>
			)}
		</div>
	)
}

export function SkillEditor({
	skill,
	initialDraft,
	isAdmin,
	viewerId,
	draftKind,
	createOrigin,
	onClose,
	onDirtyChange,
}: {
	skill: BrainSkill | null
	initialDraft: SkillDraft
	isAdmin: boolean
	viewerId: string
	draftKind?: "new" | "upload"
	createOrigin?: NewSkillOrigin
	onClose: () => void
	onDirtyChange?: (dirty: boolean) => void
}) {
	const privateSkillUnavailable =
		!!skill && skill.scope === "personal" && skill.creatorUserId !== viewerId
	const [draft, setDraft] = useState(() =>
		privateSkillUnavailable
			? { name: "", description: "", body: "", scope: "personal" as const }
			: skill
				? initialDraft
				: skillDraftForRole(initialDraft, isAdmin),
	)
	const [preview, setPreview] = useState(false)
	const [clientError, setClientError] = useState<string | null>(null)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const save = useSaveBrainSkill()
	const remove = useDeleteBrainSkill()
	const isDirty =
		!privateSkillUnavailable && !skillDraftsEqual(draft, initialDraft)

	useEffect(() => {
		onDirtyChange?.(isDirty)
	}, [isDirty, onDirtyChange])

	if (privateSkillUnavailable) {
		return (
			<div
				role="alert"
				className={cn(
					dmSans125ClassName(),
					"flex min-h-40 flex-col items-center justify-center gap-3 rounded-[14px] bg-[#14161A] px-5 py-8 text-center",
					"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
				)}
			>
				<div>
					<p className="text-[13px] font-semibold text-[#FAFAFA]">
						Personal skill unavailable
					</p>
					<p className="mt-1 text-[12px] text-[#737B87]">
						This private skill is only available to its creator.
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className={secondaryButtonClass}
				>
					Close
				</button>
			</div>
		)
	}

	const isCreator = !skill || skill.creatorUserId === viewerId
	const canManage = skill
		? skill.canEdit
		: isAdmin || draft.scope === "personal"
	const canDelete = skill?.canDelete ?? false
	const canSelectScope = (scope: SkillScope) =>
		canSelectSkillScope(skill, viewerId, isAdmin, scope)
	const showSharedScopeOptions = isAdmin
	const busy = save.isPending || remove.isPending
	const bodyBytes = new TextEncoder().encode(draft.body).length
	const mutationError = messageFor(save.error) ?? messageFor(remove.error)
	const visibleError = clientError ?? mutationError
	const scopePermissionCopy =
		!skill && !isAdmin
			? "New member skills are personal. Only admins and owners can create org-wide skills."
			: skill?.scope === "personal" && isCreator && !isAdmin
				? "This skill stays personal. Only creators who are also admins or owners can make personal skills org-wide."
				: skill?.scope !== "personal" && isAdmin && !isCreator
					? "Only the original creator can convert this org-wide skill to Personal."
					: null

	const resetErrors = () => {
		setClientError(null)
		save.reset()
		remove.reset()
	}
	const set = <K extends keyof SkillDraft>(key: K, value: SkillDraft[K]) => {
		resetErrors()
		setDraft((current) => ({ ...current, [key]: value }))
	}

	const saveDraft = () => {
		if (busy || !canManage) return
		let payload: SkillDraft
		try {
			payload = skillDraftPayload(draft)
		} catch (error) {
			setClientError(messageFor(error))
			return
		}
		save.mutate(
			{
				id: skill?.id ?? null,
				draft: payload,
				createOrigin,
				expectedVersion: skill?.version,
			},
			{
				onSuccess: () => {
					toast.success("Skill saved.")
					onClose()
				},
			},
		)
	}
	return (
		<div
			className={cn(
				dmSans125ClassName(),
				"relative flex flex-col gap-4 rounded-[14px] bg-[#14161A] p-5",
				"shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]",
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-3 border-white/[0.05] border-b pb-3">
				<div className="min-w-0">
					<p className="text-[13px] font-semibold text-[#FAFAFA]">
						{draftKind === "upload"
							? "Review uploaded skill"
							: skill
								? canManage
									? "Edit skill"
									: "View skill"
								: "New skill"}
					</p>
					{draftKind === "upload" ? (
						<p className="mt-0.5 text-[11px] text-[#687282]">Not saved yet</p>
					) : null}
				</div>
				<div className="inline-flex rounded-full border border-white/[0.08] bg-[#0D0F14] p-0.5">
					<button
						type="button"
						onClick={() => setPreview(false)}
						className={cn(
							"rounded-full px-3 py-1 text-[11px] transition-colors",
							!preview ? "bg-white/[0.08] text-[#FAFAFA]" : "text-[#687282]",
						)}
					>
						Write
					</button>
					<button
						type="button"
						onClick={() => setPreview(true)}
						className={cn(
							"rounded-full px-3 py-1 text-[11px] transition-colors",
							preview ? "bg-white/[0.08] text-[#FAFAFA]" : "text-[#687282]",
						)}
					>
						Preview
					</button>
				</div>
			</div>

			{!canManage ? (
				<p className="rounded-[9px] border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[12px] text-[#8B929E]">
					{skill?.scope === "personal"
						? "Only this skill’s creator can edit or delete it. Admin access does not override personal ownership. You can still read the full playbook below."
						: isAdmin
							? "You can view this org-wide skill, but it cannot be edited or deleted in its current state."
							: "Only admins and owners can edit or delete org-wide skills. You can still read the full playbook below."}
				</p>
			) : null}
			{skill?.status === "disabled" ? (
				<p className="rounded-[9px] border border-red-400/15 bg-red-400/[0.05] px-3 py-2 text-[12px] text-red-200">
					This skill is disabled.
					{skill.rejectionReason ? ` Reason: ${skill.rejectionReason}` : null}
				</p>
			) : null}
			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
				<label className="flex min-w-0 flex-col gap-1.5">
					<span className={labelClass}>Name</span>
					<input
						value={draft.name}
						onChange={(event) => set("name", event.target.value)}
						readOnly={!canManage}
						disabled={busy}
						placeholder="e.g. Incident status updates"
						className={cn(inputClass, "h-9")}
					/>
				</label>
				<label className="flex min-w-0 flex-col gap-1.5">
					<span className="flex items-center justify-between gap-2">
						<span className={labelClass}>Description</span>
						<span className="text-[10px] text-[#596270]">
							{draft.description.length}/{SKILL_DESCRIPTION_MAX_LENGTH}
						</span>
					</span>
					<input
						value={draft.description}
						onChange={(event) => set("description", event.target.value)}
						readOnly={!canManage}
						disabled={busy}
						maxLength={SKILL_DESCRIPTION_MAX_LENGTH}
						placeholder="When should the brain use this playbook?"
						className={cn(inputClass, "h-9")}
					/>
				</label>
			</div>

			<div className="flex flex-col gap-1.5">
				<span className="flex items-center justify-between gap-2">
					<span className={labelClass}>Instructions (Markdown)</span>
					<span
						className={cn(
							"text-[10px]",
							bodyBytes > SKILL_BODY_MAX_LENGTH
								? "text-red-300"
								: "text-[#596270]",
						)}
					>
						{Math.ceil(bodyBytes / 1024)} / 16 KB
					</span>
				</span>
				{preview || !canManage ? (
					<MarkdownPreview body={draft.body} />
				) : (
					<textarea
						value={draft.body}
						onChange={(event) => set("body", event.target.value)}
						disabled={busy}
						maxLength={SKILL_BODY_MAX_LENGTH}
						spellCheck={false}
						placeholder="# Process\n\nDescribe the steps, format, and voice to follow."
						className="min-h-[280px] w-full resize-y rounded-[10px] border border-white/[0.08] bg-[#0D0F14] px-4 py-3 font-mono text-[12px] leading-5 text-[#D3D8E0] outline-none transition-colors focus:border-white/[0.16] disabled:opacity-50"
					/>
				)}
			</div>

			{canManage ? (
				<div className="flex flex-col gap-2">
					<span className={labelClass}>Who can use it</span>
					<div className="flex flex-wrap gap-2">
						<ScopeButton
							value="personal"
							label="Personal"
							icon={<UserRound className="size-3.5" />}
							selected={draft.scope === "personal"}
							disabled={!canSelectScope("personal") || busy}
							onSelect={(scope) => {
								resetErrors()
								setDraft((current) => setSkillDraftScope(current, scope))
							}}
						/>
						{showSharedScopeOptions ? (
							<ScopeButton
								value="org"
								label="Org-wide"
								icon={<Building2 className="size-3.5" />}
								selected={draft.scope === "org"}
								disabled={!canSelectScope("org") || busy}
								onSelect={(scope) => {
									resetErrors()
									setDraft((current) => setSkillDraftScope(current, scope))
								}}
							/>
						) : null}
					</div>
					{scopePermissionCopy ? (
						<p className="text-[11px] leading-5 text-[#687282]">
							{scopePermissionCopy}
						</p>
					) : null}
				</div>
			) : null}

			{visibleError ? (
				<div
					role="alert"
					className="rounded-[9px] border border-red-400/15 bg-red-400/[0.05] px-3 py-2 text-[12px] text-red-300"
				>
					{visibleError}
				</div>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-3 border-white/[0.05] border-t pt-3">
				<div>
					{canDelete ? (
						<button
							type="button"
							disabled={busy}
							onClick={() => setDeleteOpen(true)}
							className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] text-[#A7685B] transition-colors hover:bg-red-400/[0.05] hover:text-red-300 disabled:opacity-45"
						>
							<Trash2 className="size-4" /> Delete
						</button>
					) : null}
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={busy}
						onClick={onClose}
						className={secondaryButtonClass}
					>
						Cancel
					</button>
					{canManage ? (
						<button
							type="button"
							disabled={busy || (!!skill && !isDirty)}
							onClick={saveDraft}
							className={primaryButtonClass}
						>
							{save.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : null}
							{save.isPending ? "Saving…" : "Save"}
						</button>
					) : null}
				</div>
			</div>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent className="border-white/[0.08] bg-[#191D24] text-[#FAFAFA]">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{skill?.name}”?</AlertDialogTitle>
						<AlertDialogDescription className="text-[#8B929E]">
							{skill?.scope === "org"
								? "This removes the playbook for the workspace."
								: "This removes your private playbook."}{" "}
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{remove.error ? (
						<p role="alert" className="text-[12px] text-red-300">
							{messageFor(remove.error)}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={remove.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={remove.isPending}
							onClick={(event) => {
								event.preventDefault()
								if (!skill || !canDelete || remove.isPending) return
								remove.mutate(
									{ id: skill.id, expectedVersion: skill.version },
									{
										onSuccess: () => {
											toast.success("Skill deleted.")
											setDeleteOpen(false)
											onClose()
										},
									},
								)
							}}
							className="bg-red-600 text-white hover:bg-red-500"
						>
							{remove.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : null}
							Delete skill
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
