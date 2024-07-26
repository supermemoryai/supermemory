"use client";

import { Content, StoredSpace } from "@/server/db/schema";
import { MemoriesIcon, NextIcon, SearchIcon, UrlIcon } from "@repo/ui/icons";
import {
	ArrowLeftIcon,
	MenuIcon,
	MoveIcon,
	NotebookIcon,
	PaperclipIcon,
	TrashIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Masonry from "react-layout-masonry";
import { getRawTweet } from "@repo/shared-types/utils";
import { MyTweet } from "../../../components/twitter/render-tweet";
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
} from "@repo/ui/shadcn/dropdown-menu";
import { Button } from "@repo/ui/shadcn/button";
import { addUserToSpace, deleteItem, moveItem } from "@/app/actions/doers";
import { toast } from "sonner";
import { Input } from "@repo/ui/shadcn/input";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

export function MemoriesPage({
	memoriesAndSpaces,
	title = "Your Memories",
	currentSpace,
	usersWithAccess,
}: {
	memoriesAndSpaces: { memories: Content[]; spaces: StoredSpace[] };
	title?: string;
	currentSpace?: StoredSpace;
	usersWithAccess?: string[];
}) {
	const searchParams = useSearchParams();

	const tab = searchParams.get("tab");

	const initialFilter = useMemo(() => {
		if (tab === "spaces") return "Spaces";
		if (tab === "pages") return "Pages";
		if (tab === "notes") return "Notes";
		if (tab === "tweet") return "Tweet";
		return "All";
	}, [tab]);

	const [filter, setFilter] = useState(initialFilter);

	// Sort Both memories and spaces by their savedAt and createdAt dates respectfully.
	// The output should be just one single list of items
	// And it will look something like { item: "memory" | "space", date: Date, data: Content | StoredSpace }
	const sortedItems = useMemo(() => {
		// Merge the lists
		const unifiedItems = [
			...memoriesAndSpaces.memories.map((memory) => ({
				item: "memory",
				date: new Date(memory.savedAt), // Assuming savedAt is a string date
				data: memory,
			})),
			...memoriesAndSpaces.spaces.map((space) => ({
				item: "space",
				date: new Date(space.createdAt), // Assuming createdAt is a string date
				data: space,
			})),
		].map((item) => ({
			...item,
			date: Number(item.date), // Convert the date to a number
		}));

		// Sort the merged list
		return unifiedItems
			.filter((item) => {
				if (filter === "All") return true;
				if (filter === "Spaces" && item.item === "space") {
					return true;
				}
				if (filter === "Pages")
					return (
						item.item === "memory" && (item.data as Content).type === "page"
					);
				if (filter === "Notes")
					return (
						item.item === "memory" && (item.data as Content).type === "note"
					);
				if (filter === "Tweet")
					return (
						item.item === "memory" && (item.data as Content).type === "tweet"
					);
				return false;
			})
			.sort((a, b) => b.date - a.date);
	}, [memoriesAndSpaces.memories, memoriesAndSpaces.spaces, filter]);

	return (
		<div
			key={`${memoriesAndSpaces.memories.length + memoriesAndSpaces.spaces.length}`}
			className="px-2 md:px-32 py-36 h-full flex mx-auto w-full flex-col gap-6"
		>
			{currentSpace && (
				<Link href={"/memories"} className="flex gap-2 items-center">
					<ArrowLeftIcon className="w-3 h-3" /> Back to all memories
				</Link>
			)}

			<h2 className="text-white w-full text-3xl text-left font-semibold">
				{title}
			</h2>
			{currentSpace && (
				<div className="flex flex-col gap-2">
					<div className="flex gap-4 items-center">
						Space
						<div className="flex items-center gap-2 bg-secondary p-2 rounded-xl">
							<Image src={MemoriesIcon} alt="Spaces icon" className="w-3 h-3" />
							<span className="text-[#fff]">{currentSpace.name}</span>
						</div>
					</div>

					{usersWithAccess && usersWithAccess.length > 0 && (
						<div className="flex gap-4 items-center">
							Users with access
							<div className="flex gap-2">
								{usersWithAccess.map((user) => (
									<div className="flex items-center gap-2 bg-secondary p-2 rounded-xl">
										<Image
											src={UrlIcon}
											alt="Spaces icon"
											className="w-3 h-3"
										/>
										<span className="text-[#fff]">{user}</span>
									</div>
								))}
							</div>
						</div>
					)}

					<form
						action={async (e: FormData) => {
							const email = e.get("email")?.toString();

							if (!email) {
								toast.error("Please enter an email");
								return;
							}

							const resp = await addUserToSpace(email, currentSpace.id);

							if (resp.success) {
								toast.success("User added to space");
							} else {
								toast.error("Failed to add user to space");
							}
						}}
						className="flex gap-2 max-w-xl mt-2"
					>
						<Input name="email" placeholder="Add user by email" />
						<Button variant="secondary">Add</Button>
					</form>
				</div>
			)}

			<Filters
				setFilter={setFilter}
				filter={filter}
				filterMethods={
					currentSpace ? SpaceFilterMethods : MemoriesFilterMethods
				}
			/>

			<Masonry
				className="mt-6 relative"
				columns={{ 640: 1, 768: 2, 1024: 3 }}
				gap={16}
				columnProps={{
					className: "min-w-[calc(33.3333%-16px)] w-full",
				}}
			>
				{sortedItems.map((item) => {
					if (item.item === "memory") {
						return (
							<LinkComponent
								type={(item.data as Content).type ?? "note"}
								content={(item.data as Content).content}
								title={(item.data as Content).title ?? "Untitled"}
								url={
									(item.data as Content).baseUrl ?? (item.data as Content).url
								}
								image={
									(item.data as Content).ogImage ??
									(item.data as Content).image ??
									"/placeholder-image.svg" // TODO: add this placeholder
								}
								description={(item.data as Content).description ?? ""}
								spaces={memoriesAndSpaces.spaces}
								id={(item.data as Content).id}
							/>
						);
					}

					if (item.item === "space") {
						return (
							<TabComponent
								title={(item.data as StoredSpace).name}
								description={`${(item.data as StoredSpace).numItems} memories`}
								id={(item.data as StoredSpace).id}
							/>
						);
					}

					return null;
				})}
			</Masonry>
		</div>
	);
}

function TabComponent({
	title,
	description,
	id,
}: {
	title: string;
	description: string;
	id: number;
}) {
	return (
		<Link
			href={`/space/${id}`}
			className="flex flex-col gap-4 bg-[#161f2a]/30 backdrop-blur-md border-2 border-border w-full rounded-xl p-4"
		>
			<div className="flex items-center gap-2 text-xs">
				<Image alt="Spaces icon" src={MemoriesIcon} className="size-3" /> Space
			</div>
			<div className="flex items-center">
				<div>
					<div className="h-12 w-12 flex justify-center items-center rounded-md">
						{title.slice(0, 2).toUpperCase()} {id}
					</div>
				</div>
				<div className="grow px-4">
					<div className="text-lg text-[#fff] line-clamp-2">{title}</div>
					<div>{description}</div>
				</div>
				<div>
					<Image src={NextIcon} alt="Search icon" />
				</div>
			</div>
		</Link>
	);
}

function LinkComponent({
	type,
	content,
	title,
	url,
	image,
	description,
	spaces,
	id,
}: {
	type: string;
	content: string;
	title: string;
	url: string;
	image?: string;
	description: string;
	spaces: StoredSpace[];
	id: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className={`bg-secondary group relative border-2 border-border rounded-xl ${type === "tweet" ? "" : "p-4"} hover:scale-105 transition duration-200`}
		>
			<Link
				href={url.replace("https://supermemory.ai", "").split("#")[0] ?? "/"}
				target="_blank"
			>
				{type === "page" ? (
					<>
						<div className="flex items-center gap-2 text-xs">
							<PaperclipIcon className="w-3 h-3" /> Page
						</div>
						{/* remove `<---chunkId: ${vector.id}\n${content}\n---->` pattern from title */}
						<div className="text-lg text-[#fff] mt-4 line-clamp-2">
							{title.replace(/(<---chunkId: .*?\n.*?\n---->)/g, "")}
						</div>
						<div className="overflow-hidden text-ellipsis whitespace-nowrap">
							{url.replace("https://supermemory.ai", "").split("#")[0] ?? "/"}
						</div>
					</>
				) : type === "note" ? (
					<>
						<div className="flex items-center gap-2 text-xs">
							<NotebookIcon className="w-3 h-3" /> Note
						</div>
						<div className="text-lg text-[#fff] mt-4 line-clamp-2">
							{title.replace(/(<---chunkId: .*?\n.*?\n---->)/g, "")}
						</div>
						<div className="line-clamp-3 mt-2">
							{content.replace(title, "")}
						</div>
					</>
				) : type === "tweet" ? (
					<MyTweet tweet={JSON.parse(getRawTweet(content) ?? "{}")} />
				) : null}
			</Link>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger className="top-5 right-5 absolute opacity-0 group-focus:opacity-100 group-hover:opacity-100 transition duration-200">
					<MenuIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{spaces.length > 0 && (
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<MoveIcon className="mr-2 h-4 w-4" />
								<span>Add to space</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									{spaces.map((space) => (
										<DropdownMenuItem>
											<button
												className="w-full h-full"
												onClick={async () => {
													toast.info("Adding to space...");

													const response = await moveItem(id, [space.id]);

													if (response.success) {
														toast.success("Moved to space");
														console.log("Moved to space");
													} else {
														toast.error("Failed to move to space");
														console.error("Failed to move to space");
													}
												}}
											>
												{space.name}
											</button>
										</DropdownMenuItem>
									))}
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
					)}
					<DropdownMenuItem asChild>
						<Button
							onClick={async () => {
								await deleteItem(id);
							}}
							variant="destructive"
							className="w-full"
						>
							<TrashIcon className="mr-2 h-4 w-4" />
							Delete
						</Button>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</motion.div>
	);
}

const MemoriesFilterMethods = ["All", "Spaces", "Pages", "Notes", "Tweet"];
const SpaceFilterMethods = ["All", "Pages", "Notes", "Tweet"];
function Filters({
	setFilter,
	filter,
	filterMethods,
}: {
	setFilter: (i: string) => void;
	filter: string;
	filterMethods: string[];
}) {
	return (
		<div className="flex gap-4 flex-wrap">
			{filterMethods.map((i) => {
				return (
					<button
						onClick={() => setFilter(i)}
						className={`transition px-6 py-2 rounded-xl bg-border ${i === filter ? " text-[#369DFD]" : "text-[#B3BCC5] bg-secondary hover:bg-secondary hover:text-[#76a3cc]"}`}
					>
						{i}
					</button>
				);
			})}
		</div>
	);
}

export default MemoriesPage;
