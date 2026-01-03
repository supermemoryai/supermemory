import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"
import type { DocumentTypeEnum } from "@repo/validation/schemas"
import type { z } from "zod"
import { getDocumentIcon } from "@/components/new/document-modal/document-icon"

type DocumentType = z.infer<typeof DocumentTypeEnum>

function getFileExtension(documentType: DocumentType): string | null {
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
	documentType: DocumentType
	url?: string | null
}) {
	const extension = getFileExtension(documentType)

	return (
		<div
			className={cn(
				dmSansClassName(),
				"text-[16px] font-semibold text-[#FAFAFA] line-clamp-1 leading-[125%] flex items-center gap-3",
			)}
		>
			<div className="pl-1 flex items-center gap-1 w-5 h-5">
				{getDocumentIcon(
					documentType as DocumentType,
					"w-5 h-5",
					undefined,
					url ?? undefined,
				)}
				{extension && (
					<p
						className={cn(dmSansClassName(), "text-[12px] font-semibold")}
						style={{ color: "#FF7673" }}
					>
						{extension}
					</p>
				)}
			</div>
			{title || "Untitled Document"}
		</div>
	)
}
