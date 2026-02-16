"use client"

import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"
import dynamic from "next/dynamic"
import { isTwitterUrl } from "@/lib/url-helpers"
import { ImagePreview } from "./image-preview"
import { TweetContent } from "./tweet"
import { NotionDoc } from "./notion-doc"
import { YoutubeVideo } from "./yt-video"
import { WebPageContent } from "./web-page"
import { TextEditorContent } from "./text-editor-content"
import { GoogleDocViewer } from "./google-doc"
import type { TextEditorProps } from "./text-editor-content"

export type { TextEditorProps }

const PdfViewer = dynamic(
	() => import("./pdf").then((mod) => ({ default: mod.PdfViewer })),
	{
		ssr: false,
		loading: () => (
			<div className="flex items-center justify-center h-full text-gray-400">
				Loading PDF viewer...
			</div>
		),
	},
) as typeof import("./pdf").PdfViewer

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

interface DocumentContentProps {
	document: DocumentWithMemories | null
	textEditorProps: TextEditorProps
}

type ContentType =
	| "image"
	| "tweet"
	| "text"
	| "pdf"
	| "notion"
	| "youtube"
	| "webpage"
	| "google_doc"
	| "google_sheet"
	| "google_slide"
	| null

function getContentType(document: DocumentWithMemories | null): ContentType {
	if (!document) return null

	const isImage =
		document.type === "image" ||
		document.metadata?.mimeType?.toString().startsWith("image/")

	if (isImage && document.url) return "image"
	if (document.type === "tweet" || (document.url && isTwitterUrl(document.url)))
		return "tweet"
	if (document.type === "text") return "text"
	if (document.type === "pdf") return "pdf"
	if (document.type === "notion_doc") return "notion"
	if (document.type === "google_doc") return "google_doc"
	if (document.type === "google_sheet") return "google_sheet"
	if (document.type === "google_slide") return "google_slide"
	if (document.url?.includes("youtube.com")) return "youtube"
	if (document.type === "webpage") return "webpage"

	return null
}

export function DocumentContent({
	document,
	textEditorProps,
}: DocumentContentProps) {
	const contentType = getContentType(document)

	if (!document || !contentType) return null

	switch (contentType) {
		case "image":
			return <ImagePreview url={document.url ?? ""} title={document.title} />

		case "tweet":
			return (
				<TweetContent
					url={document.url}
					tweetMetadata={document.metadata?.sm_internal_twitter_metadata}
				/>
			)

		case "text":
			return <TextEditorContent {...textEditorProps} />

		case "pdf":
			return <PdfViewer url={document.url} />

		case "notion":
			return <NotionDoc content={document.content ?? ""} />

		case "youtube":
			return <YoutubeVideo url={document.url ?? ""} />

		case "webpage":
			return <WebPageContent content={document.content ?? ""} />

		case "google_doc":
			return (
				<GoogleDocViewer
					url={document.url}
					customId={document.customId}
					type="google_doc"
				/>
			)

		case "google_sheet":
			return (
				<GoogleDocViewer
					url={document.url}
					customId={document.customId}
					type="google_sheet"
				/>
			)

		case "google_slide":
			return (
				<GoogleDocViewer
					url={document.url}
					customId={document.customId}
					type="google_slide"
				/>
			)

		default:
			return null
	}
}
