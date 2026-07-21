import { useEffect, useMemo, useState } from "react"
import type { ViewMessage } from "../../shared/types"
import {
	ActionGroup,
	Button,
	Field,
	PageHeader,
	Stack,
	TextArea,
	WorkspaceSelect,
} from "../design/ui"
import { useApp } from "../hooks/useApp"
import { useLog } from "../hooks/useLog"
import { formatTagLabel } from "../lib/formatTag"

interface Props {
	activeTag?: string | null
	writableTags: string[]
	prefill?: string
	onAdvance: (msg: ViewMessage) => void
	onError: (message: string) => void
}

export function Save({
	activeTag,
	writableTags,
	prefill,
	onAdvance,
	onError,
}: Props) {
	const { callTool, updateModelContext } = useApp()
	const log = useLog()
	const [content, setContent] = useState(prefill ?? "")
	const [selectedTag, setSelectedTag] = useState<string | null>(
		activeTag ?? writableTags[0] ?? null,
	)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (!selectedTag && writableTags.length > 0) {
			setSelectedTag(writableTags[0])
		}
	}, [selectedTag, writableTags])

	const options = useMemo(
		() =>
			writableTags.map((tag) => ({
				value: tag,
				label: formatTagLabel(tag),
				description: tag,
			})),
		[writableTags],
	)

	const trimmed = content.trim()
	const canSave = trimmed.length > 0 && !!selectedTag && !saving

	const handleSave = async () => {
		if (!canSave || !selectedTag) return
		log("info", `[save] submit (${trimmed.length} chars → ${selectedTag})`)
		setSaving(true)
		const result = await callTool<ViewMessage>("save-memory", {
			content: trimmed,
			containerTag: selectedTag,
		})
		setSaving(false)
		if (!result.ok || !result.data) {
			log("error", `[save] failed: ${result.error}`)
			onError(result.error ?? "Failed to save memory")
			return
		}
		const memoryId =
			result.data.view === "save-success" ? result.data.id : undefined
		onAdvance(result.data)
		const contextUpdate = await updateModelContext(
			`Supermemory widget action completed. A memory was saved to workspace "${selectedTag}"${memoryId ? ` with memory ID "${memoryId}"` : ""}. It is already saved; do not save it again.`,
		)
		if (!contextUpdate.ok) {
			log(
				"warning",
				`[save] model context update failed: ${contextUpdate.error}`,
			)
		}
	}

	return (
		<div className="flex flex-col">
			<PageHeader
				description="Capture a thought to a workspace your team can search later."
				title="Add Memory"
			/>
			<div className="px-(--page-header-px) pb-(--space-6)">
				<div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-(--space-4) shadow-[var(--panel-shadow)]">
					<Stack gap="lg">
						<Field label="Memory">
							<TextArea
								className="min-h-40"
								onChange={(e) => setContent(e.target.value)}
								placeholder="Enter content to save as a memory…"
								value={content}
							/>
						</Field>

						{writableTags.length > 0 ? (
							<Field label="Workspace">
								<WorkspaceSelect
									onValueChange={setSelectedTag}
									options={options}
									value={selectedTag}
								/>
							</Field>
						) : null}

						<div className="flex justify-end pt-(--space-1)">
							<ActionGroup>
								<Button
									disabled={!canSave}
									loading={saving}
									onClick={handleSave}
									variant="primary"
								>
									{saving ? "Saving" : "Save memory"}
								</Button>
							</ActionGroup>
						</div>
					</Stack>
				</div>
			</div>
		</div>
	)
}
