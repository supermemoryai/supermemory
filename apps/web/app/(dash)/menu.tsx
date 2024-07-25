"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
	MemoriesIcon,
	ExploreIcon,
	CanvasIcon,
	AddIcon,
	HomeIcon as HomeIconWeb,
} from "@repo/ui/icons";
import { Button } from "@repo/ui/shadcn/button";
import { MinusIcon, PlusCircleIcon } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/shadcn/dialog";
import { Label } from "@repo/ui/shadcn/label";
import { Textarea } from "@repo/ui/shadcn/textarea";
import { toast } from "sonner";
import { getSpaces } from "../actions/fetchers";
import { HomeIcon } from "@heroicons/react/24/solid";
import { createMemory, createSpace } from "../actions/doers";
import ComboboxWithCreate from "@repo/ui/shadcn/combobox";
import { StoredSpace } from "@/server/db/schema";
import useMeasure from "react-use-measure";

function Menu() {
	const [spaces, setSpaces] = useState<StoredSpace[]>([]);

	useEffect(() => {
		(async () => {
			let spaces = await getSpaces();

			if (!spaces.success || !spaces.data) {
				toast.warning("Unable to get spaces", {
					richColors: true,
				});
				setSpaces([]);
				return;
			}
			setSpaces(spaces.data);
		})();
	}, []);

	const menuItems = [
		{
			icon: HomeIconWeb,
			text: "Home",
			url: "/home",
			disabled: false,
		},
		{
			icon: MemoriesIcon,
			text: "Memories",
			url: "/memories",
			disabled: false,
		},
	];

	const [content, setContent] = useState("");
	const [selectedSpaces, setSelectedSpaces] = useState<number[]>([]);

	const autoDetectedType = useMemo(() => {
		if (content.length === 0) {
			return "none";
		}

		if (
			content.match(/https?:\/\/(x\.com|twitter\.com)\/[\w]+\/[\w]+\/[\d]+/)
		) {
			return "tweet";
		} else if (content.match(/https?:\/\/[\w\.]+/)) {
			return "page";
		} else if (content.match(/https?:\/\/www\.[\w\.]+/)) {
			return "page";
		} else {
			return "note";
		}
	}, [content]);

	const [dialogOpen, setDialogOpen] = useState(false);

	const options = useMemo(
		() =>
			spaces.map((x) => ({
				label: x.name,
				value: x.id.toString(),
			})),
		[spaces],
	);

	const handleSubmit = async (content?: string, spaces?: number[]) => {
		setDialogOpen(false);

		toast.info("Creating memory...", {
			icon: <PlusCircleIcon className="w-4 h-4 text-white animate-spin" />,
			duration: 7500,
		});

		if (!content || content.length === 0) {
			toast.error("Content is required");
			return;
		}

		console.log(spaces);

		const cont = await createMemory({
			content: content,
			spaces: spaces ?? undefined,
		});

		setContent("");
		setSelectedSpaces([]);

		if (cont.success) {
			toast.success("Memory created", {
				richColors: true,
			});
		} else {
			toast.error(`Memory creation failed: ${cont.error}`);
		}
	};

	return (
		<>
			{/* Desktop Menu */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<div className="hidden lg:flex fixed h-screen pb-20 w-full p-4 items-center justify-start top-0 left-0 pointer-events-none z-[39]">
					<div className="pointer-events-auto group flex w-14 text-foreground-menu text-[15px] font-medium flex-col items-start gap-6 overflow-hidden rounded-[28px] border-2 border-border bg-secondary px-3 py-4 duration-200 hover:w-40 z-[99999]">
						<div className="border-b border-border pb-4 w-full">
							<DialogTrigger
								className={`flex w-full text-white brightness-75 hover:brightness-125 focus:brightness-125  cursor-pointer items-center gap-3 px-1 duration-200 justify-start`}
							>
								<Image
									src={AddIcon}
									alt="Logo"
									width={24}
									height={24}
									className="hover:brightness-125 focus:brightness-125 duration-200 text-white"
								/>
								<p className="opacity-0 duration-200 group-hover:opacity-100">
									Add
								</p>
							</DialogTrigger>
						</div>
						{menuItems.map((item) => (
							<Link
								aria-disabled={item.disabled}
								href={item.disabled ? "#" : item.url}
								key={item.url}
								className={`flex w-full ${
									item.disabled
										? "cursor-not-allowed opacity-30"
										: "text-white brightness-75 hover:brightness-125 cursor-pointer"
								} items-center gap-3 px-1 duration-200 hover:scale-105 active:scale-90 justify-start`}
							>
								<Image
									src={item.icon}
									alt={`${item.text} icon`}
									width={24}
									height={24}
									className="hover:brightness-125 duration-200"
								/>
								<p className="opacity-0 duration-200 group-hover:opacity-100">
									{item.text}
								</p>
							</Link>
						))}
					</div>
				</div>

				<DialogContent className="sm:max-w-[475px] text-[#F2F3F5] rounded-2xl bg-background z-[39]">
					<form
						action={async (e: FormData) => {
							const content = e.get("content")?.toString();

							await handleSubmit(content, selectedSpaces);
						}}
						className="flex flex-col gap-4 "
					>
						<DialogHeader>
							<DialogTitle>Add memory</DialogTitle>
							<DialogDescription className="text-[#F2F3F5]">
								A "Memory" is a bookmark, something you want to remember.
							</DialogDescription>
						</DialogHeader>

						<div>
							<Label htmlFor="name">Resource (URL or content)</Label>
							<Textarea
								className={`bg-[#2F353C] text-[#DBDEE1] max-h-[35vh] overflow-auto  focus-visible:ring-0 border-none focus-visible:ring-offset-0 mt-2 ${/^https?:\/\/\S+$/i.test(content) && "text-[#1D9BF0] underline underline-offset-2"}`}
								id="content"
								name="content"
								rows={8}
								placeholder="Start typing a note or paste a URL here. I'll remember it."
								value={content}
								onChange={(e) => setContent(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleSubmit(content, selectedSpaces);
									}
								}}
							/>
						</div>

						<div>
							<Label className="space-y-1" htmlFor="space">
								<h3 className="font-semibold text-lg tracking-tight">
									Spaces (Optional)
								</h3>
								<p className="leading-normal text-[#F2F3F5] text-sm">
									A space is a collection of memories. It's a way to organise
									your memories.
								</p>
							</Label>

							<ComboboxWithCreate
								options={spaces.map((x) => ({
									label: x.name,
									value: x.id.toString(),
								}))}
								onSelect={(v) =>
									setSelectedSpaces((prev) => {
										if (v === "") {
											return [];
										}
										return [...prev, parseInt(v)];
									})
								}
								onSubmit={async (spaceName) => {
									const space = options.find((x) => x.label === spaceName);
									toast.info("Creating space...");

									if (space) {
										toast.error("A space with that name already exists.");
									}

									const creationTask = await createSpace(spaceName);
									if (creationTask.success && creationTask.data) {
										toast.success("Space created " + creationTask.data);
										setSpaces((prev) => [
											...prev,
											{
												name: spaceName,
												id: creationTask.data!,
												createdAt: new Date(),
												user: null,
												numItems: 0,
											},
										]);
										setSelectedSpaces((prev) => [...prev, creationTask.data!]);
									} else {
										toast.error(
											"Space creation failed: " + creationTask.error ??
												"Unknown error",
										);
									}
								}}
								placeholder="Select or create a new space."
								className="bg-[#2F353C] h-min rounded-md mt-4 mb-4"
							/>

							<div>
								{selectedSpaces.length > 0 && (
									<div className="flex flex-row flex-wrap gap-0.5 h-min">
										{[...new Set(selectedSpaces)].map((x, idx) => (
											<button
												key={x}
												type="button"
												onClick={() =>
													setSelectedSpaces((prev) =>
														prev.filter((y) => y !== x),
													)
												}
												className={`relative group p-2 py-3 bg-[#3C464D] max-w-32 ${
													idx === selectedSpaces.length - 1
														? "rounded-br-xl"
														: ""
												}`}
											>
												<p className="line-clamp-1">
													{spaces.find((y) => y.id === x)?.name}
												</p>
												<div className="absolute h-full right-0 top-0 p-1 opacity-0 group-hover:opacity-100 items-center">
													<MinusIcon className="w-6 h-6 rounded-full bg-secondary" />
												</div>
											</button>
										))}
									</div>
								)}
							</div>
						</div>

						<DialogFooter>
							<Button
								disabled={autoDetectedType === "none"}
								variant={"secondary"}
								type="submit"
							>
								Save {autoDetectedType != "none" && autoDetectedType}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>

				{/* Mobile Menu */}
				<div className="lg:hidden fixed bottom-0 left-0 w-full p-4 bg-secondary z-50 border-t-2 border-border">
					<div className="flex justify-around items-center">
						<Link
							href={"/"}
							className={`flex flex-col items-center text-white ${"cursor-pointer"}`}
						>
							<HomeIcon width={24} height={24} />
							<p className="text-xs text-foreground-menu mt-2">Home</p>
						</Link>

						<DialogTrigger
							className={`flex flex-col items-center cursor-pointer text-white`}
						>
							<Image
								src={AddIcon}
								alt="Logo"
								width={24}
								height={24}
								className="hover:brightness-125 focus:brightness-125 duration-200 stroke-white"
							/>
							<p className="text-xs text-foreground-menu mt-2">Add</p>
						</DialogTrigger>
						{menuItems.slice(1, 2).map((item) => (
							<Link
								aria-disabled={item.disabled}
								href={item.disabled ? "#" : item.url}
								key={item.url}
								className={`flex flex-col items-center ${
									item.disabled
										? "opacity-50 cursor-not-allowed"
										: "cursor-pointer"
								}`}
								onClick={(e) => item.disabled && e.preventDefault()}
							>
								<Image
									src={item.icon}
									alt={`${item.text} icon`}
									width={24}
									height={24}
								/>
								<p className="text-xs text-foreground-menu mt-2">{item.text}</p>
							</Link>
						))}
					</div>
				</div>
			</Dialog>
		</>
	);
}

export default Menu;
