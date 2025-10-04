import { MCPIcon } from "@/components/menu"
import { colors } from "@repo/ui/memory-graph/constants"
import {
	GoogleDocs,
	MicrosoftWord,
	NotionDoc,
	GoogleDrive,
	GoogleSheets,
	GoogleSlides,
	PDF,
	OneDrive,
	MicrosoftOneNote,
	MicrosoftPowerpoint,
	MicrosoftExcel,
} from "@ui/assets/icons"
import { FileText, Globe } from "lucide-react"
import { useState } from "react"

const getFaviconUrl = (url: string): string => {
	try {
		const domain = new URL(url).hostname
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
	} catch {
		return ""
	}
}

const FaviconIcon = ({
	url,
	className,
	iconProps,
}: {
	url: string
	className: string
	iconProps: { className: string; style: { color: string } }
}) => {
	const [hasError, setHasError] = useState(false)
	const faviconUrl = getFaviconUrl(url)

	if (hasError || !faviconUrl) {
		return <Globe {...iconProps} />
	}

	return (
		<img
			src={faviconUrl}
			alt="Website favicon"
			className={className}
			style={{
				width: "2em",
				height: "2em",
				objectFit: "contain",
			}}
			onError={() => setHasError(true)}
		/>
	)
}

export const getDocumentIcon = (
	type: string,
	className: string,
	source?: string,
	url?: string,
) => {
	const iconProps = {
		className,
		style: { color: colors.text.muted },
	}

	if (source === "mcp") {
		return <MCPIcon {...iconProps} />
	}

	if (
		type === "webpage" ||
		type === "url" ||
		(url && (type === "unknown" || !type))
	) {
		if (url) {
			return (
				<FaviconIcon url={url} className={className} iconProps={iconProps} />
			)
		}

		return <Globe {...iconProps} />
	}

	switch (type) {
		case "google_doc":
			return <GoogleDocs {...iconProps} />
		case "google_sheet":
			return <GoogleSheets {...iconProps} />
		case "google_slide":
			return <GoogleSlides {...iconProps} />
		case "google_drive":
			return <GoogleDrive {...iconProps} />
		case "notion":
		case "notion_doc":
			return <NotionDoc {...iconProps} />
		case "word":
		case "microsoft_word":
			return <MicrosoftWord {...iconProps} />
		case "excel":
		case "microsoft_excel":
			return <MicrosoftExcel {...iconProps} />
		case "powerpoint":
		case "microsoft_powerpoint":
			return <MicrosoftPowerpoint {...iconProps} />
		case "onenote":
		case "microsoft_onenote":
			return <MicrosoftOneNote {...iconProps} />
		case "onedrive":
			return <OneDrive {...iconProps} />
		case "pdf":
			return <PDF {...iconProps} />
		default:
			return <FileText {...iconProps} />
	}
}
