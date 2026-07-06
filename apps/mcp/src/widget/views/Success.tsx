import { Badge, Stack } from "../design/ui"
import { CheckCircle } from "../lib/icons"
import { formatTagLabel } from "../lib/formatTag"

interface SaveProps {
	kind: "save"
	id: string
	containerTag: string
}

interface UploadProps {
	kind: "upload"
	id: string
	fileName: string
	containerTag: string
}

type Props = SaveProps | UploadProps

export function Success(props: Props) {
	const isUpload = props.kind === "upload"
	return (
		<Stack
			align="center"
			className="mcp-panel mx-(--page-header-px) my-(--space-6) rounded-[20px] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-(--page-header-px) py-(--space-10) text-center shadow-[var(--panel-shadow)]"
			gap="md"
		>
			<div aria-hidden className="panel-glow" />
			<CheckCircle className="size-12 text-success" />
			<Stack align="center" gap="xs">
				<div className="text-(length:--text-sm) font-medium text-text-primary">
					{isUpload ? `Uploaded ${props.fileName}` : "Memory saved"}
				</div>
				<Badge variant="accent">{formatTagLabel(props.containerTag)}</Badge>
			</Stack>
			<p className="break-all font-mono text-(length:--text-xs) text-text-muted">
				{props.id}
			</p>
		</Stack>
	)
}
