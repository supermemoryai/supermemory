"use client";

import { useIsMobile } from "@hooks/use-mobile";
import { cn } from "@lib/utils";
import {
	GoogleDocs,
	GoogleDrive,
	GoogleSheets,
	GoogleSlides,
	MicrosoftExcel,
	MicrosoftOneNote,
	MicrosoftPowerpoint,
	MicrosoftWord,
	NotionDoc,
	OneDrive,
	PDF,
} from "@repo/ui/assets/icons";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader } from "@repo/ui/components/card";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@repo/ui/components/drawer";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { colors } from "@repo/ui/memory-graph/constants";
import type { DocumentsWithMemoriesResponseSchema } from "@repo/validation/api";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Label1Regular } from "@ui/text/label/label-1-regular";
import {
	Brain,
	Calendar,
	ExternalLink,
	FileText,
	Sparkles,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import useResizeObserver from "@/hooks/use-resize-observer";
import { analytics } from "@/lib/analytics";

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>;
type DocumentWithMemories = DocumentsResponse["documents"][0];
type MemoryEntry = DocumentWithMemories["memoryEntries"][0];

interface MemoryListViewProps {
	children?: React.ReactNode;
	documents: DocumentWithMemories[];
	isLoading: boolean;
	isLoadingMore: boolean;
	error: Error | null;
	totalLoaded: number;
	hasMore: boolean;
	loadMoreDocuments: () => Promise<void>;
}

const GreetingMessage = memo(() => {
	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 17) return "Good afternoon";
		return "Good evening";
	};

	return (
		<div className="flex items-center gap-3 mb-3 px-4 md:mb-6 md:mt-3">
			<div>
				<h1
					className="text-lg md:text-xl font-semibold"
					style={{ color: colors.text.primary }}
				>
					{getGreeting()}!
				</h1>
				<p className="text-xs md:text-sm" style={{ color: colors.text.muted }}>
					Welcome back to your memory collection
				</p>
			</div>
		</div>
	);
});

const formatDate = (date: string | Date) => {
	const dateObj = new Date(date);
	const now = new Date();
	const currentYear = now.getFullYear();
	const dateYear = dateObj.getFullYear();

	const monthNames = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const month = monthNames[dateObj.getMonth()];
	const day = dateObj.getDate();

	const getOrdinalSuffix = (n: number) => {
		const s = ["th", "st", "nd", "rd"];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]!);
	};

	const formattedDay = getOrdinalSuffix(day);

	if (dateYear !== currentYear) {
		return `${month} ${formattedDay}, ${dateYear}`;
	}

	return `${month} ${formattedDay}`;
};

const formatDocumentType = (type: string) => {
	// Special case for PDF
	if (type.toLowerCase() === "pdf") return "PDF";

	// Replace underscores with spaces and capitalize each word
	return type
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
};

const getDocumentIcon = (type: string, className: string) => {
	const iconProps = {
		className,
		style: { color: colors.text.muted },
	};

	switch (type) {
		case "google_doc":
			return <GoogleDocs {...iconProps} />;
		case "google_sheet":
			return <GoogleSheets {...iconProps} />;
		case "google_slide":
			return <GoogleSlides {...iconProps} />;
		case "google_drive":
			return <GoogleDrive {...iconProps} />;
		case "notion":
		case "notion_doc":
			return <NotionDoc {...iconProps} />;
		case "word":
		case "microsoft_word":
			return <MicrosoftWord {...iconProps} />;
		case "excel":
		case "microsoft_excel":
			return <MicrosoftExcel {...iconProps} />;
		case "powerpoint":
		case "microsoft_powerpoint":
			return <MicrosoftPowerpoint {...iconProps} />;
		case "onenote":
		case "microsoft_onenote":
			return <MicrosoftOneNote {...iconProps} />;
		case "onedrive":
			return <OneDrive {...iconProps} />;
		case "pdf":
			return <PDF {...iconProps} />;
		default:
			return <FileText {...iconProps} />;
	}
};

const getSourceUrl = (document: DocumentWithMemories) => {
	if (document.type === "google_doc" && document.customId) {
		return `https://docs.google.com/document/d/${document.customId}`;
	}
	if (document.type === "google_sheet" && document.customId) {
		return `https://docs.google.com/spreadsheets/d/${document.customId}`;
	}
	if (document.type === "google_slide" && document.customId) {
		return `https://docs.google.com/presentation/d/${document.customId}`;
	}
	// Fallback to existing URL for all other document types
	return document.url;
};

const MemoryDetailItem = memo(({ memory }: { memory: MemoryEntry }) => {
	return (
		<button
			className="p-4 rounded-lg border transition-all relative overflow-hidden cursor-pointer"
			style={{
				backgroundColor: memory.isLatest
					? colors.memory.primary
					: "rgba(255, 255, 255, 0.02)",
				borderColor: memory.isLatest
					? colors.memory.border
					: "rgba(255, 255, 255, 0.1)",
				backdropFilter: "blur(8px)",
				WebkitBackdropFilter: "blur(8px)",
			}}
			tabIndex={0}
			type="button"
		>
			<div className="flex items-start gap-2 relative z-10">
				<div
					className="p-1 rounded"
					style={{
						backgroundColor: memory.isLatest
							? colors.memory.secondary
							: "transparent",
					}}
				>
					<Brain
						className={`w-4 h-4 flex-shrink-0 transition-all ${
							memory.isLatest ? "text-blue-400" : "text-blue-400/50"
						}`}
					/>
				</div>
				<div className="flex-1 space-y-2">
					<Label1Regular
						className="text-sm leading-relaxed text-left"
						style={{ color: colors.text.primary }}
					>
						{memory.memory}
					</Label1Regular>
					<div className="flex items-center gap-2 flex-wrap">
						{memory.isForgotten && (
							<Badge
								className="text-xs border-red-500/30 backdrop-blur-sm"
								style={{
									backgroundColor: colors.status.forgotten,
									color: "#dc2626",
									backdropFilter: "blur(4px)",
									WebkitBackdropFilter: "blur(4px)",
								}}
								variant="destructive"
							>
								Forgotten
							</Badge>
						)}
						{memory.isLatest && (
							<Badge
								className="text-xs border-blue-400/30 backdrop-blur-sm"
								style={{
									backgroundColor: colors.memory.secondary,
									color: colors.accent.primary,
									backdropFilter: "blur(4px)",
									WebkitBackdropFilter: "blur(4px)",
								}}
								variant="default"
							>
								Latest
							</Badge>
						)}
						{memory.forgetAfter && (
							<Badge
								className="text-xs backdrop-blur-sm"
								style={{
									borderColor: colors.status.expiring,
									color: colors.status.expiring,
									backgroundColor: "rgba(251, 165, 36, 0.1)",
									backdropFilter: "blur(4px)",
									WebkitBackdropFilter: "blur(4px)",
								}}
								variant="outline"
							>
								Expires: {formatDate(memory.forgetAfter)}
							</Badge>
						)}
					</div>
					<div
						className="flex items-center gap-4 text-xs"
						style={{ color: colors.text.muted }}
					>
						<span className="flex items-center gap-1">
							<Calendar className="w-3 h-3" />
							{formatDate(memory.createdAt)}
						</span>
						<span className="font-mono">v{memory.version}</span>
						{memory.sourceRelevanceScore && (
							<span
								className="flex items-center gap-1"
								style={{
									color:
										memory.sourceRelevanceScore > 70
											? colors.accent.emerald
											: colors.text.muted,
								}}
							>
								<Sparkles className="w-3 h-3" />
								{memory.sourceRelevanceScore}%
							</span>
						)}
					</div>
				</div>
			</div>
		</button>
	);
});

const DocumentCard = memo(
	({
		document,
		onOpenDetails,
	}: {
		document: DocumentWithMemories;
		onOpenDetails: (document: DocumentWithMemories) => void;
	}) => {
		const activeMemories = document.memoryEntries.filter((m) => !m.isForgotten);
		const forgottenMemories = document.memoryEntries.filter(
			(m) => m.isForgotten,
		);

		return (
			<Card
				className="h-full mx-4 p-4 transition-all cursor-pointer group relative overflow-hidden border-0 gap-2 md:w-full"
				onClick={() => {
					analytics.documentCardClicked();
					onOpenDetails(document);
				}}
				style={{
					backgroundColor: colors.document.primary,
				}}
			>
				<CardHeader className="relative z-10 px-0">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-1">
							{getDocumentIcon(document.type, "w-4 h-4 flex-shrink-0")}
							<p
								className={cn(
									"text-sm font-medium line-clamp-1",
									document.url ? "max-w-[190px]" : "max-w-[200px]",
								)}
							>
								{document.title || "Untitled Document"}
							</p>
						</div>
						{document.url && (
							<button
								className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
								onClick={(e) => {
									e.stopPropagation();
									const sourceUrl = getSourceUrl(document);
									window.open(sourceUrl ?? undefined, "_blank");
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
						<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
							<span>{formatDate(document.createdAt)}</span>
						</div>
					</div>
				</CardHeader>
				<CardContent className="relative z-10 px-0">
					{document.summary && (
						<p
							className="text-xs line-clamp-2 mb-3"
							style={{ color: colors.text.muted }}
						>
							{document.summary}
						</p>
					)}
					<div className="flex items-center gap-2 flex-wrap">
						{activeMemories.length > 0 && (
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
						)}
						{forgottenMemories.length > 0 && (
							<Badge
								className="text-xs"
								style={{
									borderColor: "rgba(255, 255, 255, 0.2)",
									color: colors.text.muted,
								}}
								variant="outline"
							>
								{forgottenMemories.length} forgotten
							</Badge>
						)}
					</div>
				</CardContent>
			</Card>
		);
	},
);

const DocumentDetailSheet = memo(
	({
		document,
		isOpen,
		onClose,
		isMobile,
	}: {
		document: DocumentWithMemories | null;
		isOpen: boolean;
		onClose: () => void;
		isMobile: boolean;
	}) => {
		if (!document) return null;

		const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
		const activeMemories = document.memoryEntries.filter((m) => !m.isForgotten);
		const forgottenMemories = document.memoryEntries.filter(
			(m) => m.isForgotten,
		);

		const HeaderContent = ({
			TitleComponent,
		}: {
			TitleComponent: typeof SheetTitle | typeof DrawerTitle;
		}) => (
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-start gap-3 flex-1">
					<div
						className="p-2 rounded-lg"
						style={{
							backgroundColor: colors.document.secondary,
							border: `1px solid ${colors.document.border}`,
						}}
					>
						{getDocumentIcon(document.type, "w-5 h-5")}
					</div>
					<div className="flex-1">
						<TitleComponent style={{ color: colors.text.primary }}>
							{document.title || "Untitled Document"}
						</TitleComponent>
						<div
							className="flex items-center gap-2 mt-1 text-xs"
							style={{ color: colors.text.muted }}
						>
							<span>{formatDocumentType(document.type)}</span>
							<span>•</span>
							<span>{formatDate(document.createdAt)}</span>
							{document.url && (
								<>
									<span>•</span>
									<button
										className="flex items-center gap-1 transition-all hover:gap-2"
										onClick={() => {
											const sourceUrl = getSourceUrl(document);
											window.open(sourceUrl ?? undefined, "_blank");
										}}
										style={{ color: colors.accent.primary }}
										type="button"
									>
										View source
										<ExternalLink className="w-3 h-3" />
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		);

		const SummarySection = () => {
			if (!document.summary) return null;

			const shouldShowToggle = document.summary.length > 200; // Show toggle for longer summaries

			return (
				<div
					className="mt-4 p-3 rounded-lg"
					style={{
						backgroundColor: "rgba(255, 255, 255, 0.03)",
						border: "1px solid rgba(255, 255, 255, 0.08)",
					}}
				>
					<p
						className={`text-sm ${!isSummaryExpanded ? "line-clamp-3" : ""}`}
						style={{ color: colors.text.muted }}
					>
						{document.summary}
					</p>
					{shouldShowToggle && (
						<button
							onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
							className="mt-2 text-xs hover:underline transition-all"
							style={{ color: colors.accent.primary }}
							type="button"
						>
							{isSummaryExpanded ? "Show less" : "Show more"}
						</button>
					)}
				</div>
			);
		};

		const MemoryContent = () => (
			<div className="p-6 space-y-6">
				{activeMemories.length > 0 && (
					<div>
						<div
							className="text-sm font-medium mb-4 flex items-start gap-2 px-3 py-2 rounded-lg"
							style={{
								color: colors.text.secondary,
								backgroundColor: colors.memory.primary,
								border: `1px solid ${colors.memory.border}`,
							}}
						>
							<Brain className="w-4 h-4 text-blue-400" />
							Active Memories ({activeMemories.length})
						</div>
						<div className="space-y-3">
							{activeMemories.map((memory, index) => (
								<div
									className="animate-in fade-in slide-in-from-right-2"
									key={memory.id}
									style={{ animationDelay: `${index * 50}ms` }}
								>
									<MemoryDetailItem memory={memory} />
								</div>
							))}
						</div>
					</div>
				)}

				{forgottenMemories.length > 0 && (
					<div>
						<div
							className="text-sm font-medium mb-4 px-3 py-2 rounded-lg opacity-60"
							style={{
								color: colors.text.muted,
								backgroundColor: "rgba(255, 255, 255, 0.02)",
								border: "1px solid rgba(255, 255, 255, 0.08)",
							}}
						>
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
					<div
						className="text-center py-12 rounded-lg"
						style={{
							backgroundColor: "rgba(255, 255, 255, 0.02)",
							border: "1px solid rgba(255, 255, 255, 0.08)",
						}}
					>
						<Brain
							className="w-12 h-12 mx-auto mb-4 opacity-30"
							style={{ color: colors.text.muted }}
						/>
						<p style={{ color: colors.text.muted }}>
							No memories found for this document
						</p>
					</div>
				)}
			</div>
		);

		if (isMobile) {
			return (
				<Drawer onOpenChange={onClose} open={isOpen}>
					<DrawerContent
						className="border-0 p-0 overflow-hidden max-h-[90vh]"
						style={{
							backgroundColor: colors.background.secondary,
							borderTop: `1px solid ${colors.document.border}`,
							backdropFilter: "blur(20px)",
							WebkitBackdropFilter: "blur(20px)",
						}}
					>
						{/* Header section with glass effect */}
						<div
							className="p-4 relative border-b"
							style={{
								backgroundColor: "rgba(255, 255, 255, 0.02)",
								borderBottom: `1px solid ${colors.document.border}`,
							}}
						>
							<DrawerHeader className="pb-0 px-0 text-left">
								<HeaderContent TitleComponent={DrawerTitle} />
							</DrawerHeader>

							<SummarySection />
						</div>

						<div className="flex-1 memory-drawer-scroll overflow-y-auto">
							<MemoryContent />
						</div>
					</DrawerContent>
				</Drawer>
			);
		}

		return (
			<Sheet onOpenChange={onClose} open={isOpen}>
				<SheetContent
					className="w-full sm:max-w-2xl border-0 p-0 overflow-hidden"
					style={{
						backgroundColor: colors.background.secondary,
						borderLeft: `1px solid ${colors.document.border}`,
						backdropFilter: "blur(20px)",
						WebkitBackdropFilter: "blur(20px)",
					}}
				>
					{/* Header section with glass effect */}
					<div
						className="p-6 relative"
						style={{
							backgroundColor: "rgba(255, 255, 255, 0.02)",
							borderBottom: `1px solid ${colors.document.border}`,
						}}
					>
						<SheetHeader className="pb-0">
							<HeaderContent TitleComponent={SheetTitle} />
						</SheetHeader>

						<SummarySection />
					</div>

					<div className="h-[calc(100vh-200px)] memory-sheet-scroll overflow-y-auto">
						<MemoryContent />
					</div>
				</SheetContent>
			</Sheet>
		);
	},
);

export const MemoryListView = ({
	children,
	documents,
	isLoading,
	isLoadingMore,
	error,
	hasMore,
	loadMoreDocuments,
}: MemoryListViewProps) => {
	const [selectedSpace, _] = useState<string>("all");
	const [selectedDocument, setSelectedDocument] =
		useState<DocumentWithMemories | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const parentRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const isMobile = useIsMobile();

	const gap = 14;

	const { width: containerWidth } = useResizeObserver(containerRef);
	const columnWidth = isMobile ? containerWidth : 320;
	const columns = Math.max(
		1,
		Math.floor((containerWidth + gap) / (columnWidth + gap)),
	);

	// Filter documents based on selected space
	const filteredDocuments = useMemo(() => {
		if (!documents) return [];

		if (selectedSpace === "all") {
			return documents;
		}

		return documents
			.map((doc) => ({
				...doc,
				memoryEntries: doc.memoryEntries.filter(
					(memory) =>
						(memory.spaceContainerTag ?? memory.spaceId) === selectedSpace,
				),
			}))
			.filter((doc) => doc.memoryEntries.length > 0);
	}, [documents, selectedSpace]);

	const handleOpenDetails = useCallback((document: DocumentWithMemories) => {
		analytics.memoryDetailOpened();
		setSelectedDocument(document);
		setIsDetailOpen(true);
	}, []);

	const handleCloseDetails = useCallback(() => {
		setIsDetailOpen(false);
		setTimeout(() => setSelectedDocument(null), 300);
	}, []);

	const virtualItems = useMemo(() => {
		const items = [];
		for (let i = 0; i < filteredDocuments.length; i += columns) {
			items.push(filteredDocuments.slice(i, i + columns));
		}
		return items;
	}, [filteredDocuments, columns]);

	const virtualizer = useVirtualizer({
		count: virtualItems.length,
		getScrollElement: () => parentRef.current,
		overscan: 5,
		estimateSize: () => 200,
	});

	useEffect(() => {
		const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

		if (!lastItem || !hasMore || isLoadingMore) {
			return;
		}

		if (lastItem.index >= virtualItems.length - 1) {
			loadMoreDocuments();
		}
	}, [
		hasMore,
		isLoadingMore,
		loadMoreDocuments,
		virtualizer.getVirtualItems(),
		virtualItems.length,
	]);

	// Always render with consistent structure
	return (
		<>
			<div
				className="h-full overflow-hidden relative pb-20"
				style={{ backgroundColor: colors.background.primary }}
				ref={containerRef}
			>
				{error ? (
					<div className="h-full flex items-center justify-center p-4">
						<div className="rounded-xl overflow-hidden">
							<div
								className="relative z-10 px-6 py-4"
								style={{ color: colors.text.primary }}
							>
								Error loading documents: {error.message}
							</div>
						</div>
					</div>
				) : isLoading ? (
					<div className="h-full flex items-center justify-center p-4">
						<div className="rounded-xl overflow-hidden">
							<div
								className="relative z-10 px-6 py-4"
								style={{ color: colors.text.primary }}
							>
								<div className="flex items-center gap-2">
									<Sparkles className="w-4 h-4 animate-spin text-blue-400" />
									<span>Loading memory list...</span>
								</div>
							</div>
						</div>
					</div>
				) : filteredDocuments.length === 0 && !isLoading ? (
					<div className="h-full flex items-center justify-center p-4">
						{children}
					</div>
				) : (
					<div
						ref={parentRef}
						className="h-full overflow-auto mt-20 custom-scrollbar"
					>
						<GreetingMessage />

						<div
							className="w-full relative"
							style={{
								height: `${virtualizer.getTotalSize() + virtualItems.length * gap}px`,
							}}
						>
							{virtualizer.getVirtualItems().map((virtualRow) => {
								const rowItems = virtualItems[virtualRow.index];
								if (!rowItems) return null;

								return (
									<div
										key={virtualRow.key}
										data-index={virtualRow.index}
										ref={virtualizer.measureElement}
										className="absolute top-0 left-0 w-full"
										style={{
											transform: `translateY(${virtualRow.start + virtualRow.index * gap}px)`,
										}}
									>
										<div
											className="grid justify-start"
											style={{
												gridTemplateColumns: `repeat(${columns}, ${columnWidth}px)`,
												gap: `${gap}px`,
											}}
										>
											{rowItems.map((document, columnIndex) => (
												<DocumentCard
													key={`${document.id}-${virtualRow.index}-${columnIndex}`}
													document={document}
													onOpenDetails={handleOpenDetails}
												/>
											))}
										</div>
									</div>
								);
							})}
						</div>

						{isLoadingMore && (
							<div className="py-8 flex items-center justify-center">
								<div className="flex items-center gap-2">
									<Sparkles className="w-4 h-4 animate-spin text-blue-400" />
									<span style={{ color: colors.text.primary }}>
										Loading more memories...
									</span>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			<DocumentDetailSheet
				document={selectedDocument}
				isOpen={isDetailOpen}
				onClose={handleCloseDetails}
				isMobile={isMobile}
			/>
		</>
	);
};
