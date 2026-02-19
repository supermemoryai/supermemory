import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { DocumentIcon } from "@/components/document-icon"

function getFileExtension(documentType: string): string | null {
	switch (documentType) {
		case "pdf":
			return ".pdf"
		default:
			return null
	}
}

export function Title({
	title,
	documentType,
	url,
}: {
	title: string | null | undefined
	documentType: string
	url?: string | null
}) {
	const extension = getFileExtension(documentType)

	return (
		<div
			className={cn(
				dmSansClassName(),
				"text-[16px] font-semibold text-[#FAFAFA] leading-[125%] flex items-center gap-3 min-w-0",
			)}
		>
			<div className="pl-1 flex items-center gap-1 shrink-0">
				<DocumentIcon type={documentType} url={url} className="w-5 h-5" />
				{extension && (
					<p
						className={cn(dmSansClassName(), "text-[12px] font-semibold")}
						style={{ color: "#FF7673" }}
					>
						{extension}
					</p>
				)}
			</div>
			<span className="truncate">{title || "Untitled Document"}</span>
		</div>
	)
}
