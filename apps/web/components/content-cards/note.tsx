import { Badge } from "@repo/ui/components/badge"
import { Card, CardContent, CardHeader } from "@repo/ui/components/card"
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

import { colors } from "@repo/ui/memory-graph/constants"
import { Brain, ExternalLink, Trash2 } from "lucide-react"
import { cn } from "@lib/utils"
import { useState } from "react"
import {
	formatDate,
	getPastelBackgroundColor,
	getSourceUrl,
} from "../memories-utils"
import { MCPIcon } from "../menu"
import { analytics } from "@/lib/analytics"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import type { z } from "zod"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]

interface NoteCardProps {
	document: DocumentWithMemories
	width: number
	activeMemories: Array<{ id: string; isForgotten?: boolean }>
	forgottenMemories: Array<{ id: string; isForgotten?: boolean }>
	onOpenDetails: (document: DocumentWithMemories) => void
	onDelete: (document: DocumentWithMemories) => void
}

export const NoteCard = ({
	document,
	width,
	activeMemories,
	forgottenMemories,
	onOpenDetails,
	onDelete,
}: NoteCardProps) => {
	const [isDialogOpen, setIsDialogOpen] = useState(false)

	return (
		<Card
			className="w-full p-4 transition-all cursor-pointer group relative overflow-hidden gap-2 shadow-xs"
			onClick={() => {
				if (!isDialogOpen) {
					analytics.documentCardClicked()
					onOpenDetails(document)
				}
			}}
			style={{
				backgroundColor: getPastelBackgroundColor(
					document.id || document.title || "note",
				),
				width: width,
			}}
		>
			<AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<AlertDialogTrigger asChild>
					<button
						className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 group-hover:cursor-pointer transition-opacity p-1.5 rounded-md hover:bg-red-500/20"
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
							Are you sure you want to delete this document and all its related
							memories? This action cannot be undone.
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
								onDelete(document)
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<CardHeader className="relative z-10 px-0 pb-0">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1">
						<p
							className={cn(
								"text-sm font-medium line-clamp-1",
								document.url ? "max-w-[190px]" : "max-w-[200px]",
							)}
						>
							{document.title || "Untitled Document"}
						</p>
					</div>
					<div className="flex items-center gap-1">
						{document.url && (
							<button
								className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
								onClick={(e) => {
									e.stopPropagation()
									const sourceUrl = getSourceUrl(document)
									window.open(sourceUrl ?? undefined, "_blank")
								}}
								style={{
									backgroundColor: "rgba(255, 255, 255, 0.05)",
									color: colors.text.secondary,
								}}
								type="button"
							>
								<ExternalLink className="w-3 h-3" />
							</button>
						)}
					</div>
					<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
						<span>{formatDate(document.createdAt)}</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="relative z-10 px-0">
				{document.content && (
					<p
						className="text-xs line-clamp-6"
						style={{ color: colors.text.muted }}
					>
						{document.content}
					</p>
				)}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 flex-wrap">
						{activeMemories.length > 0 && (
							<Badge
								className="text-xs text-accent-foreground mt-2"
								style={{
									backgroundColor: colors.memory.secondary,
								}}
								variant="secondary"
							>
								<Brain className="w-3 h-3 mr-1" />
								{activeMemories.length}{" "}
								{activeMemories.length === 1 ? "memory" : "memories"}
							</Badge>
						)}
						{forgottenMemories.length > 0 && (
							<Badge
								className="text-xs mt-2"
								style={{
									borderColor: "rgba(255, 255, 255, 0.2)",
									color: colors.text.muted,
								}}
								variant="outline"
							>
								{forgottenMemories.length} forgotten
							</Badge>
						)}
						{document.source === "mcp" && (
							<Badge variant="outline" className="mt-2">
								<MCPIcon className="w-3 h-3 mr-1" />
								MCP
							</Badge>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

NoteCard.displayName = "NoteCard"
