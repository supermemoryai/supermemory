"use client"

import { Card, CardContent } from "@repo/ui/components/card"
import { ExternalLink } from "lucide-react"
import { useState } from "react"
import { cn } from "@lib/utils"
import { getPastelBackgroundColor } from "../memories-utils"

interface WebsiteCardProps {
	title: string
	url: string
	image?: string
	description?: string
	className?: string
	onClick?: () => void
	showExternalLink?: boolean
}

export const WebsiteCard = ({
	title,
	url,
	image,
	description,
	className,
	onClick,
	showExternalLink = true,
}: WebsiteCardProps) => {
	const [imageError, setImageError] = useState(false)

	const handleCardClick = () => {
		if (onClick) {
			onClick()
		} else {
			window.open(url, "_blank", "noopener,noreferrer")
		}
	}

	const handleExternalLinkClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		window.open(url, "_blank", "noopener,noreferrer")
	}

	const hostname = (() => {
		try {
			return new URL(url).hostname
		} catch {
			return url
		}
	})()

	return (
		<Card
			className={cn(
				"cursor-pointer transition-all hover:shadow-md group overflow-hidden py-0",
				className,
			)}
			onClick={handleCardClick}
			style={{
				backgroundColor: getPastelBackgroundColor(url || title || "website"),
			}}
		>
			<CardContent className="p-0">
				{image && !imageError && (
					<div className="relative h-38 bg-gray-100 overflow-hidden">
						<img
							src={image}
							alt={title || "Website preview"}
							className="w-full h-full object-cover transition-transform group-hover:scale-105"
							onError={() => setImageError(true)}
							loading="lazy"
						/>
					</div>
				)}

				<div className="px-4 py-2 space-y-2">
					<div className="font-semibold text-sm line-clamp-2 leading-tight flex items-center justify-between">
						{title}
						{showExternalLink && (
							<button
								onClick={handleExternalLinkClick}
								className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 flex-shrink-0"
								type="button"
								aria-label="Open in new tab"
							>
								<ExternalLink className="w-3 h-3" />
							</button>
						)}
					</div>

					{description && (
						<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
							{description}
						</p>
					)}

					<p className="text-xs text-muted-foreground truncate">{hostname}</p>
				</div>
			</CardContent>
		</Card>
	)
}

WebsiteCard.displayName = "WebsiteCard"
