"use client"

import type React from "react"
import { useState } from "react"
import {
	GoogleDocs,
	GoogleSheets,
	GoogleSlides,
	GoogleDrive,
	MicrosoftWord,
	MicrosoftExcel,
	MicrosoftPowerpoint,
	MicrosoftOneNote,
	OneDrive,
	NotionDoc,
	PDF,
} from "@ui/assets/icons"
import { Globe, FileText, Image } from "lucide-react"
import { cn } from "@lib/utils"

function MCPIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="currentColor"
			fillRule="evenodd"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>ModelContextProtocol</title>
			<path d="M15.69 2.34a2.59 2.59 0 00-3.61 0l-9.63 9.44a.863.86 0 01-1.2 0 .823.82 0 010-1.18l9.63-9.44a4.31 4.31 0 16.02 0 4.12 4.12 0 11.2 3.54 4.3 4.3 0 13.61 1.18l.05.05a4.12 4.12 0 010 5.9l-8.71 8.54a.274.27 0 000 .393l1.79 1.75a.823.82 0 010 1.18.86.863 0 01-1.2 0l-1.79-1.75a1.92 1.92 0 010-2.75l8.71-8.54a2.47 2.47 0 000-3.54l-.05-.049a2.59 2.59 0 00-3.61-.003l-7.17 7.03-.2-.98.1a.863.86 0 01-1.2 0 .823.82 0 010-1.18l7.27-7.13a2.47 2.47 0 00-.003-3.54z" />
			<path d="M14.48 4.7a.823.82 0 000-1.18.86.863 0 00-1.2 0l-7.12 6.98a4.12 4.12 0 000 5.9 4.31 4.31 0 6.02 0l7.12-6.98a.823.82 0 000-1.18.86.863 0 00-1.2 0l-7.12 6.98a2.59 2.59 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.98z" />
		</svg>
	)
}

const BRAND_COLORS: Record<string, string> = {
	google_doc: "#4285F4",
	google_sheet: "#0F9D58",
	google_slide: "#F4B400",
	google_drive: "#4285F4",
	notion: "#FFFFFF",
	notion_doc: "#FFFFFF",
	microsoft_word: "#2B579A",
	word: "#2B579A",
	microsoft_excel: "#217346",
	excel: "#217346",
	microsoft_powerpoint: "#D24726",
	powerpoint: "#D24726",
	microsoft_onenote: "#7719AA",
	onenote: "#7719AA",
	onedrive: "#0078D4",
	pdf: "#FF7673",
	text: "#FAFAFA",
	note: "#FAFAFA",
	image: "#FAFAFA",
	video: "#FAFAFA",
	webpage: "#737373",
	url: "#737373",
}

function getFaviconUrl(url: string): string {
	try {
		const domain = new URL(url).hostname
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
	} catch {
		return ""
	}
}

function FaviconIcon({ url, className }: { url: string; className?: string }) {
	const [hasError, setHasError] = useState(false)
	const faviconUrl = getFaviconUrl(url)

	if (hasError || !faviconUrl) {
		return <Globe className={cn("text-[#737373]", className)} />
	}

	return (
		<img
			src={faviconUrl}
			alt="Website favicon"
			className={className}
			style={{
				width: "1em",
				height: "1em",
				objectFit: "contain",
			}}
			onError={() => setHasError(true)}
		/>
	)
}

function YouTubeIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 20 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>YouTube</title>
			<path
				d="M8 10L13.19 7L8 4V10ZM19.56 2.17C19.69 2.64 19.78 3.27 19.84 4.07C19.91 4.87 19.94 5.56 19.94 6.16L20 7C20 9.19 19.84 10.8 19.56 11.83C19.31 12.73 18.73 13.31 17.83 13.56C17.36 13.69 16.5 13.78 15.18 13.84C13.88 13.91 12.69 13.94 11.59 13.94L10 14C5.81 14 3.2 13.84 2.17 13.56C1.27 13.31 0.69 12.73 0.44 11.83C0.31 11.36 0.22 10.73 0.16 9.93C0.09 9.13 0.06 8.44 0.06 7.84L0 7C0 4.81 0.16 3.2 0.44 2.17C0.69 1.27 1.27 0.69 2.17 0.44C2.64 0.31 3.5 0.22 4.82 0.16C6.12 0.09 7.31 0.06 8.41 0.06L10 0C14.19 0 16.8 0.16 17.83 0.44C18.73 0.69 19.31 1.27 19.56 2.17Z"
				fill="#FF0000"
			/>
			<path d="M8 10L13.19 7L8 4V10Z" fill="white" />
		</svg>
	)
}

function TextDocumentIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 18 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>Text Document</title>
			<path
				d="M3.33 8.33H9.17L10.83 6.67H3.33V8.33ZM3.33 5H8.33V3.33H3.33V5ZM1.67 1.67V10H7.5L5.83 11.67H0V0H16.67V2.5H15V1.67H1.67ZM17.42 6.08C17.49 6.15 17.52 6.23 17.52 6.31C17.52 6.4 17.49 6.47 17.42 6.54L16.67 7.29L15.21 5.83L15.96 5.08C16.03 5.01 16.1 4.98 16.19 4.98C16.27 4.98 16.35 5.01 16.42 5.08L17.42 6.08ZM9.17 13.33V11.88L14.71 6.33L16.17 7.79L10.63 13.33H9.17Z"
				fill="currentColor"
			/>
		</svg>
	)
}

function XIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("text-white", className)}
		>
			<title>X (Twitter)</title>
			<path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24H16.17l-4.71-6.23-5.4 6.23H2.75l7.73-8.84L1.25 2.25H8.08l4.25 5.62 5.91-5.62zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
		</svg>
	)
}

export interface DocumentIconProps {
	type: string | null | undefined
	source?: string | null
	url?: string | null
	className?: string
}

export function DocumentIcon({
	type,
	source,
	url,
	className,
}: DocumentIconProps) {
	const iconClassName = cn("size-4", className)

	if (source === "mcp") {
		return <MCPIcon className={iconClassName} />
	}

	if (url?.includes("youtube.com") || url?.includes("youtu.be")) {
		return <YouTubeIcon className={iconClassName} />
	}

	if (
		type === "webpage" ||
		type === "url" ||
		(url && (type === "unknown" || !type))
	) {
		if (url) {
			return <FaviconIcon url={url} className={iconClassName} />
		}
		return <Globe className={iconClassName} style={{ color: "#737373" }} />
	}

	const brandColor = BRAND_COLORS[type ?? ""] ?? "#FAFAFA"

	switch (type) {
		case "tweet":
			return <XIcon className={iconClassName} />

		case "google_doc":
			return (
				<span style={{ color: brandColor }}>
					<GoogleDocs className={iconClassName} />
				</span>
			)

		case "google_sheet":
			return (
				<span style={{ color: brandColor }}>
					<GoogleSheets className={iconClassName} />
				</span>
			)

		case "google_slide":
			return (
				<span style={{ color: brandColor }}>
					<GoogleSlides className={iconClassName} />
				</span>
			)

		case "google_drive":
			return (
				<span style={{ color: brandColor }}>
					<GoogleDrive className={iconClassName} />
				</span>
			)

		case "notion":
		case "notion_doc":
			return (
				<span style={{ color: brandColor }}>
					<NotionDoc className={iconClassName} />
				</span>
			)

		case "word":
		case "microsoft_word":
			return (
				<span style={{ color: brandColor }}>
					<MicrosoftWord className={iconClassName} />
				</span>
			)

		case "excel":
		case "microsoft_excel":
			return (
				<span style={{ color: brandColor }}>
					<MicrosoftExcel className={iconClassName} />
				</span>
			)

		case "powerpoint":
		case "microsoft_powerpoint":
			return (
				<span style={{ color: brandColor }}>
					<MicrosoftPowerpoint className={iconClassName} />
				</span>
			)

		case "onenote":
		case "microsoft_onenote":
			return (
				<span style={{ color: brandColor }}>
					<MicrosoftOneNote className={iconClassName} />
				</span>
			)

		case "onedrive":
			return (
				<span style={{ color: brandColor }}>
					<OneDrive className={iconClassName} />
				</span>
			)

		case "pdf":
			return <PDF className={iconClassName} />

		case "youtube":
		case "video":
			return <YouTubeIcon className={iconClassName} />

		case "image":
			return <Image className={iconClassName} style={{ color: brandColor }} />

		case "text":
		case "note":
			return <TextDocumentIcon className={iconClassName} />

		default:
			return <FileText className={iconClassName} style={{ color: "#FAFAFA" }} />
	}
}

/**
 * @deprecated Use <DocumentIcon /> component instead
 * Backward-compatible function for legacy code
 */
export function getDocumentIcon(
	type: string,
	className: string,
	source?: string,
	url?: string,
): React.ReactNode {
	return (
		<DocumentIcon type={type} source={source} url={url} className={className} />
	)
}

export function getDocumentTypeLabel(type: string | null | undefined): string {
	switch (type) {
		case "google_doc":
			return "Google Docs"
		case "google_sheet":
			return "Google Sheets"
		case "google_slide":
			return "Google Slides"
		case "google_drive":
			return "Google Drive"
		case "notion":
		case "notion_doc":
			return "Notion"
		case "word":
		case "microsoft_word":
			return "Word"
		case "excel":
		case "microsoft_excel":
			return "Excel"
		case "powerpoint":
		case "microsoft_powerpoint":
			return "PowerPoint"
		case "onenote":
		case "microsoft_onenote":
			return "OneNote"
		case "onedrive":
			return "OneDrive"
		case "pdf":
			return "PDF"
		case "youtube":
		case "video":
			return "Video"
		case "image":
			return "Image"
		case "text":
		case "note":
			return "Note"
		case "tweet":
			return "Tweet"
		case "webpage":
		case "url":
			return "Webpage"
		default:
			return "Document"
	}
}
