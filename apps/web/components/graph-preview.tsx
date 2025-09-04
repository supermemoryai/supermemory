"use client";

import { MemoryGraph } from "@repo/ui/memory-graph";
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api";
import type { z } from "zod";
import { useGraphHighlights } from "@/stores/highlights";
import { useState } from "react";
import { X } from "lucide-react";

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>;
type DocumentWithMemories = DocumentsResponse["documents"][0];

interface GraphPreviewProps {
	documents: DocumentWithMemories[];
	error: Error | null;
	hasMore: boolean;
	isLoading: boolean;
	isLoadingMore: boolean;
	totalLoaded: number;
	loadMoreDocuments: () => Promise<void>;
	isCurrentProjectExperimental?: boolean;
}

export function GraphPreview({
	documents,
	error,
	hasMore,
	isLoading,
	isLoadingMore,
	totalLoaded,
	loadMoreDocuments,
	isCurrentProjectExperimental = false,
}: GraphPreviewProps) {
	const { documentIds: allHighlightDocumentIds } = useGraphHighlights();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	return (
		<>
			<button
				type="button"
				className="h-full w-full overflow-hidden relative cursor-pointer group animate-in fade-in-0 duration-300 border-0 bg-transparent p-0"
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setIsModalOpen(true);
				}}
			>
				<div className="h-full relative [&_.absolute.bottom-4.left-4]:!hidden [&_button[title*='fit']]:!hidden [&_button[title*='Zoom']]:!hidden [&_button[title*='Center']]:!hidden">
					<MemoryGraph
						showLegend={false}
						autoLoadOnViewport={true}
						documents={documents}
						error={error}
						hasMore={hasMore}
						highlightDocumentIds={allHighlightDocumentIds}
						highlightsVisible={false}
						isExperimental={isCurrentProjectExperimental}
						isLoading={isLoading}
						isLoadingMore={isLoadingMore}
						loadMoreDocuments={loadMoreDocuments}
						occludedRightPx={0}
						showSpacesSelector={false}
						totalLoaded={totalLoaded}
						variant="consumer"
					/>

					{/* Click capture overlay removed - button handles clicks directly */}

					{/* Hover overlay */}
					{isHovered && (
						<div className="absolute inset-0 flex items-center justify-center animate-in fade-in-0 duration-200 z-20 pointer-events-none ">
							<div className="backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg dark:bg-black bg-white">
								<span className="text-foreground text-sm font-medium">
									Click to view graph
								</span>
							</div>
						</div>
					)}
				</div>
			</button>

			{/* Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
					<div className="bg-background rounded-lg border border-border w-full max-w-6xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-300">
						<div className="h-12 bg-muted/30 border-b border-border flex items-center justify-between px-4">
							<span className="text-sm font-medium text-muted-foreground">
								Interactive Graph
							</span>
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="flex-1 overflow-hidden">
							<MemoryGraph
								autoLoadOnViewport={true}
								documents={documents}
								error={error}
								hasMore={hasMore}
								highlightDocumentIds={allHighlightDocumentIds}
								highlightsVisible={true}
								isExperimental={isCurrentProjectExperimental}
								isLoading={isLoading}
								isLoadingMore={isLoadingMore}
								loadMoreDocuments={loadMoreDocuments}
								occludedRightPx={0}
								showSpacesSelector={true}
								totalLoaded={totalLoaded}
								variant="consumer"
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
