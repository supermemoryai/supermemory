import * as ReactTweet from "react-tweet";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";

import { NotionIcon } from "../icons/IntegrationIcons";
import { CustomTwitterComp } from "../twitter/render-tweet";
import { Button, ButtonProps } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	DropdownMenuGroup,
} from "../ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";

import { FileIcon } from "@radix-ui/react-icons";
import { SpaceIcon } from "@supermemory/shared/icons";
import { FastAverageColor } from "fast-average-color";
import { MenuIcon, TrashIcon } from "lucide-react";
import { pastelColors } from "~/lib/constants/pastelColors";
import { typeIcons } from "~/lib/constants/typeIcons";
import { ExtraSpaceMetaData, fetchSpaces } from "~/lib/hooks/use-spaces";
import { useTextOverflow } from "~/lib/hooks/use-text-overflow";
import { Memory, WebsiteMetadata } from "~/lib/types/memory";
import { cn } from "~/lib/utils";
import Loader from "../ui/Loader";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TweetSkeleton } from "react-tweet";

const { useTweet } = ReactTweet;

export const typeDecider = (content: string) => {
	try {
		// If it's a tweet URL
		if (content.match(/https?:\/\/(x\.com|twitter\.com)\/[\w]+\/[\w]+\/[\d]+/)) {
			return "tweet";
		}
		// If it's a document
		if (content.match(/\.(pdf|doc|docx|txt|rtf|odt|md)/i)) {
			return "document";
		}
		// If it's a Notion URL
		if (content.match(/https?:\/\/(www\.)?notion\.so/)) {
			return "notion";
		}
		// If it's any other URL
		if (content.match(/^(https?:\/\/)?(www\.)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(\/.*)?$/i)) {
			return "page";
		}
		// Otherwise it's a note
		return "note";
	} catch (e) {
		console.error("[Decide Type Error]", e);
		return "note";
	}
};

// Create a cache to store fetched metadata
const metadataCache: Record<string, WebsiteMetadata> = {};

const renderContent = {
	tweet: ({ data: ourData }: { data: Memory }) => {
		// If content starts with <raw>, parse the JSON inside
		if (ourData.content?.startsWith("<raw>")) {
			const rawContent = ourData.content.replace(/<\/?raw>/g, "");
			try {
				const parsedData = JSON.parse(rawContent);
				return <CustomTwitterComp tweet={parsedData} />;
			} catch (error) {
				console.error("Error parsing raw tweet data:", error);
				return <div className="p-4 text-muted-foreground">Error parsing tweet data</div>;
			}
		}

		// Otherwise use normal tweet ID flow
		const tweetId = ourData.content?.match(/\/status\/(\d+)/)?.[1] ?? ourData.content;
		const { data, error } = useTweet(tweetId ?? undefined);

		if (error) {
			console.error("Error parsing tweet:", error);
			console.log("Tweet ID:", tweetId);
			return <div className="p-4 text-muted-foreground">Error parsing tweet</div>;
		}

		if (!data || typeof data == "undefined") {
			return <TweetSkeleton />;
		}

		return <CustomTwitterComp tweet={data} />;
	},

	page: ({ data }: { data: Memory }) => (
		<WebsiteCard
			url={data.url ?? ""}
			title={data.title}
			description={data.description}
			image={data.ogImage}
		/>
	),

	note: ({ data }: { data: Memory }) => {
		const { contentRef, showFade } = useTextOverflow(data.content ?? "", 5);

		// Use a constant color for id 0, otherwise select based on content length
		const color = useMemo(
			() =>
				data.id === 0
					? pastelColors[0]
					: pastelColors[(data.content?.length ?? 0) % pastelColors.length],
			[data.content, data.id],
		);

		const formattedDate = new Date(data.createdAt).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});

		return (
			<div
				style={{ backgroundColor: color }}
				className="text-lg rounded-2xl relative p-8 font-semibold"
			>
				<p ref={contentRef} className="text-card-foreground line-clamp-4">
					{data.content}
				</p>
				{showFade && <div className="fade-overlay"></div>}

				<div className="flex justify-between items-center mt-8 ">
					<div className="text-slate-500 font-normal text-base">{formattedDate}</div>

					<a className="rounded-full bg-black text-white p-2" href="#">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="size-3"
						>
							<path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
						</svg>
					</a>
				</div>
			</div>
		);
	},

	notion: ({ data }: { data: Memory }) => {
		const { contentRef, showFade } = useTextOverflow(data.content ?? "", 5);
		const formattedDate = new Date(data.createdAt).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});

		return (
			<div className="text-lg rounded-2xl relative p-8 font-semibold bg-[#F7F6F3] dark:bg-neutral-900">
				<div className="flex items-center gap-2 mb-4">
					<NotionIcon className="w-5 h-5" />
					<span className="text-sm font-medium text-gray-800 dark:text-gray-200">Notion Page</span>
				</div>

				<p
					ref={contentRef}
					className="text-card-foreground line-clamp-4 text-gray-900 dark:text-gray-100"
				>
					{data.content}
				</p>
				{showFade && <div className="fade-overlay"></div>}

				<div className="flex justify-between items-center mt-8">
					<div className="text-gray-500 dark:text-gray-400 font-normal text-base">
						{formattedDate}
					</div>

					<a
						href={data.url ?? "#"}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-full bg-black dark:bg-white text-white dark:text-black p-2 hover:opacity-80 transition-opacity"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="size-3"
						>
							<path
								fillRule="evenodd"
								d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
								clipRule="evenodd"
							/>
						</svg>
					</a>
				</div>
			</div>
		);
	},

	space: ({ data }: { data: Memory & Partial<ExtraSpaceMetaData> }) => {
		return (
			<a
				href={`${data.url}`}
				className="flex flex-col gap-2 p-6 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-800 rounded-3xl"
			>
				<div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
					<SpaceIcon className="h-4 w-4" />
					<span className="text-sm font-medium">Space</span>
				</div>

				<h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-2">{data.content}</h3>

				<div className="flex flex-col gap-3 mt-4">
					<div className="flex items-center gap-2">
						{data.isSuccessfullyProcessed ? (
							<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									className="w-4 h-4"
								>
									<path
										fillRule="evenodd"
										d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm7.75 9.75a.75.75 0 0 0 0-1.5h-4.5a.75.75 0 0 0 0 1.5h4.5Z"
										clipRule="evenodd"
									/>
								</svg>
								Public Space
							</div>
						) : (
							<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									className="w-4 h-4"
								>
									<path
										fillRule="evenodd"
										d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
										clipRule="evenodd"
									/>
								</svg>
								Private Space
							</div>
						)}

						{data.favorited && (
							<div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 font-medium">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									className="w-4 h-4"
								>
									<path
										fillRule="evenodd"
										d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
										clipRule="evenodd"
									/>
								</svg>
								Favorited
							</div>
						)}
					</div>

					{data.owner ? (
						<>
							<div className="flex flex-wrap gap-2">
								{data.permissions?.canRead && !data.permissions.canEdit && (
									<div className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
										Can Read
									</div>
								)}
								{data.permissions?.canEdit && (
									<div className="text-xs px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
										Can Edit
									</div>
								)}
							</div>

							<div className="flex items-center gap-2 mt-1">
								{data.owner.profileImage ? (
									<img
										src={data.owner.profileImage}
										alt={data.owner.name}
										className="w-6 h-6 rounded-full"
									/>
								) : (
									<div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
								)}
								<span className="text-sm text-gray-600 dark:text-gray-300">{data.owner.name}</span>
							</div>
						</>
					) : null}
				</div>
			</a>
		);
	},

	document: ({ data }: { data: Memory }) => {
		// just render the document like normally
		// and get the name from the url

		// TODO: This can be improved
		return (
			<a
				href={data.url ?? ""}
				className="block p-4 rounded-3xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
			>
				<div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
					<FileIcon className="h-5 w-5 flex-shrink-0" />
					<div className="flex flex-col min-w-0">
						<span className="text-sm font-medium text-gray-500 dark:text-gray-400">Document</span>
						<span className="text-base font-medium text-gray-900 dark:text-white mt-0.5">
							{decodeURIComponent(data.url?.split("/").pop() ?? "")}
						</span>
					</div>
				</div>
			</a>
		);
	},
};

async function fetchWebsiteMetadata(url: string): Promise<WebsiteMetadata> {
	// Check if metadata is already in cache
	if (metadataCache[url]) {
		return metadataCache[url];
	}

	// Add http:// if not present
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		url = "http://" + url;
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`, {
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error("Failed to fetch metadata");
		}

		const metadata = (await response.json()) as WebsiteMetadata;

		if (metadata.image) {
			try {
				const fac = new FastAverageColor();
				const color = await fac.getColorAsync(metadata.image, {
					algorithm: "dominant",
					crossOrigin: "anonymous",
					mode: "speed",
				});
				metadata.dominantColor = color.hex;
				metadata.isDark = color.isDark;
			} catch (error) {
				console.error("Error getting dominant color:", error);
				// Fallback to a default color if there's an error
				metadata.dominantColor = "#CFCFCF";
				metadata.isDark = false;
			}
		} else {
			metadata.dominantColor = "#CFCFCF";
			metadata.isDark = false;
		}

		// Store the fetched metadata in cache
		metadataCache[url] = metadata;
		return metadata;
	} catch (error) {
		console.error("Error fetching metadata:", error);
		return {
			title: "Unknown",
			description: "No description available",
			image: "",
			dominantColor: "#CFCFCF",
			isDark: false,
		};
	}
}

const WebsiteCard = memo(({
	url,
	title,
	description,
	image,
}: {
	url: string;
	title?: string | null;
	description?: string | null;
	image?: string | null;
}) => {
	// Memoize domain extraction to avoid recalculation
	const domain = useMemo(() => {
		try {
			let formattedUrl = url;
			if (!formattedUrl.startsWith("http")) {
				formattedUrl = "http://" + formattedUrl;
			}
			return new URL(formattedUrl).hostname.replace(/^www\./, "");
		} catch {
			return url;
		}
	}, [url]);

	// Memoize initial color based on URL
	const initialColor = useMemo(() => {
		if (!image) {
			const hash = url.split("").reduce((acc, char) => {
				return char.charCodeAt(0) + ((acc << 5) - acc);
			}, 0);
			return `hsl(${hash % 360}, 70%, 85%)`; // Slightly lighter base color
		}
		return "#f0f0f0"; // Lighter default color
	}, [url, image]);

	const [dominantColor, setDominantColor] = useState(initialColor);
	const [isDark, setIsDark] = useState(false);
	// Only calculate dominant color when component is in view
	useEffect(() => {
		if (image) {
			const fac = new FastAverageColor();
			fac.getColorAsync(image, {
				algorithm: "dominant",
				crossOrigin: "anonymous",
				mode: "speed",
			})
				.then((color) => {
					setDominantColor(color.hex);
					setIsDark(color.isDark);
				})
				.catch((error) => {
					console.error("Error getting dominant color:", error);
				});
		}
	}, [image]);

	const displayTitle = title || domain;
	const displayDescription = description || `Saved from ${domain}`;

	return (
		<div className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
			<div className="relative">
				{image && (
					<div className="relative h-40">
						<img
							src={image}
							alt={displayTitle}
							className="absolute inset-0 w-full h-full object-cover"
							loading="lazy"
							style={{ backgroundColor: dominantColor }}
						/>
						<div
							className="absolute inset-0"
							style={{
								background: `linear-gradient(to bottom, transparent 40%, ${dominantColor} 100%)`,
							}}
						/>
					</div>
				)}
				<div
					className={cn(
						"p-5 relative",
						!image && "rounded-lg",
						isDark ? "text-white/90" : "text-black/90",
					)}
					style={{
						backgroundColor: dominantColor,
						marginTop: image ? "-2.5rem" : 0,
					}}
				>
					<h3 className="text-lg font-semibold tracking-tight">{displayTitle}</h3>
					<p className="mt-2 line-clamp-2 text-sm opacity-80">
						{displayDescription}
					</p>
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-3 inline-flex items-center gap-1 text-sm hover:underline opacity-70 hover:opacity-100 transition-opacity"
						style={{
							color: isDark ? "white" : "black",
						}}
					>
						<span>{domain}</span>
						<svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
					</a>
				</div>
			</div>
		</div>
	);
});

export function FetchAndRenderContent({ content }: { content: string }) {
	const [memory, setMemory] = useState<Memory | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		(async () => {
			const type = typeDecider(content);

			if (type !== "page") {
				const item: Memory = {
					type: type,
					content: content,
					createdAt: new Date(),
					description: null,
					id: 0,
					ogImage: null,
					title: null,
					url: null,
					uuid: "",
					updatedAt: null,
					raw: null,
					userId: 0,
					isSuccessfullyProcessed: true,
					errorMessage: null,
					contentHash: null,
				};
				setMemory(item);
				return;
			}

			try {
				setIsLoading(true);
				const metadata = await fetchWebsiteMetadata(content);

				const item: Memory = {
					type: type,
					content: content,
					createdAt: new Date(),
					description: metadata?.description ?? null,
					id: 0,
					ogImage: metadata?.image ?? null,
					title: metadata?.title ?? null,
					url: content,
					uuid: "",
					updatedAt: null,
					raw: null,
					userId: 0,
					isSuccessfullyProcessed: true,
					errorMessage: null,
					contentHash: null,
				};
				setMemory(item);
			} catch (error) {
				// If metadata fetch fails, create memory with basic URL info
				const item: Memory = {
					type: type,
					content: content,
					createdAt: new Date(),
					description: null,
					id: 0,
					ogImage: null,
					title: content,
					url: content,
					uuid: "",
					updatedAt: null,
					raw: null,
					userId: 0,
					isSuccessfullyProcessed: false,
					errorMessage: null,
					contentHash: null,
				};
				setMemory(item);
			} finally {
				setIsLoading(false);
				clearTimeout(timeoutId);
			}
		})();

		return () => {
			clearTimeout(timeoutId);
			controller.abort();
		};
	}, [content]);

	if (isLoading) {
		return <div className="p-4 text-muted-foreground">Loading website metadata...</div>;
	}

	return memory ? <SharedCard data={memory} /> : null;
}


function SharedCard({ data }: { data: Memory }) {
	const queryClient = useQueryClient();

	// Delete mutation
	const deleteMutation = useMutation({
		mutationFn: async (id: number) => {
			const response = await fetch(`/backend/api/memories/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (!response.ok) {
				throw new Error('Failed to delete memory');
			}
			return response.json();
		},
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: ['memories'] });
			
			// Snapshot the previous value
			const previousMemories = queryClient.getQueryData(['memories']);
			
			// Optimistically remove the memory
			queryClient.setQueryData(['memories'], (old: any) => {
				return old?.filter((memory: Memory) => memory.id !== id);
			});
			
			return { previousMemories };
		},
		onError: (err, variables, context) => {
			// Revert the optimistic update
			queryClient.setQueryData(['memories'], context?.previousMemories);
			toast.error('Failed to delete memory');
		},
		onSuccess: () => {
			toast.success('Memory deleted successfully');
			queryClient.invalidateQueries({ queryKey: ['memories'] });
		}
	});

	// Move to space mutation
	const moveToSpaceMutation = useMutation({
		mutationFn: async ({ spaceId, documentId }: { spaceId: string, documentId: string }) => {
			const response = await fetch('/backend/api/spaces/addContent', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({ spaceId, documentId })
			});
			if (!response.ok) {
				throw new Error('Failed to move memory');
			}
			return response.json();
		},
		onError: (err) => {
			toast.error('Failed to move memory to space');
		},
		onSuccess: () => {
			toast.success('Memory moved successfully');
			queryClient.invalidateQueries({ queryKey: ['memories'] });
			queryClient.invalidateQueries({ queryKey: ['spaces'] });
		}
	});

	// Flatten the data if it's a nested array and get the first item
	if (Array.isArray(data)) {
		console.log("weird data here, will try flattening.", data);
		data = data.flat(Infinity)[0];
	}

	const ContentRenderer =
		renderContent[data.type as keyof typeof renderContent] ||
		(() => {
			console.log("SharedCard data", data);
			return (
				<div>
					Unsupported content type: {typeof data.type === "undefined" ? "undefined" : data.type}
				</div>
			);
		});

	const handleDelete = (e: Event) => {
		e.preventDefault();
		e.stopPropagation();
		deleteMutation.mutate(data.id);
	};

	const handleMoveToSpace = (spaceId: string) => {
		moveToSpaceMutation.mutate({
			spaceId,
			documentId: data.uuid
		});
	};

	return (
		<div
			className={cn(
				`relative overflow-hidden rounded-3xl border bg-card`,
				(() => {
					switch (data.type) {
						case "note":
							return "border-primary/30";
						case "document":
							return "border-secondary/30";
						default:
							return "border-accent/30";
					}
				})(),
			)}
		>
			<a href={`/content/${data.uuid}`}>
				{data.type !== "space" && data.type !== "document" && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-gray-900/70 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 shadow-sm/50 backdrop-blur-[2px] border border-gray-200/30 dark:border-gray-700/30">
								<MenuIcon className="h-4 w-4" />
							</div>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>Move to ...</DropdownMenuSubTrigger>
								<DropdownMenuPortal>
									<MemoizedSpaceSelector contentId={data.id} onSelect={handleMoveToSpace} />
								</DropdownMenuPortal>
							</DropdownMenuSub>
							<DropdownMenuItem onSelect={e => handleDelete(e)} asChild>
								<Button className="w-full gap-2 flex" variant={"destructive"}>
									<TrashIcon className="h-4 w-4" /> Delete
								</Button>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
				<ContentRenderer data={data} />
			</a>
		</div>
	);
}

export const SpaceSelector = function SpaceSelector({ 
	contentId, 
	onSelect 
}: { 
	contentId: number;
	onSelect: (spaceId: string) => void;
}) {
	const [search, setSearch] = useState("");
	const { data: spacesData, isLoading, error } = useQuery({
		queryKey: ['spaces'],
		queryFn: fetchSpaces,
		staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
	});

	const filteredSpaces = useMemo(() => {
		if (!spacesData?.spaces) return [];
		return spacesData.spaces.filter(space => 
			space.name.toLowerCase().includes(search.toLowerCase())
		);
	}, [spacesData?.spaces, search]);

	if (isLoading) {
		return (
			<DropdownMenuSubContent>
				<DropdownMenuItem disabled>
					<div className="flex items-center gap-2">
						<Loader />
						Loading spaces...
					</div>
				</DropdownMenuItem>
			</DropdownMenuSubContent>
		);
	}

	if (error) {
		return (
			<DropdownMenuSubContent>
				<DropdownMenuItem disabled>
					<div className="text-destructive">Error: {error instanceof Error ? error.message : 'Failed to load spaces'}</div>
				</DropdownMenuItem>
			</DropdownMenuSubContent>
		);
	}

	return (
		<DropdownMenuSubContent className="p-0">
			<Command>
				<CommandInput 
					placeholder="Search spaces..." 
					value={search}
					onValueChange={setSearch}
				/>
				<CommandList className="max-h-[200px] overflow-y-auto">
					<CommandGroup>
						{filteredSpaces.map((space) => (
							<CommandItem 
								key={space.uuid} 
								value={space.name}
								onSelect={() => onSelect(space.uuid)}
							>
								<div className="flex items-center gap-2">
									<SpaceIcon className="h-4 w-4" />
									{space.name}
								</div>
							</CommandItem>
						))}
						{filteredSpaces.length === 0 && (
							<CommandEmpty>No spaces found.</CommandEmpty>
						)}
					</CommandGroup>
				</CommandList>
			</Command>
		</DropdownMenuSubContent>
	);
};

const MemoizedSpaceSelector = memo(SpaceSelector);

export default SharedCard;