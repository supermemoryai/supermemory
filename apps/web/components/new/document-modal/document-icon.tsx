import { MCPIcon } from "@/components/menu"
import { colors } from "@repo/ui/memory-graph/constants"
import {
	GoogleDocs,
	MicrosoftWord,
	NotionDoc,
	GoogleDrive,
	GoogleSheets,
	GoogleSlides,
	OneDrive,
	MicrosoftOneNote,
	MicrosoftPowerpoint,
	MicrosoftExcel,
} from "@ui/assets/icons"
import { Globe } from "lucide-react"
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

const PDFIcon = ({ className }: { className: string }) => {
	return (
		<svg
			width="8"
			height="10"
			viewBox="0 0 8 10"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>PDF Icon</title>
			<g filter="url(#filter0_i_719_6586)">
				<path
					d="M1 10C0.725 10 0.489583 9.90208 0.29375 9.70625C0.0979167 9.51042 0 9.275 0 9V1C0 0.725 0.0979167 0.489583 0.29375 0.29375C0.489583 0.0979167 0.725 0 1 0H5L8 3V9C8 9.275 7.90208 9.51042 7.70625 9.70625C7.51042 9.90208 7.275 10 7 10H1ZM4.5 3.5V1H1V9H7V3.5H4.5Z"
					fill="#FF7673"
				/>
			</g>
			<defs>
				<filter
					id="filter0_i_719_6586"
					x="0"
					y="0"
					width="8.25216"
					height="10.2522"
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="BackgroundImageFix"
						result="shape"
					/>
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset dx="0.252163" dy="0.252163" />
					<feGaussianBlur stdDeviation="0.504325" />
					<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0.0431373 0 0 0 0 0.0588235 0 0 0 0 0.0823529 0 0 0 0.4 0"
					/>
					<feBlend
						mode="normal"
						in2="shape"
						result="effect1_innerShadow_719_6586"
					/>
				</filter>
			</defs>
		</svg>
	)
}

const YouTubeIcon = ({ className }: { className: string }) => {
	return (
		<svg
			width="20"
			height="14"
			viewBox="0 0 20 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>YouTube Icon</title>
			<path
				d="M8 10L13.19 7L8 4V10ZM19.56 2.17C19.69 2.64 19.78 3.27 19.84 4.07C19.91 4.87 19.94 5.56 19.94 6.16L20 7C20 9.19 19.84 10.8 19.56 11.83C19.31 12.73 18.73 13.31 17.83 13.56C17.36 13.69 16.5 13.78 15.18 13.84C13.88 13.91 12.69 13.94 11.59 13.94L10 14C5.81 14 3.2 13.84 2.17 13.56C1.27 13.31 0.69 12.73 0.44 11.83C0.31 11.36 0.22 10.73 0.16 9.93C0.0900001 9.13 0.0599999 8.44 0.0599999 7.84L0 7C0 4.81 0.16 3.2 0.44 2.17C0.69 1.27 1.27 0.69 2.17 0.44C2.64 0.31 3.5 0.22 4.82 0.16C6.12 0.0899998 7.31 0.0599999 8.41 0.0599999L10 0C14.19 0 16.8 0.16 17.83 0.44C18.73 0.69 19.31 1.27 19.56 2.17Z"
				fill="#FF0034"
			/>
			<path d="M8 10L13.19 7L8 4V10Z" fill="white" />
		</svg>
	)
}

const TextDocumentIcon = ({ className }: { className: string }) => {
	return (
		<svg
			width="18"
			height="14"
			viewBox="0 0 18 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>Text Document Icon</title>
			<g filter="url(#filter0_i_724_34196)">
				<path
					d="M3.33333 8.33333H9.16667L10.8333 6.66667H3.33333V8.33333ZM3.33333 5H8.33333V3.33333H3.33333V5ZM1.66667 1.66667V10H7.5L5.83333 11.6667H0V0H16.6667V2.5H15V1.66667H1.66667ZM17.4167 6.08333C17.4861 6.15278 17.5208 6.22917 17.5208 6.3125C17.5208 6.39583 17.4861 6.47222 17.4167 6.54167L16.6667 7.29167L15.2083 5.83333L15.9583 5.08333C16.0278 5.01389 16.1042 4.97917 16.1875 4.97917C16.2708 4.97917 16.3472 5.01389 16.4167 5.08333L17.4167 6.08333ZM9.16667 13.3333V11.875L14.7083 6.33333L16.1667 7.79167L10.625 13.3333H9.16667Z"
					fill="#FAFAFA"
				/>
			</g>
			<defs>
				<filter
					id="filter0_i_724_34196"
					x="0"
					y="0"
					width="18.0253"
					height="13.8376"
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="BackgroundImageFix"
						result="shape"
					/>
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset dx="0.504325" dy="0.504325" />
					<feGaussianBlur stdDeviation="1.00865" />
					<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0.0431373 0 0 0 0 0.0588235 0 0 0 0 0.0823529 0 0 0 0.4 0"
					/>
					<feBlend
						mode="normal"
						in2="shape"
						result="effect1_innerShadow_724_34196"
					/>
				</filter>
			</defs>
		</svg>
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

	if (url?.includes("youtube.com") || url?.includes("youtu.be")) {
		return <YouTubeIcon className={className} />
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
		case "tweet":
			return <span className={className}>𝕏</span>
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
			return <PDFIcon className={className} />
		case "youtube":
		case "video":
			return <YouTubeIcon className={className} />
		default:
			return <TextDocumentIcon className={className} />
	}
}
