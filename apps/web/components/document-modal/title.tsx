import Image from "next/image"
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
	pluginIconSrc,
}: {
	title: string | null | undefined
	documentType: string
	url?: string | null
	pluginIconSrc?: string
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
				{pluginIconSrc ? (
					<Image
						src={pluginIconSrc}
						alt=""
						width={20}
						height={20}
						className="rounded-[4px]"
						aria-hidden
					/>
				) : (
					<DocumentIcon type={documentType} url={url} className="size-5" />
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
			<span className="truncate">{title || "Untitled Document"}</span>
		</div>
	)
}
