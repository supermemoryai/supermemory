"use client"

import { Document, Page, pdfjs } from "react-pdf"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { getCachedFileBlob } from "@/lib/file-cache"
import {
	clampPage,
	parsePageInput,
	pickMostVisiblePage,
} from "@/lib/pdf-page-nav"

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

	const scrollRef = useRef<HTMLDivElement>(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [pageInput, setPageInput] = useState("")
	const visibilityRef = useRef<Map<number, number>>(new Map())

	const scrollToPage = useCallback(
		(page: number) => {
			if (!numPages) return
			const target = clampPage(page, numPages)
			scrollRef.current
				?.querySelector(`[data-page-number="${target}"]`)
				?.scrollIntoView({ block: "start", behavior: "smooth" })
			setCurrentPage(target)
		},
		[numPages],
	)

	// Track the most-visible page as the user scrolls.
	useEffect(() => {
		const root = scrollRef.current
		if (!root || !numPages) return
		const visibility = visibilityRef.current
		visibility.clear()

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const page = Number(
						(entry.target as HTMLElement).dataset.pageNumber ?? "0",
					)
					if (page > 0) visibility.set(page, entry.intersectionRatio)
				}
				setCurrentPage((prev) => pickMostVisiblePage(visibility, prev))
			},
			{ root, threshold: [0, 0.25, 0.5, 0.75, 1] },
		)

		for (const el of root.querySelectorAll("[data-page-number]")) {
			observer.observe(el)
		}
		return () => observer.disconnect()
	}, [numPages])

	const commitPageInput = useCallback(() => {
		const parsed = parsePageInput(pageInput, numPages ?? 1)
		if (parsed !== null) scrollToPage(parsed)
		setPageInput("")
	}, [pageInput, numPages, scrollToPage])

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
				<div className="relative flex-1 min-h-0 w-full">
					{/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard page nav is an optional enhancement; the on-screen buttons/input are the accessible controls */}
					<div
						ref={scrollRef}
						tabIndex={-1}
						onKeyDown={(e) => {
							if (!numPages) return
							if (e.key === "ArrowDown" || e.key === "PageDown") {
								e.preventDefault()
								scrollToPage(currentPage + 1)
							} else if (e.key === "ArrowUp" || e.key === "PageUp") {
								e.preventDefault()
								scrollToPage(currentPage - 1)
							}
						}}
						className="size-full overflow-auto outline-none"
					>
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
										<div key={`page_${index + 1}`} data-page-number={index + 1}>
											<Page
												pageNumber={index + 1}
												renderTextLayer
												renderAnnotationLayer
												className="shadow-lg"
												width={630}
											/>
										</div>
									))}
								</div>
							)}
						</Document>
					</div>

					{numPages && numPages > 1 && (
						<div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1 pl-2 text-[13px] text-white/90 backdrop-blur-md">
							<button
								type="button"
								aria-label="Previous page"
								disabled={currentPage <= 1}
								onClick={() => scrollToPage(currentPage - 1)}
								className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-35"
							>
								<ChevronUp className="size-4" />
							</button>
							<form
								onSubmit={(e) => {
									e.preventDefault()
									commitPageInput()
								}}
								className="flex items-center gap-1 tabular-nums"
							>
								<input
									value={pageInput}
									onChange={(e) => setPageInput(e.target.value)}
									onBlur={commitPageInput}
									placeholder={String(currentPage)}
									aria-label={`Page ${currentPage} of ${numPages}, jump to page`}
									inputMode="numeric"
									className="w-8 rounded-md bg-white/10 px-1 py-0.5 text-center text-white outline-none placeholder:text-white/60 focus:bg-white/15"
								/>
								<span className="text-white/50">/ {numPages}</span>
							</form>
							<button
								type="button"
								aria-label="Next page"
								disabled={currentPage >= numPages}
								onClick={() => scrollToPage(currentPage + 1)}
								className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-35"
							>
								<ChevronDown className="size-4" />
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
