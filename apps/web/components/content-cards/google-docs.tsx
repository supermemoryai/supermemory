"use client"

import { useState } from "react"
import { Card, CardContent } from "@repo/ui/components/card"
import { Badge } from "@repo/ui/components/badge"
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
import { ExternalLink, FileText, Brain, Trash2 } from "lucide-react"
import { cn } from "@lib/utils"
import { colors } from "@repo/ui/memory-graph/constants"
import { getPastelBackgroundColor } from "../memories-utils"

interface GoogleDocsCardProps {
	title: string
	url: string | null | undefined
	description?: string | null
	className?: string
	onClick?: () => void
	onDelete?: () => void
	showExternalLink?: boolean
	activeMemories?: Array<{ id: string; isForgotten?: boolean }>
	lastModified?: string | Date
}

export const GoogleDocsCard = ({
	title,
	url,
	description,
	className,
	onClick,
	onDelete,
	showExternalLink = true,
	activeMemories,
	lastModified,
}: GoogleDocsCardProps) => {
	const [isDialogOpen, setIsDialogOpen] = useState(false)

	const handleCardClick = () => {
		if (!isDialogOpen) {
			if (onClick) {
				onClick()
			} else if (url) {
				window.open(url, "_blank", "noopener,noreferrer")
			}
		}
	}

	const handleExternalLinkClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (url) {
			window.open(url, "_blank", "noopener,noreferrer")
		}
	}

	return (
		<Card
			className={cn(
				"cursor-pointer transition-all hover:shadow-md group overflow-hidden relative py-4",
				className,
			)}
			onClick={handleCardClick}
			style={{
				backgroundColor: getPastelBackgroundColor(url || title || "googledocs"),
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
				<div className="px-4 border-b border-white/10">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<svg
								className="w-4 h-4"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 87.3 78"
								aria-label="Google Docs"
							>
								<title>Google Docs</title>
								<path
									fill="#0066da"
									d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z"
								/>
								<path
									fill="#00ac47"
									d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z"
								/>
								<path
									fill="#ea4335"
									d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z"
								/>
								<path
									fill="#00832d"
									d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"
								/>
								<path
									fill="#2684fc"
									d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
								/>
								<path
									fill="#ffba00"
									d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"
								/>
							</svg>
							<div className="flex flex-col">
								<span className="text-xs text-muted-foreground">
									Google Docs
								</span>
							</div>
						</div>
						<div className="flex items-center gap-1">
							{showExternalLink && (
								<button
									onClick={handleExternalLinkClick}
									className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 flex-shrink-0"
									type="button"
									aria-label="Open in Google Docs"
								>
									<ExternalLink className="w-4 h-4" />
								</button>
							)}
						</div>
					</div>
				</div>

				<div className="px-4 space-y-2">
					<div className="flex items-start justify-between gap-2">
						<h3 className="font-semibold text-sm line-clamp-2 leading-tight flex-1">
							{title || "Untitled Document"}
						</h3>
					</div>

					{description && (
						<p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
							{description}
						</p>
					)}

					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<div className="flex items-center gap-1">
							<FileText className="w-3 h-3" />
							<span>Google Workspace</span>
						</div>
						{lastModified && (
							<span className="truncate">
								Modified{" "}
								{lastModified instanceof Date
									? lastModified.toLocaleDateString()
									: new Date(lastModified).toLocaleDateString()}
							</span>
						)}
					</div>

					{activeMemories && activeMemories.length > 0 && (
						<div>
							<Badge
								className="text-xs text-accent-foreground"
								style={{
									backgroundColor: colors.memory.secondary,
								}}
								variant="secondary"
							>
								<Brain className="w-3 h-3 mr-1" />
								{activeMemories.length}{" "}
								{activeMemories.length === 1 ? "memory" : "memories"}
							</Badge>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

GoogleDocsCard.displayName = "GoogleDocsCard"
