"use client"

import { Document, Page, pdfjs } from "react-pdf"
import { useCallback, useState } from "react"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Configure PDF.js worker to use local package
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString()

interface PdfViewerProps {
	url: string | null | undefined
}

export function PdfViewer({ url }: PdfViewerProps) {
	const [numPages, setNumPages] = useState<number | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [retryKey, setRetryKey] = useState(0)

	if (!url) {
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

	// On first failure, wait briefly then force a re-mount of the Document
	// component to retry (covers transient R2 timing issues).
	// On second failure, give up and show the error state.
	const onDocumentLoadError = useCallback(
		(err: Error) => {
			if (retryKey === 0) {
				setTimeout(() => {
					setRetryKey(1)
					setLoading(true)
					setError(null)
				}, 500)
				return
			}
			setError(err.message || "Failed to load PDF")
			setLoading(false)
		},
		[retryKey],
	)

	return (
		<div className="flex flex-col h-full w-full overflow-hidden scrollbar-thin">
			{loading && (
				<div className="flex items-center justify-center h-full text-gray-400">
					Loading PDF...
				</div>
			)}
			{error && (
				<div className="flex items-center justify-center h-full text-red-400">
					Error: {error}
				</div>
			)}
			<div className="flex-1 overflow-auto w-full">
				<Document
					key={retryKey}
					file={
						url ||
						"https://corsproxy.io/?" +
							encodeURIComponent("http://www.pdf995.com/samples/pdf.pdf")
					}
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
		</div>
	)
}
