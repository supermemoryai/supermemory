import { useMemo, useState } from "react"
import type { ViewMessage } from "../../shared/types"
import {
	ActionGroup,
	Button,
	Field,
	FileUpload,
	PageHeader,
	Stack,
	WorkspaceSelect,
} from "../design/ui"
import { useApp } from "../hooks/useApp"
import { useLog } from "../hooks/useLog"
import { FileText, X } from "../lib/icons"
import { readFileAsBase64 } from "../lib/readFileAsBase64"

interface Props {
	activeTag?: string | null
	writableTags: string[]
	onAdvance: (msg: ViewMessage) => void
	onError: (message: string) => void
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPT = ".txt,.pdf,.png,.jpg,.jpeg,.mp4"

export function Upload({ activeTag, writableTags, onAdvance, onError }: Props) {
	const { callTool, updateModelContext } = useApp()
	const log = useLog()
	const [file, setFile] = useState<File | null>(null)
	const [selectedTag, setSelectedTag] = useState<string | null>(
		activeTag ?? writableTags[0] ?? null,
	)
	const [uploading, setUploading] = useState(false)

	const options = useMemo(
		() => writableTags.map((tag) => ({ value: tag, label: tag })),
		[writableTags],
	)

	const canUpload = !!file && !!selectedTag && !uploading

	const handleUpload = async () => {
		if (!file || !selectedTag) return
		log("info", `[upload] submit ${file.name} (${file.size}B → ${selectedTag})`)
		setUploading(true)
		try {
			const fileData = await readFileAsBase64(file)
			const result = await callTool<ViewMessage>("upload-file-submit", {
				fileData,
				fileName: file.name,
				mimeType: file.type,
				containerTag: selectedTag,
			})
			if (!result.ok || !result.data) {
				log("error", `[upload] failed: ${result.error}`)
				onError(result.error ?? "Upload failed")
				return
			}
			const documentId =
				result.data.view === "upload-success" ? result.data.id : undefined
			onAdvance(result.data)
			const contextUpdate = await updateModelContext(
				`Supermemory widget action completed. "${file.name}" was uploaded to workspace "${selectedTag}"${documentId ? ` with document ID "${documentId}"` : ""}. It is already uploaded; do not upload it again.`,
			)
			if (!contextUpdate.ok) {
				log(
					"warning",
					`[upload] model context update failed: ${contextUpdate.error}`,
				)
			}
		} catch (err) {
			log("error", `[upload] threw: ${err}`)
			onError(String(err))
		} finally {
			setUploading(false)
		}
	}

	return (
		<div className="flex flex-col">
			<PageHeader
				description="Send a file (text, PDF, image, video) into a workspace."
				title="Upload File"
			/>
			<div className="px-(--page-header-px) pb-(--space-6)">
				<Stack gap="lg">
					{file ? (
						<div className="flex items-center justify-between gap-(--space-3) rounded-(--radius-lg) border border-border bg-bg-elevated p-(--space-3)">
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
							description="Supports TXT, PDF, PNG, JPG, MP4"
							onFile={setFile}
						/>
					)}

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
	)
}
