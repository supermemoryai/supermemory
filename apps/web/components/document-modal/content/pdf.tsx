"use client"

import { Document, Page, pdfjs } from "react-pdf"
import { useEffect, useMemo, useRef, useState } from "react"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { getCachedFileBlob } from "@/lib/file-cache"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString()

type FileSource = string | { url: string; withCredentials: boolean } | null

interface PdfViewerProps {
	url: string | null | undefined
	documentId?: string | null
}

export function PdfViewer({ url, documentId }: PdfViewerProps) {
	const [cachedUrl, setCachedUrl] = useState<string | null>(null)
	const [cacheChecked, setCacheChecked] = useState(false)
	const objectUrlRef = useRef<string | null>(null)

	useEffect(() => {
		let revoked = false
		if (!documentId) {
			setCacheChecked(true)
			return
		}

		getCachedFileBlob(documentId).then((blob) => {
			if (revoked) return
			if (blob) {
				const objUrl = URL.createObjectURL(blob)
				objectUrlRef.current = objUrl
				setCachedUrl(objUrl)
			}
			setCacheChecked(true)
		})

		return () => {
			revoked = true
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current)
				objectUrlRef.current = null
			}
		}
	}, [documentId])

	const remoteFileSource: FileSource = useMemo(() => {
		if (!url) return null
		try {
			if (new URL(url).hostname === "www.googleapis.com" && documentId) {
				const base =
					process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
				return {
					url: `${base}/v3/drive-proxy/${documentId}`,
					withCredentials: true,
				}
			}
		} catch {}
		return url
	}, [url, documentId])

	const backendProxySource: FileSource = useMemo(() => {
		if (!documentId) return null
		const base =
			process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
		return { url: `${base}/v3/file-proxy/${documentId}`, withCredentials: true }
	}, [documentId])

	const [numPages, setNumPages] = useState<number | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [failedSources, setFailedSources] = useState(0)

	const fileSource = useMemo((): FileSource => {
		if (cachedUrl) return cachedUrl
		if (failedSources === 0) return remoteFileSource
		if (failedSources === 1 && backendProxySource) return backendProxySource
		return null
	}, [cachedUrl, failedSources, remoteFileSource, backendProxySource])

	if (!cacheChecked) {
		return (
			<div className="flex items-center justify-center h-full text-gray-400">
				Loading PDF…
			</div>
		)
	}

	if (!url && !cachedUrl) {
		return (
			<div className="flex items-center justify-center h-full text-gray-400">
				No PDF URL provided
			</div>
		)
	}

	function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
		setNumPages(numPages)
		setLoading(false)
		setError(null)
	}

	function onDocumentLoadError(err: Error) {
		if (cachedUrl) {
			setError(err.message || "Failed to load PDF")
			setLoading(false)
			return
		}

		const nextFailed = failedSources + 1
		const hasMoreSources =
			(nextFailed === 1 && backendProxySource !== null) || nextFailed < 1

		if (hasMoreSources) {
			setFailedSources(nextFailed)
			setLoading(true)
			setError(null)
		} else {
			setError(err.message || "Failed to load PDF")
			setLoading(false)
		}
	}

	return (
		<div className="flex flex-col size-full overflow-hidden scrollbar-thin">
			{loading && (
				<div className="flex items-center justify-center h-full text-gray-400">
					Loading PDF…
				</div>
			)}
			{error && (
				<div className="flex items-center justify-center h-full text-red-400">
					Error: {error}
				</div>
			)}
			{fileSource && (
				<div className="flex-1 overflow-auto w-full">
					<Document
						key={`${failedSources}-${cachedUrl ? "cache" : "remote"}`}
						file={fileSource}
						onLoadSuccess={onDocumentLoadSuccess}
						onLoadError={onDocumentLoadError}
						loading={null}
						className="w-full"
					>
						{numPages && (
							<div className="flex flex-col items-center gap-4 py-4 w-full">
								{Array.from(new Array(numPages), (_, index) => (
									<Page
										key={`page_${index + 1}`}
										pageNumber={index + 1}
										renderTextLayer
										renderAnnotationLayer
										className="shadow-lg"
										width={630}
									/>
								))}
							</div>
						)}
					</Document>
				</div>
			)}
		</div>
	)
}
