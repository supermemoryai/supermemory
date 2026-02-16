"use client"

import { useState } from "react"
import { cn } from "@lib/utils"

interface ImagePreviewProps {
	url: string
	title?: string | null
}

export function ImagePreview({ url, title }: ImagePreviewProps) {
	const [imageError, setImageError] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	if (imageError || !url) {
		return (
			<div className="flex items-center justify-center h-full text-[#737373]">
				<p>Failed to load image</p>
			</div>
		)
	}

	return (
		<div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-[#0B1017]">
			{isLoading && (
				<div className="absolute inset-0 bg-cover bg-center animate-pulse">
					<div className="w-full h-full bg-[#1B1F24]" />
				</div>
			)}
			<div
				className="absolute inset-0 bg-cover bg-center"
				style={{
					backgroundImage: `url(${url})`,
					filter: "blur(100px)",
					transform: "scale(1.1)",
					opacity: isLoading ? 0.5 : 1,
				}}
			/>
			<div className="absolute inset-0 bg-black/30" />
			<img
				src={url}
				alt={title || "Image preview"}
				className={cn(
					"relative max-w-full max-h-full w-auto h-auto object-contain z-10",
					isLoading && "opacity-0",
				)}
				onError={() => {
					setImageError(true)
					setIsLoading(false)
				}}
				onLoad={() => setIsLoading(false)}
				loading="lazy"
			/>
		</div>
	)
}
