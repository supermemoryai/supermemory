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
	const { callTool, sendMessage } = useApp()
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
		() => writableTags.map((tag) => ({ value: tag, label: tag })),
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
		const notification = await sendMessage(
			`I used the Supermemory widget to save a memory to workspace "${selectedTag}"${memoryId ? ` (memory ID: ${memoryId})` : ""}. The memory is already saved; do not save it again.`,
		)
		if (!notification.ok) {
			log("warning", `[save] agent notification failed: ${notification.error}`)
		}
	}

	return (
		<div className="flex flex-col">
			<PageHeader
				description="Capture a thought to a workspace your team can search later."
				title="Add Memory"
			/>
			<div className="px-(--page-header-px) pb-(--space-6)">
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

					<div className="flex justify-end border-t border-border-muted pt-(--space-4)">
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
	)
}
