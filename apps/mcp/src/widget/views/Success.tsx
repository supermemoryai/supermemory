import { Badge, Stack } from "../design/ui"
import { CheckCircle } from "../lib/icons"

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
			className="mx-(--page-header-px) my-(--space-6) rounded-lg border border-border bg-bg-elevated/80 px-(--page-header-px) py-(--space-10) text-center shadow-lg backdrop-blur"
			gap="md"
		>
			<CheckCircle className="size-12 text-success" />
			<Stack align="center" gap="xs">
				<div className="text-(length:--text-sm) font-medium text-text-primary">
					{isUpload ? `Uploaded ${props.fileName}` : "Memory saved"}
				</div>
				<Badge variant="accent">{props.containerTag}</Badge>
			</Stack>
			<p className="break-all font-mono text-(length:--text-xs) text-text-muted">
				{props.id}
			</p>
		</Stack>
	)
}
