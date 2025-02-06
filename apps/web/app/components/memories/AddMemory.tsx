import React, { useEffect, useState } from "react";

import { Logo } from "../icons/Logo";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import Integrations from "./Integrations";
import { FetchAndRenderContent, typeDecider } from "./SharedCard";
import SpacesSelector from "./SpacesSelector";

import { FileIcon, Link1Icon, PlusCircledIcon } from "@radix-ui/react-icons";
import { SpaceIcon } from "@supermemory/shared/icons";
import { AnimatePresence, motion } from "framer-motion";
import { NotebookIcon, Plus, PuzzleIcon, Settings2Icon, Upload } from "lucide-react";
import { toast } from "sonner";
import {
	Credenza,
	CredenzaBody,
	CredenzaClose,
	CredenzaContent,
	CredenzaFooter,
	CredenzaHeader,
	CredenzaTitle,
	CredenzaTrigger,
} from "~/components/ui/credenza";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useDebounce } from "~/lib/hooks/use-debounce";
import { useMemories } from "~/lib/hooks/use-memories";
import { useSpaces } from "~/lib/hooks/use-spaces";
import { useUploadFile } from "~/lib/hooks/use-upload-file";
import { cn } from "~/lib/utils";

export function AddMemoryModal({
	children,
	spaceTab,
}: {
	children: React.ReactNode;
	spaceTab?: boolean;
}) {
	const [content, setContent] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"url" | "note" | "space" | "document" | "integrations"
	>(spaceTab ? "space" : "url");
	const [file, setFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);

	const [isPublic, setIsPublic] = useState(false);

	const { uploadFile } = useUploadFile();

	useEffect(() => {
		if (!spaceTab) {
			const validTabs = ["url", "note", "space", "document", "integrations"];
			const savedTab = window.localStorage.getItem("lastUsedMemoryTab");

			if (savedTab && validTabs.includes(savedTab)) {
				setActiveTab(savedTab as typeof activeTab);
			}
		}
	}, [spaceTab]);

	// Get space ID from URL if we're in a space
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>(() => {
		if (typeof window !== "undefined") {
			const match = window.location.pathname.match(/\/space\/([^\/]+)/);
			return match ? [match[1].split("---")[0]] : [];
		}
		return [];
	});

	const { createSpace, isCreating } = useSpaces();
	const { addMemory } = useMemories();

	// Debounce the content to avoid rapid type detection
	const debouncedContent = useDebounce(content, 500);

	// Reset content when switching tabs manually
	const handleTabChange = (value: string) => {
		setContent(null);
		setFile(null);
		setActiveTab(value as "url" | "note" | "space" | "document");
		window.localStorage.setItem("lastUsedMemoryTab", value);
	};

	const handleSubmit = async () => {
		if (activeTab === "document") {
			if (!file) return;

			setIsUploading(true);
			try {
				const { url } = await uploadFile(file);
				if (url) {
					addMemory({
						content: url,
						spaces: selectedSpaces,
					});
				}
			} catch (error) {
				console.error("Error uploading file:", error);
				toast.error("Failed to upload file");
			} finally {
				setIsUploading(false);
			}
		} else if (!content) {
			return;
		} else if (activeTab === "space") {
			try {
				createSpace({
					spaceName: content,
					isPublic,
				});
			} catch (error) {
				console.error("Error creating space:", error);
			}
		} else {
			try {
				console.log("Add memory run");
				addMemory({
					content,
					spaces: selectedSpaces,
				});
			} catch (error) {
				console.error("Error adding memory:", error);
			}
		}
		// click the close-memory-modal button
		const closeButton = document.getElementById("close-memory-modal");
		if (closeButton) {
			closeButton.click();
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
			// Create object URL for preview
			const fileUrl = URL.createObjectURL(selectedFile);
			setContent(fileUrl);
		}
	};

	return (
		<Credenza>
			<CredenzaTrigger asChild>{children}</CredenzaTrigger>
			<CredenzaContent className="md:w-[90%] lg:w-[80%] xl:w-[70%] max-w-full h-[80vh] shadow-md sm:rounded-xl overflow-hidden">
				<CredenzaHeader className="h-min">
					<CredenzaTitle className="mb-4">
						<div className="flex flex-row gap-2 items-center">
							<PlusCircledIcon className="h-4 w-4 mr-2" />
							Add Memory
						</div>
					</CredenzaTitle>
				</CredenzaHeader>
				<CredenzaBody className="w-full h-full grid grid-cols-1 lg:grid-cols-3 gap-2 overflow-y-auto">
					<Tabs
						value={activeTab}
						onValueChange={handleTabChange}
						className={cn(
							"max-w-full min-h-[400px] gap-4 flex flex-col md:flex-row lg:col-span-2 w-full",
							activeTab === "integrations" && "lg:col-span-3",
						)}
					>
						<TabsList className="border md:flex-col md:h-full h-max md:justify-start md:space-y-2 bg-[#FAFBFC] dark:bg-zinc-800 md:col-span-1 p-2 flex flex-row justify-between overflow-x-auto md:overflow-visible shrink-0 overflow-auto">
							<TabsTrigger
								className="w-full justify-start text-left px-4 py-3 rounded-lg border border-transparent data-[state=active]:border-indigo-500/20 data-[state=active]:bg-indigo-500/10 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex flex-col items-start gap-2 transition-all duration-200 hover:shadow-sm"
								id="url-tab"
								value="url"
							>
								<Link1Icon className="h-4 w-4 mr-2 text-indigo-500" />
								Website
								<span className="text-xs text-zinc-500 dark:text-zinc-300 hidden md:block">
									Add a website or tweet URL
								</span>
							</TabsTrigger>
							<TabsTrigger
								className="w-full justify-start text-left px-4 py-3 rounded-lg border border-transparent data-[state=active]:border-emerald-500/20 data-[state=active]:bg-emerald-500/10 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex flex-col items-start gap-2 transition-all duration-200 hover:shadow-sm"
								id="note-tab"
								value="note"
							>
								<NotebookIcon className="h-4 w-4 mr-2 text-emerald-500" />
								Note
								<span className="text-xs text-zinc-500 dark:text-zinc-300 hidden md:block">
									Add a note or use the rich editor
								</span>
							</TabsTrigger>
							<TabsTrigger
								className="w-full justify-start text-left px-4 py-3 rounded-lg border border-transparent data-[state=active]:border-amber-500/20 data-[state=active]:bg-amber-500/10 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex flex-col items-start gap-2 transition-all duration-200 hover:shadow-sm"
								id="document-tab"
								value="document"
							>
								<FileIcon className="h-4 w-4 mr-2 text-amber-500" />
								Document
								<span className="text-xs text-zinc-500 dark:text-zinc-300 hidden md:block">
									Upload a PDF or other document
								</span>
							</TabsTrigger>
							<TabsTrigger
								className="w-full justify-start text-left px-4 py-3 rounded-lg border border-transparent data-[state=active]:border-violet-500/20 data-[state=active]:bg-violet-500/10 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex flex-col items-start gap-2 transition-all duration-200 hover:shadow-sm"
								id="integrations-tab"
								value="integrations"
							>
								<PuzzleIcon className="h-4 w-4 mr-2 text-violet-500" />
								Integrations
								<span className="text-xs text-zinc-500 dark:text-zinc-300 hidden md:block">
									Import memories from third-party services
								</span>
							</TabsTrigger>
							<TabsTrigger
								className="w-full justify-start text-left px-4 py-3 rounded-lg border border-transparent data-[state=active]:border-rose-500/20 data-[state=active]:bg-rose-500/10 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex flex-col items-start gap-2 transition-all duration-200 hover:shadow-sm"
								id="space-tab"
								value="space"
							>
								<SpaceIcon className="h-4 w-4 mr-2 text-rose-500" />
								Create Space
								<span className="text-xs text-zinc-500 dark:text-zinc-300 hidden md:block">
									A collection of memories
								</span>
							</TabsTrigger>
						</TabsList>

						<div className="w-full overflow-y-auto">
							<TabsContent value="url">
								<form
									onSubmit={(e) => {
										e.preventDefault();
										handleSubmit();
									}}
								>
									<div className="flex flex-col gap-4 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-indigo-500/20 dark:border-indigo-500/20">
										<Label
											htmlFor="url"
											className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
										>
											Website or Tweet URL
										</Label>
										<Input
											value={content ?? ""}
											onChange={(e) => setContent(e.target.value)}
											className="text-lg p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-indigo-500 focus:border-indigo-500"
											id="url"
											autoFocus
											placeholder="https://supermemory.ai"
											autoComplete="off"
										/>

										{/* Additional note */}
										<div className="hidden md:flex text-sm text-zinc-600 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-md p-3 bg-zinc-50 dark:bg-zinc-900 items-center justify-between shadow-sm">
											<span className="text-sm">
												Pro tip:{" "}
												<a
													className="underline text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300"
													href="https://supermemory.ai/extension"
												>
													Use our Chrome extension
												</a>{" "}
												to save websites and tweets instantly
											</span>
										</div>

										<SpacesSelector selectedSpaces={selectedSpaces} onChange={setSelectedSpaces} />
									</div>
								</form>
							</TabsContent>
							<TabsContent value="note">
								<form
									onSubmit={(e) => {
										e.preventDefault();
										handleSubmit();
									}}
								>
									<div className="flex flex-col gap-4 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-emerald-500/20 dark:border-emerald-500/20">
										<Label
											htmlFor="note"
											className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
										>
											Note
										</Label>
										<Textarea
											autoFocus
											value={content ?? ""}
											onChange={(e) => setContent(e.target.value)}
											className="text-lg p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-emerald-500 focus:border-emerald-500 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:dark:bg-zinc-900"
											id="note"
											placeholder="Add a note"
										/>
										<SpacesSelector selectedSpaces={selectedSpaces} onChange={setSelectedSpaces} />
										{/* TODO: will show this later */}
										{/* <div className="hidden md:flex text-sm border border-blue-500/20 rounded-md p-4 bg-blue-500/10 dark:bg-blue-500/5 flex-row gap-4 justify-between items-center shadow-sm">
											<span className="font-medium text-zinc-900 dark:text-zinc-100">
												You can also use the rich editor to write your note.
											</span>
											<Button
												variant="link"
												className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
												asChild
											>
												<a href="/editor">Use Editor</a>
											</Button>
										</div> */}
									</div>
								</form>
							</TabsContent>
							<TabsContent value="space">
								{/* Ask for space name */}
								<div className="flex flex-col gap-4 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-rose-500/20 dark:border-rose-500/20">
									<Label
										htmlFor="spaceName"
										className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
									>
										Create a space
									</Label>
									<Input
										id="spaceName"
										placeholder="Enter a name for your space"
										className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:dark:bg-zinc-900"
										value={content ?? ""}
										onChange={(e) => setContent(e.target.value)}
										autoFocus
									/>

									<div className="flex flex-col gap-2">
										<div className="flex items-center space-x-2">
											<Switch
												className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-700 dark:data-[state=checked]:bg-emerald-500 bg-zinc-200 dark:bg-zinc-700"
												id="isPublic"
												onCheckedChange={setIsPublic}
											/>
											<Label htmlFor="isPublic">Public</Label>
										</div>
										{isPublic && (
											<div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="14"
													height="14"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
													<line x1="12" y1="9" x2="12" y2="13" />
													<line x1="12" y1="17" x2="12.01" y2="17" />
												</svg>
												When public, anyone with the link can view this space
											</div>
										)}
									</div>
								</div>
							</TabsContent>
							<TabsContent className="pb-12 md:pb-0" value="document">
								<div className="flex flex-col gap-4 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-amber-500/20 dark:border-amber-500/20">
									<Label
										htmlFor="file"
										className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
									>
										Upload Document
									</Label>

									<div className="flex flex-col items-center justify-center w-full">
										<label
											htmlFor="file-upload"
											className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-900 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800"
										>
											<div className="flex flex-col items-center justify-center pt-5 pb-6">
												<Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
												<p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
													<span className="font-semibold">Click to upload</span> or drag and drop
												</p>
												<p className="text-xs text-gray-500 dark:text-gray-400">
													PDF, DOC, DOCX (MAX. 10MB)
												</p>
											</div>
											<input
												id="file-upload"
												type="file"
												className="hidden"
												accept=".pdf,.doc,.docx"
												onChange={handleFileChange}
											/>
										</label>
									</div>

									{file && (
										<div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 rounded border border-gray-200 dark:border-gray-700">
											<FileIcon className="h-4 w-4 text-amber-500" />
											<span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
										</div>
									)}

									<SpacesSelector selectedSpaces={selectedSpaces} onChange={setSelectedSpaces} />
								</div>
							</TabsContent>
							<TabsContent value="integrations">
								<Integrations />
							</TabsContent>
						</div>
					</Tabs>
					{activeTab !== "integrations" && (
						<div className="hidden lg:block lg:col-span-1">
							<div className="md:h-full w-full relative overflow-hidden">
								<div className="absolute inset-0">
									{activeTab === "space" ? (
										<div className="relative bg-white dark:bg-zinc-900 rounded-lg">
											<div className="flex flex-col gap-4 h-full w-full p-8 border border-dashed border-rose-300/50 dark:border-rose-500/30 rounded-lg">
												<div className="absolute inset-0 after:content-[''] after:absolute after:inset-0 after:bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] after:bg-[size:24px_24px] after:[mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_60%,transparent_100%)] dark:after:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]" />

												<div className="relative text-2xl font-light text-zinc-900 dark:text-zinc-100 mt-16 flex items-center gap-2">
													<SpaceIcon className="w-8 h-8 text-rose-500 dark:text-rose-400" />
													Create a Space
												</div>
												<div className="relative text-base text-zinc-600 dark:text-zinc-300">
													Spaces help you organize your memories. Create a new space to start
													collecting related memories together.
												</div>
											</div>
										</div>
									) : activeTab === "document" && file ? (
										<div className="block p-4 rounded-3xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
											<div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
												<FileIcon className="h-5 w-5" />
												<div className="flex flex-col">
													<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
														Document
													</span>
													<span className="text-base font-medium text-gray-900 dark:text-white mt-0.5">
														{file.name}
													</span>
												</div>
											</div>
										</div>
									) : debouncedContent ? (
										<FetchAndRenderContent content={debouncedContent} />
									) : (
										<div className="relative bg-white dark:bg-zinc-900 rounded-lg">
											<div className="flex flex-col gap-4 h-full w-full p-8 border border-dashed border-zinc-300/50 dark:border-zinc-500/30 rounded-lg">
												<div className="absolute inset-0 after:content-[''] after:absolute after:inset-0 after:bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] after:bg-[size:24px_24px] after:[mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_60%,transparent_100%)] dark:after:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]" />

												<div className="relative text-2xl font-light text-zinc-900 dark:text-zinc-100 mt-16">
													Create a Memory
												</div>
												<div className="relative text-base text-zinc-600 dark:text-zinc-300">
													Add your first memory to start building your knowledge base. You will see
													a preview here.
												</div>
											</div>
										</div>
									)}
								</div>
								<div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-[#2B2B2B] to-transparent pointer-events-none" />
							</div>
						</div>
					)}
				</CredenzaBody>
				<CredenzaFooter className="border-t">
					<div className="flex justify-between w-full">
						<CredenzaClose asChild>
							<Button id="close-memory-modal" variant="outline">
								Cancel
							</Button>
						</CredenzaClose>
						<Button onClick={handleSubmit} disabled={!content && !file} className="relative">
							{isUploading ? (
								<>
									<span className="opacity-0">
										Add {activeTab === "space" ? "Space" : "Memory"}
									</span>
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									</div>
								</>
							) : (
								<>Add {activeTab === "space" ? "Space" : "Memory"}</>
							)}
						</Button>
					</div>
				</CredenzaFooter>
			</CredenzaContent>
		</Credenza>
	);
}

function AddMemory({ isSpace = false }: { isSpace?: boolean }) {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);

		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return (
		<div className={`flex ${isMobile ? "flex-col gap-4" : ""} w-full`}>
			<motion.div
				className={`flex ${isMobile ? "h-[100px]" : "h-[220px]"} w-full flex-col rounded-2xl items-start justify-start border-2 border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 hover:border-gray-400 dark:hover:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700 group`}
				whileHover={
					!isMobile
						? {
								scale: 1.05,
								opacity: 0.9,
								boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
							}
						: {}
				}
				whileTap={isMobile ? { scale: 0.95 } : {}}
				transition={{
					type: "spring",
					stiffness: 260,
					damping: 20,
				}}
			>
				<div
					className={
						isMobile
							? "flex flex-col items-center justify-center w-full h-full"
							: "group-hover:hidden"
					}
				>
					{isMobile ? (
						<AddMemoryModal>
							<div className="flex flex-col items-center">
								<Logo className="h-8 w-8 text-rgray-10 dark:text-white" />
								<span className="dark:text-white text-sm">Add Memory</span>
							</div>
						</AddMemoryModal>
					) : (
						<>
							<Plus className="h-12 w-12 text-black dark:text-white" />
							<div className="text-xl font-medium text-black dark:text-white p-2">
								Add to your second brain.
							</div>
							<div className="text-md text-neutral-500 dark:text-neutral-400 p-2 pr-4">
								Add a link, a note, a document, tweet, etc.
							</div>
						</>
					)}
				</div>

				<div
					className={`${isMobile ? "hidden" : "hidden group-hover:flex"} items-center justify-between h-full p-2 w-full`}
				>
					<AddMemoryModal>
						<div className="md:h-full p-4 rounded-md hover:bg-white dark:hover:bg-neutral-900 hover:border hover:border-border min-w-[47%] flex flex-col items-center justify-center cursor-pointer">
							<Logo className="h-12 w-12 text-rgray-10 dark:text-white" />
							<span className="dark:text-white">Memory</span>
						</div>
					</AddMemoryModal>
					{!isSpace && (
						<AddMemoryModal spaceTab={true}>
							<div className="h-full p-4 rounded-md hover:bg-white dark:hover:bg-neutral-900 hover:border hover:border-border min-w-[47%] flex flex-col items-center justify-center">
								<SpaceIcon className="h-12 w-12" />
								<span className="dark:text-white">Space</span>
							</div>
						</AddMemoryModal>
					)}
				</div>
			</motion.div>
			{isMobile && !isSpace && (
				<AddMemoryModal spaceTab={true}>
					<motion.div
						className="flex h-[100px] w-full flex-col gap-2 rounded-2xl items-center justify-center border-2 border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 hover:border-gray-400 dark:hover:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer"
						whileTap={{ scale: 0.95 }}
					>
						<SpaceIcon className="h-8 w-8" />
						<span className="dark:text-white text-sm">Create Space</span>
					</motion.div>
				</AddMemoryModal>
			)}
		</div>
	);
}

export default AddMemory;
