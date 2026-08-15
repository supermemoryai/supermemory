"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Minus, Plus, X } from "lucide-react"
import { cn } from "@lib/utils"
import { getCachedFileBlob } from "@/lib/file-cache"
import {
	IDENTITY_TRANSFORM,
	type ImageTransform,
	isZoomed,
	MAX_SCALE,
	panBy,
	toCssTransform,
	zoomAtPoint,
} from "@/lib/image-zoom"

interface ImagePreviewProps {
	url: string
	title?: string | null
	documentId?: string | null
}

// Pointer position relative to the container's center.
function centerRelativePoint(
	el: HTMLElement,
	clientX: number,
	clientY: number,
): { x: number; y: number } {
	const rect = el.getBoundingClientRect()
	return {
		x: clientX - rect.left - rect.width / 2,
		y: clientY - rect.top - rect.height / 2,
	}
}

export function ImagePreview({ url, title, documentId }: ImagePreviewProps) {
	const [imageError, setImageError] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [retryKey, setRetryKey] = useState(0)
	const [activeSrc, setActiveSrc] = useState(url)
	const objectUrlRef = useRef<string | null>(null)

	const containerRef = useRef<HTMLDivElement>(null)
	const [transform, setTransform] = useState<ImageTransform>(IDENTITY_TRANSFORM)
	const dragRef = useRef<{
		pointerId: number
		startX: number
		startY: number
		startTransform: ImageTransform
	} | null>(null)
	const zoomed = isZoomed(transform)

	useEffect(() => {
		return () => {
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current)
				objectUrlRef.current = null
			}
		}
	}, [])

	// Native, non-passive wheel listener so we can preventDefault the page scroll
	// while zooming toward the cursor.
	useEffect(() => {
		const el = containerRef.current
		if (!el) return
		const onWheel = (e: WheelEvent) => {
			e.preventDefault()
			const point = centerRelativePoint(el, e.clientX, e.clientY)
			const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
			setTransform((t) => zoomAtPoint(t, factor, point.x, point.y))
		}
		el.addEventListener("wheel", onWheel, { passive: false })
		return () => el.removeEventListener("wheel", onWheel)
	}, [])

	const handleImageError = useCallback(() => {
		if (retryKey === 0) {
			setTimeout(() => setRetryKey(1), 500)
			return
		}

		if (retryKey === 1 && documentId) {
			getCachedFileBlob(documentId).then((blob) => {
				if (blob) {
					if (objectUrlRef.current) {
						URL.revokeObjectURL(objectUrlRef.current)
					}
					const objUrl = URL.createObjectURL(blob)
					objectUrlRef.current = objUrl
					setActiveSrc(objUrl)
					setRetryKey(2)
				} else {
					setImageError(true)
					setIsLoading(false)
				}
			})
			return
		}

		setImageError(true)
		setIsLoading(false)
	}, [retryKey, documentId])

	const zoomByButton = useCallback((factor: number) => {
		setTransform((t) => zoomAtPoint(t, factor, 0, 0))
	}, [])

	const resetZoom = useCallback(() => setTransform(IDENTITY_TRANSFORM), [])

	const handleDoubleClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const el = containerRef.current
			if (!el) return
			if (zoomed) {
				resetZoom()
				return
			}
			const point = centerRelativePoint(el, e.clientX, e.clientY)
			setTransform((t) => zoomAtPoint(t, 2.5, point.x, point.y))
		},
		[zoomed, resetZoom],
	)

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!zoomed) return
			e.currentTarget.setPointerCapture(e.pointerId)
			dragRef.current = {
				pointerId: e.pointerId,
				startX: e.clientX,
				startY: e.clientY,
				startTransform: transform,
			}
		},
		[zoomed, transform],
	)

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const drag = dragRef.current
			const el = containerRef.current
			if (!drag || drag.pointerId !== e.pointerId || !el) return
			const dx = e.clientX - drag.startX
			const dy = e.clientY - drag.startY
			const rect = el.getBoundingClientRect()
			setTransform(panBy(drag.startTransform, dx, dy, rect.width, rect.height))
		},
		[],
	)

	const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (dragRef.current?.pointerId === e.pointerId) {
			dragRef.current = null
			if (e.currentTarget.hasPointerCapture(e.pointerId)) {
				e.currentTarget.releasePointerCapture(e.pointerId)
			}
		}
	}, [])

	if (imageError || !activeSrc) {
		return (
			<div className="flex items-center justify-center h-full text-[#737373]">
				<p>Failed to load image</p>
			</div>
		)
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: pointer/dblclick gestures are optional enhancements; the zoom buttons provide the accessible controls
		<div
			ref={containerRef}
			onDoubleClick={handleDoubleClick}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
			className={cn(
				"group relative size-full overflow-hidden flex items-center justify-center bg-[#0B1017]",
				zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
			)}
		>
			{isLoading && (
				<div className="absolute inset-0 bg-cover bg-center animate-pulse">
					<div className="size-full bg-[#1B1F24]" />
				</div>
			)}
			<div
				className="absolute inset-0 bg-cover bg-center"
				style={{
					backgroundImage: `url(${activeSrc})`,
					filter: "blur(100px)",
					transform: "scale(1.1)",
					opacity: isLoading ? 0.5 : 1,
				}}
			/>
			<div className="absolute inset-0 bg-black/30" />
			<img
				key={retryKey}
				src={activeSrc}
				alt={title || "Image preview"}
				draggable={false}
				className={cn(
					"relative max-w-full max-h-full size-auto object-contain z-10 select-none",
					isLoading && "opacity-0",
				)}
				style={{
					transform: toCssTransform(transform),
					transition: dragRef.current ? "none" : "transform 0.12s ease-out",
					willChange: "transform",
				}}
				onError={handleImageError}
				onLoad={() => setIsLoading(false)}
				loading="lazy"
			/>

			{!isLoading && (
				<div
					className={cn(
						"absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-black/55 p-1 backdrop-blur-md transition-opacity",
						zoomed ? "opacity-100" : "opacity-0 group-hover:opacity-100",
					)}
				>
					<button
						type="button"
						aria-label="Zoom out"
						disabled={!zoomed}
						onClick={() => zoomByButton(1 / 1.4)}
						className="flex size-7 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 disabled:opacity-35"
					>
						<Minus className="size-4" />
					</button>
					<span className="min-w-[3ch] text-center text-[11px] font-medium tabular-nums text-white/80">
						{Math.round(transform.scale * 100)}%
					</span>
					<button
						type="button"
						aria-label="Zoom in"
						disabled={transform.scale >= MAX_SCALE}
						onClick={() => zoomByButton(1.4)}
						className="flex size-7 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 disabled:opacity-35"
					>
						<Plus className="size-4" />
					</button>
					{zoomed && (
						<button
							type="button"
							aria-label="Reset zoom"
							onClick={resetZoom}
							className="flex size-7 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15"
						>
							<X className="size-4" />
						</button>
					)}
				</div>
			)}
		</div>
	)
}
