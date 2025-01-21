import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Button } from "../ui/button";
import AddMemory from "./AddMemory";
import SharedCard from "./SharedCard";

import { Masonry, useInfiniteLoader } from "masonic";
import { useHydrated } from "remix-utils/use-hydrated";
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

function MemoriesPage({ showAddButtons = true, isSpace = false }: MemoriesPageProps) {
	const isHydrated = useHydrated();
	const { spaceId } = useParams();
	const [selectedVariant, setSelectedVariant] = useState<Variant>("All Memories");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const { memories, isLoading, loadMore, hasMore } = useMemories(0, 20, spaceId);

	const { spaces } = useSpaces();

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
		return spaces.map((space) => ({
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
		const shouldShowSpaces = !isSpace && (selectedVariant === "All Memories" || selectedVariant === "Spaces");
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

	const renderCard = useCallback(
		({ data, index }: { data: Memory; index: number }) => {
			if (index === 0 && showAddButtons) {
				return <AddMemory isSpace={isSpace} />;
			}
			return <SharedCard data={data} />;
		},
		[showAddButtons],
	);

	const handleVariantClick = useCallback((variant: Variant) => {
		setSelectedVariant(variant);
		setIsMobileMenuOpen(false);
	}, []);

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
					{variants.filter(variant => !(isSpace && variant === "Spaces")).map((variant) => (
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
				{variants.filter(variant => !(isSpace && variant === "Spaces")).map((variant) => (
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
		<div className="min-h-screen p-2 md:p-4">
			<div className="mb-4">
				{MobileVariantButton}
				{MobileVariantMenu}
				{DesktopVariantMenu}
			</div>

			<Masonry
				key={key + "memories"}
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
	);
}

export default MemoriesPage;
