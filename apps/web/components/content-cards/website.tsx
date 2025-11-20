"use client"

import { Card, CardContent } from "@repo/ui/components/card"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog"
import { ExternalLink, Trash2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@lib/utils"
import { getPastelBackgroundColor } from "../memories-utils"
import { colors } from "@repo/ui/memory-graph/constants"

interface WebsiteCardProps {
	title: string
	url: string
	image?: string
	description?: string
	className?: string
	onClick?: () => void
	onOpenDetails?: () => void
	onDelete?: () => void
	showExternalLink?: boolean
}

export const WebsiteCard = ({
	title,
	url,
	image,
	description,
	className,
	onClick,
	onOpenDetails,
	onDelete,
	showExternalLink = true,
}: WebsiteCardProps) => {
	const [imageError, setImageError] = useState(false)
	const [isDialogOpen, setIsDialogOpen] = useState(false)

	const handleCardClick = () => {
		if (!isDialogOpen) {
			if (onClick) {
				onClick()
			} else if (onOpenDetails) {
				onOpenDetails()
			} else {
				window.open(url, "_blank", "noopener,noreferrer")
			}
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
				"cursor-pointer transition-all hover:shadow-md group overflow-hidden py-0 relative",
				className,
			)}
			onClick={handleCardClick}
			style={{
				backgroundColor: getPastelBackgroundColor(url || title || "website"),
			}}
		>
			{onDelete && (
				<AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<AlertDialogTrigger asChild>
						<button
							className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/20"
							onClick={(e) => {
								e.stopPropagation()
							}}
							style={{
								color: colors.text.muted,
								backgroundColor: "rgba(255, 255, 255, 0.1)",
								backdropFilter: "blur(4px)",
							}}
							type="button"
						>
							<Trash2 className="w-3.5 h-3.5" />
						</button>
					</AlertDialogTrigger>
					<AlertDialogContent onClick={(e) => e.stopPropagation()}>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Document</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete this document and all its
								related memories? This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel
								onClick={(e) => {
									e.stopPropagation()
								}}
							>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								className="bg-red-600 hover:bg-red-700 text-white"
								onClick={(e) => {
									e.stopPropagation()
									onDelete()
								}}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}

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
						<div className="flex items-center gap-1">
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
