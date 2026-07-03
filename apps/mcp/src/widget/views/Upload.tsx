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

// The MCP transport rejects JSON-RPC bodies over 4 MiB with a bare 413
// (MAXIMUM_MESSAGE_SIZE_BYTES in the agents SDK). The file travels base64
// encoded (~4/3 inflation) inside that body, so cap the raw file size such
// that the encoded payload plus the JSON-RPC envelope stays under the limit.
const TRANSPORT_MESSAGE_LIMIT_BYTES = 4 * 1024 * 1024
const ENVELOPE_ALLOWANCE_BYTES = 64 * 1024
const MAX_UPLOAD_BYTES = Math.floor(
	((TRANSPORT_MESSAGE_LIMIT_BYTES - ENVELOPE_ALLOWANCE_BYTES) * 3) / 4,
)

const FILE_TOO_LARGE_MESSAGE = (size: number) =>
	`This file is ${formatFileSize(size)}. The maximum upload size is ${formatFileSize(MAX_UPLOAD_BYTES)} — please choose a smaller file.`

// The transport-level 413 surfaces as an opaque error string; translate it
// so the user sees the size limit instead of a generic failure.
function friendlyUploadError(raw: string, fileSize: number): string {
	if (/413|too large|payload/i.test(raw)) {
		return FILE_TOO_LARGE_MESSAGE(fileSize)
	}
	return raw
}

export function Upload({ activeTag, writableTags, onAdvance, onError }: Props) {
	const { callTool } = useApp()
	const log = useLog()
	const [file, setFile] = useState<File | null>(null)
	const [fileError, setFileError] = useState<string | null>(null)
	const [selectedTag, setSelectedTag] = useState<string | null>(
		activeTag ?? writableTags[0] ?? null,
	)
	const [uploading, setUploading] = useState(false)

	const handleFileSelect = (selected: File) => {
		if (selected.size > MAX_UPLOAD_BYTES) {
			log(
				"warning",
				`[upload] rejected oversized file: ${selected.name} (${selected.size}B > ${MAX_UPLOAD_BYTES}B)`,
			)
			setFileError(FILE_TOO_LARGE_MESSAGE(selected.size))
			setFile(null)
			return
		}
		setFileError(null)
		setFile(selected)
	}

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
				onError(
					result.error
						? friendlyUploadError(result.error, file.size)
						: "Upload failed",
				)
				return
			}
			onAdvance(result.data)
		} catch (err) {
			log("error", `[upload] threw: ${err}`)
			onError(friendlyUploadError(String(err), file.size))
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
				<div className="rounded-[20px] bg-[#1B1F24] p-(--space-4) shadow-[0_2.842px_14.211px_0_rgba(0,0,0,0.25),inset_0.711px_0.711px_0.711px_0_rgba(255,255,255,0.10)]">
					<Stack gap="lg">
						{file ? (
							<div className="flex items-center justify-between gap-(--space-3) rounded-(--radius-lg) border border-[var(--border-control)] bg-[var(--bg-control)] p-(--space-3) shadow-sm">
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
							<Stack gap="sm">
								<FileUpload
									accept={ACCEPT}
									description={`Supports TXT, PDF, PNG, JPG, MP4 · up to ${formatFileSize(MAX_UPLOAD_BYTES)}`}
									onFile={handleFileSelect}
								/>
								{fileError ? (
									<p
										className="text-(length:--text-xs) leading-relaxed text-error"
										role="alert"
									>
										{fileError}
									</p>
								) : null}
							</Stack>
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

						<div className="flex justify-end pt-(--space-2)">
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
