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
			className="mx-(--page-header-px) my-(--space-6) rounded-[20px] bg-[#1B1F24] px-(--page-header-px) py-(--space-10) text-center shadow-[0_2.842px_14.211px_0_rgba(0,0,0,0.25),inset_0.711px_0.711px_0.711px_0_rgba(255,255,255,0.10)]"
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
