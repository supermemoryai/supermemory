"use client"

import type React from "react"
import { useState } from "react"
import { MCPIcon } from "@/components/menu"
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

function FaviconIcon({
	url,
	className,
}: {
	url: string
	className?: string
}) {
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
				d="M8 10L13.19 7L8 4V10ZM19.56 2.17C19.69 2.64 19.78 3.27 19.84 4.07C19.91 4.87 19.94 5.56 19.94 6.16L20 7C20 9.19 19.84 10.8 19.56 11.83C19.31 12.73 18.73 13.31 17.83 13.56C17.36 13.69 16.5 13.78 15.18 13.84C13.88 13.91 12.69 13.94 11.59 13.94L10 14C5.81 14 3.2 13.84 2.17 13.56C1.27 13.31 0.69 12.73 0.44 11.83C0.31 11.36 0.22 10.73 0.16 9.93C0.0900001 9.13 0.0599999 8.44 0.0599999 7.84L0 7C0 4.81 0.16 3.2 0.44 2.17C0.69 1.27 1.27 0.69 2.17 0.44C2.64 0.31 3.5 0.22 4.82 0.16C6.12 0.0899998 7.31 0.0599999 8.41 0.0599999L10 0C14.19 0 16.8 0.16 17.83 0.44C18.73 0.69 19.31 1.27 19.56 2.17Z"
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
				d="M3.33333 8.33333H9.16667L10.8333 6.66667H3.33333V8.33333ZM3.33333 5H8.33333V3.33333H3.33333V5ZM1.66667 1.66667V10H7.5L5.83333 11.6667H0V0H16.6667V2.5H15V1.66667H1.66667ZM17.4167 6.08333C17.4861 6.15278 17.5208 6.22917 17.5208 6.3125C17.5208 6.39583 17.4861 6.47222 17.4167 6.54167L16.6667 7.29167L15.2083 5.83333L15.9583 5.08333C16.0278 5.01389 16.1042 4.97917 16.1875 4.97917C16.2708 4.97917 16.3472 5.01389 16.4167 5.08333L17.4167 6.08333ZM9.16667 13.3333V11.875L14.7083 6.33333L16.1667 7.79167L10.625 13.3333H9.16667Z"
				fill="currentColor"
			/>
		</svg>
	)
}

function XIcon({ className }: { className?: string }) {
	return (
		<span className={cn("font-bold", className)} style={{ color: "#FFFFFF" }}>
			𝕏
		</span>
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
	const iconClassName = cn("w-4 h-4", className)

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
