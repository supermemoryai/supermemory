"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@lib/utils"
import { getCachedFileBlob } from "@/lib/file-cache"

interface ImagePreviewProps {
	url: string
	title?: string | null
	documentId?: string | null
}

export function ImagePreview({ url, title, documentId }: ImagePreviewProps) {
	const [imageError, setImageError] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [retryKey, setRetryKey] = useState(0)
	const [activeSrc, setActiveSrc] = useState(url)
	const objectUrlRef = useRef<string | null>(null)

	useEffect(() => {
		return () => {
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current)
				objectUrlRef.current = null
			}
		}
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

	if (imageError || !activeSrc) {
		return (
			<div className="flex items-center justify-center h-full text-[#737373]">
				<p>Failed to load image</p>
			</div>
		)
	}

	return (
		<div className="relative size-full overflow-hidden flex items-center justify-center bg-[#0B1017]">
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
				className={cn(
					"relative max-w-full max-h-full size-auto object-contain z-10",
					isLoading && "opacity-0",
				)}
				onError={handleImageError}
				onLoad={() => setIsLoading(false)}
				loading="lazy"
			/>
		</div>
	)
}
