import { useState } from "react"
import { viewMessageSchema, type ViewMessage } from "../../shared/types"
import { initialSpaceTarget, SpaceField } from "../components/SpaceField"
import {
	ActionGroup,
	Button,
	Field,
	PageHeader,
	Stack,
	TextArea,
} from "../design/ui"
import { useApp } from "../hooks/useApp"

interface Props {
	activeNamespace?: string | null
	writableNamespaces: string[]
	canCreateNamespace?: boolean
	writeBlockedReason?: string
	prefill?: string
	onAdvance: (msg: ViewMessage) => void
	onError: (message: string) => void
	viewId?: string
}

export function Save({
	activeNamespace,
	writableNamespaces,
	canCreateNamespace = false,
	writeBlockedReason,
	prefill,
	onAdvance,
	onError,
	viewId,
}: Props) {
	const { callTool, handoffToModel } = useApp()
	const [content, setContent] = useState(prefill ?? "")
	const [target, setTarget] = useState(() =>
		initialSpaceTarget(activeNamespace, writableNamespaces, canCreateNamespace),
	)
	const [saving, setSaving] = useState(false)
	const selectedNamespace = target?.namespace

	const trimmed = content.trim()
	const canSave = trimmed.length > 0 && !!selectedNamespace && !saving

	const handleSave = async () => {
		if (!canSave || !selectedNamespace) return
		setSaving(true)
		const result = await callTool(
			"save-memory",
			{
				content: trimmed,
				namespace: selectedNamespace,
				viewId,
			},
			viewMessageSchema,
		)
		setSaving(false)
		if (!result.ok || !result.data) {
			onError(result.error ?? "Failed to save memory")
			return
		}
		const memoryId =
			result.data.view === "save-success" ? result.data.id : undefined
		onAdvance(result.data)
		await handoffToModel({
			context: `Supermemory widget action completed. A memory was saved to space "${selectedNamespace}"${memoryId ? ` with memory ID "${memoryId}"` : ""}. Saved content:\n\n${trimmed}\n\nIt is already saved; do not save it again.`,
			message: `I used the Supermemory widget to save a memory to space "${selectedNamespace}"${memoryId ? ` (memory ID: ${memoryId})` : ""}. The memory is already saved; do not save it again.`,
			structuredContent: {
				supermemory: {
					action: "memory-saved",
					activeSpace: selectedNamespace,
					memoryId,
					content: trimmed,
				},
			},
		})
	}

	return (
		<div className="flex flex-col">
			<PageHeader
				description="Capture a thought to a space your team can search later."
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

						<SpaceField
							canCreateNamespace={canCreateNamespace}
							onChange={setTarget}
							value={target}
							writableNamespaces={writableNamespaces}
							writeBlockedReason={writeBlockedReason}
						/>

						<div className="flex justify-end pt-(--space-1)">
							<ActionGroup>
								<Button
									disabled={!canSave}
									loading={saving}
									onClick={handleSave}
									variant="primary"
								>
									{saving
										? "Saving"
										: target?.isNew
											? "Create space and save"
											: "Save memory"}
								</Button>
							</ActionGroup>
						</div>
					</Stack>
				</div>
			</div>
		</div>
	)
}
