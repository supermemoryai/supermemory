import type { ChangeEvent, DragEvent, ReactNode } from "react"
import { useCallback, useState } from "react"
import { Upload } from "../../lib/icons"
import { cn } from "../lib/cn"

// Mirrors console-v2's FileUpload: label-based drop area, two-line copy,
// muted icon, --space-12 vertical padding, accent ring on drag-over.
//
// Simpler than console-v2's because the widget uses a single accept string
// and a single-file flow today (multiple={false}). MIME/extension partition
// is left to the caller via the existing `accept` HTML attribute.

interface FileUploadProps {
	accept: string
	onFile: (file: File) => void
	title?: string
	description?: string
	icon?: ReactNode
	disabled?: boolean
	className?: string
}

export function FileUpload({
	accept,
	onFile,
	title = "Drop a file here or click to browse",
	description,
	icon,
	disabled,
	className,
}: FileUploadProps) {
	const [dragOver, setDragOver] = useState(false)

	const handleDrop = useCallback(
		(e: DragEvent<HTMLLabelElement>) => {
			e.preventDefault()
			if (disabled) return
			setDragOver(false)
			const file = e.dataTransfer.files[0]
			if (file) onFile(file)
		},
		[disabled, onFile],
	)

	const handleInput = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			if (disabled) return
			const file = e.target.files?.[0]
			if (file) onFile(file)
			e.target.value = ""
		},
		[disabled, onFile],
	)

	return (
		<label
			className={cn(
				"flex min-h-[180px] flex-col items-center justify-center gap-(--space-3)",
				"py-(--space-12) px-(--space-6)",
				"border-2 border-dashed rounded-(--radius-lg)",
				"cursor-pointer transition-colors",
				dragOver
					? "border-accent bg-accent-muted/30"
					: "border-border hover:bg-bg-muted/40",
				disabled && "pointer-events-none opacity-50",
				className,
			)}
			onDragEnter={(e) => {
				e.preventDefault()
				if (!disabled) setDragOver(true)
			}}
			onDragLeave={(e) => {
				e.preventDefault()
				setDragOver(false)
			}}
			onDragOver={(e) => e.preventDefault()}
			onDrop={handleDrop}
		>
			{icon ?? <Upload className="size-8 text-text-muted" />}
			<div className="flex flex-col gap-(--space-1) text-center">
				<p className="text-(length:--text-sm) font-medium text-text-primary">
					{title}
				</p>
				{description ? (
					<p className="text-(length:--text-xs) text-text-muted">
						{description}
					</p>
				) : null}
			</div>
			<input
				accept={accept}
				className="hidden"
				disabled={disabled}
				onChange={handleInput}
				type="file"
			/>
		</label>
	)
}
