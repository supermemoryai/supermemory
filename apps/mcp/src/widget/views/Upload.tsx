import { useMemo, useState } from "react"
import {
	uploadPreparationSchema,
	uploadResponseSchema,
	type ViewMessage,
} from "../../shared/types"
import {
	ActionGroup,
	Button,
	Field,
	FileUpload,
	PageHeader,
	Stack,
	SpaceSelect,
} from "../design/ui"
import { useApp } from "../hooks/useApp"
import { formatNamespaceLabel } from "../lib/formatNamespace"
import { FileText, X } from "../lib/icons"

interface Props {
	activeNamespace?: string | null
	writableNamespaces: string[]
	onAdvance: (msg: ViewMessage) => void
	onError: (message: string) => void
	viewId?: string
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPT =
	".txt,.md,.pdf,.doc,.docx,.csv,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.m4a,.mp4,.webm"

export function Upload({
	activeNamespace,
	writableNamespaces,
	onAdvance,
	onError,
	viewId,
}: Props) {
	const { callTool, handoffToModel } = useApp()
	const [file, setFile] = useState<File | null>(null)
	const [selectedNamespace, setSelectedNamespace] = useState<string | null>(
		activeNamespace ?? writableNamespaces[0] ?? null,
	)
	const [uploading, setUploading] = useState(false)

	const options = useMemo(
		() =>
			writableNamespaces.map((namespace) => ({
				value: namespace,
				label: formatNamespaceLabel(namespace),
				description: namespace,
			})),
		[writableNamespaces],
	)

	const canUpload = !!file && !!selectedNamespace && !uploading

	const handleUpload = async () => {
		if (!file || !selectedNamespace) return
		setUploading(true)
		try {
			const preparation = await callTool(
				"prepare-file-upload",
				{ namespace: selectedNamespace },
				uploadPreparationSchema,
			)
			if (!preparation.ok || !preparation.data) {
				onError(preparation.error ?? "Unable to prepare upload")
				return
			}

			const formData = new FormData()
			formData.append("file", file, file.name)
			formData.append(
				"metadata",
				JSON.stringify({ sm_source: "supermemory-mcp" }),
			)

			const response = await fetch(preparation.data.uploadUrl, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${preparation.data.uploadToken}`,
				},
				body: formData,
			})
			if (!response.ok) {
				const message =
					(await response.text()) || `Upload failed (${response.status})`
				onError(message)
				return
			}

			const uploaded = uploadResponseSchema.safeParse(await response.json())
			if (!uploaded.success) {
				onError("Upload returned an invalid response")
				return
			}

			const result: ViewMessage = {
				view: "upload-success",
				viewId,
				id: uploaded.data.id,
				fileName: file.name,
				namespace: selectedNamespace,
			}
			onAdvance(result)
			await handoffToModel({
				context: `Supermemory widget action completed. "${file.name}" was uploaded to space "${selectedNamespace}" with document ID "${uploaded.data.id}". It is already uploaded; do not upload it again.`,
				message: `I used the Supermemory widget to upload "${file.name}" to space "${selectedNamespace}" (document ID: ${uploaded.data.id}). The file is already uploaded; do not upload it again.`,
				structuredContent: {
					supermemory: {
						action: "file-uploaded",
						activeSpace: selectedNamespace,
						documentId: uploaded.data.id,
						fileName: file.name,
					},
				},
			})
		} catch (err) {
			onError(String(err))
		} finally {
			setUploading(false)
		}
	}

	return (
		<div className="flex flex-col">
			<PageHeader
				description="Send a document, image, audio, or video file into a space."
				title="Upload File"
			/>
			<div className="px-(--page-header-px) pb-(--space-6)">
				<div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-(--space-4) shadow-[var(--panel-shadow)]">
					<Stack gap="lg">
						{file ? (
							<div className="flex items-center justify-between gap-(--space-3) rounded-(--radius-lg) border border-[var(--border-control)] bg-[var(--bg-control)] p-(--space-3) shadow-[var(--shadow-inset)]">
								<div className="flex min-w-0 items-center gap-(--space-3)">
									<FileText className="size-5 shrink-0 text-text-secondary" />
									<div className="flex min-w-0 flex-col">
										<span className="truncate text-(length:--text-sm) font-medium text-text-primary">
											{file.name}
										</span>
										<span className="text-(length:--text-xs) font-mono text-text-muted">
											{formatFileSize(file.size)}
										</span>
									</div>
								</div>
								<Button
									aria-label="Remove file"
									iconLeft={<X className="size-4" />}
									onClick={() => setFile(null)}
									size="icon"
									variant="ghost"
								/>
							</div>
						) : (
							<FileUpload
								accept={ACCEPT}
								description="Supports documents, images, audio, and video"
								onFile={setFile}
							/>
						)}

						{writableNamespaces.length > 0 ? (
							<Field label="Space">
								<SpaceSelect
									onValueChange={setSelectedNamespace}
									options={options}
									value={selectedNamespace}
								/>
							</Field>
						) : null}

						<div className="flex justify-end pt-(--space-1)">
							<ActionGroup>
								<Button
									disabled={!canUpload}
									loading={uploading}
									onClick={handleUpload}
									variant="primary"
								>
									{uploading ? "Uploading" : "Upload file"}
								</Button>
							</ActionGroup>
						</div>
					</Stack>
				</div>
			</div>
		</div>
	)
}
