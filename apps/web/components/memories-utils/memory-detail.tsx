import { getDocumentIcon } from "@/lib/document-icon"
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@repo/ui/components/drawer"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog"
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api"
import { Badge } from "@ui/components/badge"
import {
	Brain,
	Calendar,
	ChevronDown,
	ChevronUp,
	CircleUserRound,
	ExternalLink,
	List,
	Sparkles,
} from "lucide-react"
import { memo, useState } from "react"
import type { z } from "zod"
import { formatDate, getSourceUrl } from "."
import { Label1Regular } from "@ui/text/label/label-1-regular"
import { HTMLContentRenderer } from "./html-content-renderer"
import { Button } from "@ui/components/button"

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>
type DocumentWithMemories = DocumentsResponse["documents"][0]
type MemoryEntry = DocumentWithMemories["memoryEntries"][0]

const formatDocumentType = (type: string) => {
	if (type.toLowerCase() === "pdf") return "PDF"

	return type
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ")
}

const MemoryDetailItem = memo(({ memory }: { memory: MemoryEntry }) => {
	return (
		<div
			className={`p-2.5 md:p-4 rounded-lg md:rounded-xl border transition-all relative overflow-hidden group ${
				memory.isLatest
					? "bg-card shadow-sm hover:shadow-md border-primary/30"
					: "bg-card/50 shadow-xs hover:shadow-sm border-border/60 hover:border-border"
			}`}
		>
			<div className="flex items-start gap-2 md:gap-3 relative z-10">
				<div className="flex-1 space-y-1.5 md:space-y-3">
					<Label1Regular className="text-xs md:text-sm leading-relaxed text-left text-card-foreground">
						{memory.memory}
					</Label1Regular>
					<div className="flex gap-1 md:gap-2 justify-between items-center flex-wrap">
						<div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-muted-foreground">
							<span className="flex items-center gap-1">
								<Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />
								{formatDate(memory.createdAt)}
							</span>
							<span className="font-mono bg-muted/30 px-1 md:px-1.5 py-0.5 rounded text-[9px] md:text-[10px]">
								v{memory.version}
							</span>
							{memory.sourceRelevanceScore && (
								<span
									className={`flex items-center gap-1 font-medium ${
										memory.sourceRelevanceScore > 70
											? "text-emerald-600 dark:text-emerald-400"
											: "text-muted-foreground"
									}`}
								>
									<Sparkles className="w-3.5 h-3.5" />
									{memory.sourceRelevanceScore}%
								</span>
							)}
						</div>
						<div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
							{memory.isForgotten && (
								<Badge
									className="text-[9px] md:text-[10px] h-4 md:h-5"
									variant="destructive"
								>
									Forgotten
								</Badge>
							)}
							{memory.isLatest && (
								<Badge
									className="text-[9px] md:text-[10px] h-4 md:h-5 bg-primary/15 text-primary border-primary/30"
									variant="outline"
								>
									Latest
								</Badge>
							)}
							{memory.forgetAfter && (
								<Badge
									className="text-[9px] md:text-[10px] h-4 md:h-5 text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/30"
									variant="outline"
								>
									<span className="hidden sm:inline">
										Expires {formatDate(memory.forgetAfter)}
									</span>
									<span className="sm:hidden">Expires</span>
								</Badge>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
})

export const MemoryDetail = memo(
	({
		document,
		isOpen,
		onClose,
		isMobile,
	}: {
		document: DocumentWithMemories | null
		isOpen: boolean
		onClose: () => void
		isMobile: boolean
	}) => {
		if (!document) return null

		const [isSummaryOpen, setIsSummaryOpen] = useState(false)

		const activeMemories = document.memoryEntries.filter((m) => !m.isForgotten)
		const forgottenMemories = document.memoryEntries.filter(
			(m) => m.isForgotten,
		)

		const HeaderContent = ({
			TitleComponent,
		}: {
			TitleComponent: typeof DialogTitle | typeof DrawerTitle
		}) => (
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-end gap-2 md:gap-3 flex-1 min-w-0">
					<div className="p-1.5 md:p-2 rounded-lg bg-muted/10 flex-shrink-0">
						{getDocumentIcon(
							document.type,
							"w-4 h-4 md:w-5 md:h-5 text-foreground",
							document.source ?? undefined,
							document.url ?? undefined,
						)}
					</div>
					<div className="flex-1 min-w-0">
						<TitleComponent className="text-foreground text-sm md:text-base truncate text-left">
							{document.title || "Untitled Document"}
						</TitleComponent>
						<div className="flex items-center gap-1.5 md:gap-2 mt-1 text-[10px] md:text-xs text-muted-foreground flex-wrap">
							<span>{formatDocumentType(document.type)}</span>
							<span>•</span>
							<span>{formatDate(document.createdAt)}</span>
						</div>
					</div>
					{(document.url || document.metadata?.website_url) && (
						<div className="flex items-end">
							<Button
								onClick={() => {
									const sourceUrl = getSourceUrl(document)
									window.open(sourceUrl ?? undefined, "_blank")
								}}
								variant="secondary"
								size="sm"
							>
								<span className="hidden sm:inline">visit source</span>
								<span className="sm:hidden">Source</span>
								<ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3" />
							</Button>
						</div>
					)}
				</div>
			</div>
		)

		const ContentDisplaySection = () => {
			const hasContent = document.content && document.content.trim().length > 0

			if (!hasContent) {
				return (
					<div className="text-center py-12 rounded-lg bg-muted/5">
						<CircleUserRound className="w-12 h-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
						<p className="text-muted-foreground">
							No content available for this document
						</p>
					</div>
				)
			}

			return (
				<div className="p-3 md:p-4 rounded-lg bg-muted/5 border border-border h-full overflow-y-auto max-w-3xl">
					<HTMLContentRenderer content={document.content || ""} />
				</div>
			)
		}

		const SummaryDisplaySection = () => {
			const hasSummary = document.summary && document.summary.trim().length > 0

			if (!hasSummary) {
				return (
					<div className="text-center py-6 rounded-lg bg-muted/5">
						<List className="w-6 h-6 mx-auto mb-2 opacity-30 text-muted-foreground" />
						<p className="text-muted-foreground text-xs">
							No summary available
						</p>
					</div>
				)
			}

			return (
				<div className="p-2.5 md:p-3 px-3 md:px-4 rounded-lg bg-primary/5 border border-primary/15">
					<p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
						{document.summary}
					</p>
				</div>
			)
		}

		const MemoryContent = () => (
			<div className="space-y-6">
				{activeMemories.length > 0 && (
					<div>
						<div className="text-sm font-medium flex items-start gap-2 pb-2 text-muted-foreground">
							Active Memories ({activeMemories.length})
						</div>
						<div className="space-y-3 max-h-[80vh] overflow-y-auto custom-scrollbar">
							{activeMemories.map((memory) => (
								<div key={memory.id}>
									<MemoryDetailItem memory={memory} />
								</div>
							))}
						</div>
					</div>
				)}

				{forgottenMemories.length > 0 && (
					<div>
						<div className="text-sm font-medium mb-4 px-3 py-2 rounded-lg opacity-60 text-muted-foreground bg-muted/5">
							Forgotten Memories ({forgottenMemories.length})
						</div>
						<div className="space-y-3 opacity-40">
							{forgottenMemories.map((memory) => (
								<MemoryDetailItem key={memory.id} memory={memory} />
							))}
						</div>
					</div>
				)}

				{activeMemories.length === 0 && forgottenMemories.length === 0 && (
					<div className="text-center py-12 rounded-lg bg-muted/5">
						<Brain className="w-12 h-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
						<p className="text-muted-foreground">
							No memories found for this document
						</p>
					</div>
				)}
			</div>
		)

		if (isMobile) {
			return (
				<Drawer onOpenChange={onClose} open={isOpen}>
					<DrawerContent className="border-0 p-0 overflow-hidden max-h-[95vh] bg-background border-t border-border backdrop-blur-xl flex flex-col">
						<div className="p-3 md:p-4 relative bg-muted/5 flex-shrink-0">
							<DrawerHeader className="p-0 text-left">
								<HeaderContent TitleComponent={DrawerTitle} />
							</DrawerHeader>
						</div>

						<div className="flex-1 overflow-y-auto">
							<div className="border-b border-border">
								<div className="p-2.5 md:p-3 bg-muted/5">
									<h4 className="text-sm md:text-base font-medium text-foreground">
										Content
									</h4>
								</div>
								<div className="p-3 md:p-4 m-4">
									<ContentDisplaySection />
								</div>
							</div>

							<div className="border-b border-border">
								<div className="p-2.5 md:p-3 bg-muted/5">
									<h4 className="text-sm md:text-base font-medium text-foreground">
										Summary
									</h4>
								</div>
								<div className="p-3 md:p-4">
									<SummaryDisplaySection />
								</div>
							</div>

							<div>
								<div className="px-2.5 pt-2.5 md:p-3 bg-muted/5">
									<h4 className="text-sm md:text-base font-medium text-foreground">
										Memories
									</h4>
								</div>
								<div className="p-3 md:p-4">
									<MemoryContent />
								</div>
							</div>
						</div>
					</DrawerContent>
				</Drawer>
			)
		}

		return (
			<Dialog onOpenChange={onClose} open={isOpen}>
				<DialogContent className="w-[95vw] md:w-[90vw] lg:w-[85vw] h-[90vh] border-0 p-0 overflow-hidden flex flex-col bg-background !max-w-7xl gap-0">
					<div className="p-4 md:p-6 relative flex-shrink-0 bg-muted/5">
						<DialogHeader className="pb-0">
							<HeaderContent TitleComponent={DialogTitle} />
						</DialogHeader>
					</div>

					<div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
						<div className="flex-1 flex flex-col h-full justify-between min-w-0">
							<div className="p-2 px-3 md:pl-4 overflow-y-auto custom-scrollbar transition-all duration-300">
								<h3 className="font-medium text-[10px] md:text-sm text-muted-foreground pb-2 px-1">
									Content
								</h3>
								<ContentDisplaySection />
							</div>

							<div className="transition-all duration-300 mx-2 mb-3 md:mb-4 flex-shrink-0">
								<div className="bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm h-full flex flex-col">
									<button
										onClick={() => setIsSummaryOpen(!isSummaryOpen)}
										className="flex-shrink-0 w-full flex items-center justify-between p-3 md:p-4 hover:bg-muted/5 transition-colors rounded-t-xl"
										type="button"
									>
										<div className="flex items-center gap-1.5 md:gap-2">
											<h3 className="font-semibold text-xs md:text-sm text-foreground">
												Summary
											</h3>
											{document.summary &&
												document.summary.trim().length > 0 && (
													<Badge
														className="text-[10px] h-5"
														variant="secondary"
													>
														Available
													</Badge>
												)}
										</div>
										{isSummaryOpen ? (
											<ChevronDown className="w-4 h-4 text-muted-foreground" />
										) : (
											<ChevronUp className="w-4 h-4 text-muted-foreground" />
										)}
									</button>

									{isSummaryOpen && (
										<div className="flex-1 px-3 md:px-4 pb-3 md:pb-4 overflow-hidden min-h-0">
											<div className="h-full overflow-y-auto custom-scrollbar">
												<SummaryDisplaySection />
											</div>
										</div>
									)}
								</div>
							</div>
						</div>

						<div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 border-border">
							<div className="flex-1 flex flex-col">
								<div className="flex-1 memory-dialog-scroll overflow-y-auto p-2 md:p-3">
									<MemoryContent />
								</div>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		)
	},
)
