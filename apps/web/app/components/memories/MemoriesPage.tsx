import { createContext, memo, useCallback, useContext, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Button } from "../ui/button";
import AddMemory from "./AddMemory";
import SharedCard from "./SharedCard";

import { Trash2 } from "lucide-react";
import { Masonry, useInfiniteLoader } from "masonic";
import { useHydrated } from "remix-utils/use-hydrated";
import { toast } from "sonner";
import { useMemories } from "~/lib/hooks/use-memories";
import { useSpaces } from "~/lib/hooks/use-spaces";
import { Memory } from "~/lib/types/memory";
import { cn } from "~/lib/utils";

const variants = ["All Memories", "Web pages", "Tweets", "Documents", "Spaces", "Notes"] as const;
type Variant = (typeof variants)[number];

interface MemoriesPageProps {
	showAddButtons?: boolean;
	isSpace?: boolean;
}

interface SelectionContextType {
	isSelectionMode: boolean;
	selectedItems: Set<string>;
	toggleSelection: (uuid: string) => void;
}

const SelectionContext = createContext<SelectionContextType | null>(null);

function MemoriesPage({ showAddButtons = true, isSpace = false }: MemoriesPageProps) {
	const isHydrated = useHydrated();
	const { spaceId } = useParams();
	const [selectedVariant, setSelectedVariant] = useState<Variant>("All Memories");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
	const [isDeleting, setIsDeleting] = useState(false);

	const { memories, isLoading, loadMore, hasMore, mutate } = useMemories(0, 20, spaceId);

	const { spaces } = useSpaces();

	const handleToggleSelection = useCallback((uuid: string) => {
		setSelectedItems((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(uuid)) {
				newSet.delete(uuid);
			} else {
				newSet.add(uuid);
			}
			return newSet;
		});
	}, []);

	const handleBatchDelete = useCallback(async () => {
		if (selectedItems.size === 0) return;

		const confirmed = window.confirm(
			`Are you sure you want to delete ${selectedItems.size} item${selectedItems.size > 1 ? "s" : ""}?`,
		);

		if (!confirmed) return;

		setIsDeleting(true);
		try {
			const response = await fetch("/backend/v1/memories/batch-delete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids: Array.from(selectedItems) }),
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to delete items");
			}

			const data = (await response.json()) as { success: boolean; deletedCount: number };
			toast.success(
				`Successfully deleted ${data.deletedCount} item${data.deletedCount > 1 ? "s" : ""}`,
			);

			// Reset selection mode and clear selected items
			setIsSelectionMode(false);
			setSelectedItems(new Set());

			// Refresh the memories list
			mutate();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to delete items");
		} finally {
			setIsDeleting(false);
		}
	}, [selectedItems, mutate]);

	const loadMoreItems = useCallback(
		(startIndex: number, stopIndex: number) => {
			if (!hasMore || isLoading) {
				return Promise.resolve();
			}
			return loadMore();
		},
		[hasMore, isLoading, loadMore],
	);

	const maybeLoadMore = useInfiniteLoader(loadMoreItems, {
		isItemLoaded: (index) => !hasMore || index < (memories?.length || 0),
		minimumBatchSize: 20,
		threshold: 6,
	});

	// Memoize space items transformation
	const spaceItems = useMemo(() => {
		if (spaceId) return [];
		return spaces
			.filter((space) => space.uuid !== "<HOME>")
			.map((space) => ({
				id: space.uuid,
				type: "space",
				content: space.name,
				createdAt: new Date(space.createdAt),
				description: null,
				ogImage: null,
				title: space.name,
				url: `/space/${space.uuid}`,
				uuid: space.uuid,
				updatedAt: null,
				raw: null,
				userId: space.ownerId,
				isSuccessfullyProcessed: true,
			}));
	}, [spaces, spaceId]);

	// Memoize filtered memories
	const filteredMemories = useMemo(() => {
		const baseMemories = memories || [];
		switch (selectedVariant) {
			case "Web pages":
				return baseMemories.filter((m) => m.type === "page");
			case "Tweets":
				return baseMemories.filter((m) => m.type === "tweet");
			case "Documents":
				return baseMemories.filter((m) => m.type === "document");
			case "Spaces":
				return spaceId ? baseMemories : [];
			case "Notes":
				return baseMemories.filter((m) => m.type === "note");
			default:
				return baseMemories;
		}
	}, [memories, selectedVariant, spaceId]);

	// Memoize add button item
	const addButtonItem = useMemo(() => {
		if (!showAddButtons) return [];
		return [
			{
				id: "add-button",
				type: "note",
				content: null,
				createdAt: new Date(),
				description: null,
				ogImage: null,
				title: null,
				url: null,
				uuid: "add-button",
				updatedAt: null,
				raw: null,
				userId: "0",
				isSuccessfullyProcessed: true,
			},
		];
	}, [showAddButtons]);

	// Combine items and generate key
	const { items, key } = useMemo(() => {
		const shouldShowSpaces =
			!isSpace && (selectedVariant === "All Memories" || selectedVariant === "Spaces");
		const allItems = [
			...addButtonItem,
			...(shouldShowSpaces ? spaceItems : []),
			...filteredMemories,
		];

		return {
			items: allItems,
			key: `${selectedVariant || "default"}-${spaceId || "no-space"}-${allItems.length}`,
		};
	}, [addButtonItem, spaceItems, filteredMemories, selectedVariant, spaceId, isSpace]);

	const selectionContextValue = useMemo(
		() => ({
			isSelectionMode,
			selectedItems,
			toggleSelection: handleToggleSelection,
		}),
		[isSelectionMode, selectedItems, handleToggleSelection],
	);

	const MemoizedSharedCard = memo(
		({
			data,
			index,
			showAddButtons,
			isSpace,
		}: {
			data: Memory;
			index: number;
			showAddButtons: boolean;
			isSpace: boolean;
		}) => {
			const selection = useContext(SelectionContext);

			if (index === 0 && showAddButtons) {
				return <AddMemory isSpace={isSpace} />;
			}
			if (data.type === "space") {
				return <SharedCard data={data} />;
			}
			return (
				<SharedCard
					data={data}
					isSelectionMode={selection?.isSelectionMode ?? false}
					isSelected={selection?.selectedItems.has(data.uuid) ?? false}
					onToggleSelect={() => selection?.toggleSelection(data.uuid)}
				/>
			);
		},
		(prevProps, nextProps) => {
			// Custom comparison function for memo
			return prevProps.data.uuid === nextProps.data.uuid;
		},
	);

	MemoizedSharedCard.displayName = "MemoizedSharedCard";

	const renderCard = useCallback(
		({ data, index }: { data: Memory; index: number }) => (
			<MemoizedSharedCard
				data={data}
				index={index}
				showAddButtons={showAddButtons}
				isSpace={isSpace}
			/>
		),
		[showAddButtons, isSpace],
	);

	const handleVariantClick = useCallback((variant: Variant) => {
		setSelectedVariant(variant);
		setIsMobileMenuOpen(false);
		if (variant === "Spaces") {
			setIsSelectionMode(false);
			setSelectedItems(new Set());
		}
	}, []);

	const SelectionControls = useMemo(
		() => (
			<div className="flex items-center gap-2 mb-4">
				{selectedVariant !== "Spaces" && (
					<>
						<Button
							variant={isSelectionMode ? "secondary" : "outline"}
							onClick={() => {
								setIsSelectionMode(!isSelectionMode);
								if (!isSelectionMode) {
									setSelectedItems(new Set());
								}
							}}
						>
							{isSelectionMode ? "Cancel Selection" : "Select Items"}
						</Button>
						{isSelectionMode && (
							<>
								<Button
									variant="outline"
									onClick={() => {
										// Get all non-space items' UUIDs
										const allUuids = filteredMemories
											.filter((item) => item.type !== "space")
											.map((item) => item.uuid);

										// If all items are selected, clear selection
										if (allUuids.every((uuid) => selectedItems.has(uuid))) {
											setSelectedItems(new Set());
										} else {
											// Otherwise, select all items
											setSelectedItems(new Set(allUuids));
										}
									}}
								>
									{filteredMemories.every(
										(item) => item.type === "space" || selectedItems.has(item.uuid),
									)
										? "Deselect All"
										: "Select All"}
								</Button>
								<Button
									variant="destructive"
									onClick={handleBatchDelete}
									disabled={selectedItems.size === 0 || isDeleting}
								>
									<Trash2 className="w-4 h-4 mr-2" />
									{isDeleting ? "Deleting..." : `Delete Selected (${selectedItems.size})`}
								</Button>
							</>
						)}
					</>
				)}
			</div>
		),
		[
			isSelectionMode,
			selectedItems.size,
			isDeleting,
			handleBatchDelete,
			selectedVariant,
			filteredMemories,
			selectedItems,
		],
	);

	const MobileVariantButton = useMemo(
		() => (
			<Button
				className="md:hidden w-full mb-2"
				onClick={() => setIsMobileMenuOpen((prev) => !prev)}
			>
				{selectedVariant} ▼
			</Button>
		),
		[selectedVariant],
	);

	const MobileVariantMenu = useMemo(
		() => (
			<div
				className={cn(
					"md:hidden overflow-hidden transition-all duration-300 rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
					isMobileMenuOpen ? "max-h-[500px] shadow-lg" : "max-h-0",
				)}
			>
				<div className="flex flex-col gap-2 p-2">
					{variants
						.filter((variant) => !(isSpace && variant === "Spaces"))
						.map((variant) => (
							<Button
								key={variant}
								variant="ghost"
								onClick={() => handleVariantClick(variant)}
								className={cn(
									"text-muted-foreground hover:bg-accent hover:text-foreground text-base w-full py-4 rounded-lg transition-colors",
									selectedVariant === variant
										? "bg-accent text-foreground font-medium shadow-sm"
										: "hover:shadow-sm",
								)}
							>
								{variant}
							</Button>
						))}
				</div>
			</div>
		),
		[selectedVariant, isMobileMenuOpen, handleVariantClick, isSpace],
	);

	const DesktopVariantMenu = useMemo(
		() => (
			<div className="hidden md:flex">
				{variants
					.filter((variant) => !(isSpace && variant === "Spaces"))
					.map((variant) => (
						<Button
							key={variant}
							variant="ghost"
							onClick={() => setSelectedVariant(variant)}
							className={cn(
								"text-muted-foreground hover:bg-accent hover:text-foreground text-base",
								selectedVariant === variant ? "bg-accent text-foreground" : "",
							)}
						>
							{variant}
						</Button>
					))}
			</div>
		),
		[selectedVariant, isSpace],
	);

	if (!isHydrated) return null;

	return (
		<SelectionContext.Provider value={selectionContextValue}>
			<div className="min-h-screen p-2 md:p-4">
				<div className="mb-4">
					{MobileVariantButton}
					{MobileVariantMenu}
					{DesktopVariantMenu}
				</div>

				{SelectionControls}

				<Masonry
					key={key}
					id="memories-masonry"
					items={items}
					// @ts-ignore
					render={renderCard}
					columnGutter={16}
					columnWidth={Math.min(270, window.innerWidth - 32)}
					onRender={maybeLoadMore}
				/>

				{isLoading && <div className="py-4 text-center text-muted-foreground">Loading more...</div>}
			</div>
		</SelectionContext.Provider>
	);
}

export default MemoriesPage;
