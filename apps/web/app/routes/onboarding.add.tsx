import { useEffect, useMemo, useState } from "react";

import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";

import { Logo } from "../components/icons/Logo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Theme, useTheme } from "../lib/theme-provider";

import { FileIcon, Link1Icon } from "@radix-ui/react-icons";
import { authkitLoader, authLoader } from "@supermemory/authkit-remix-cloudflare";
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session";
import { motion } from "framer-motion";
import { NotebookIcon, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useMemories } from "~/lib/hooks/use-memories";
import { useUploadFile } from "~/lib/hooks/use-upload-file";

export const loader = (args: LoaderFunctionArgs) => authkitLoader(args, { ensureSignedIn: true });

const SUGGESTED_IMPORTS = [
	{
		title: "How to take smart notes",
		url: "https://blog.andymatuschak.org/post/how-to-take-smart-notes/",
		description: "Learn the fundamentals of note-taking",
	},
	{
		title: "Building a Second Brain",
		url: "https://fortelabs.co/blog/basboverview/",
		description: "A method for saving and systematizing your knowledge",
	},
	{
		title: "Spaced Repetition",
		url: "https://ncase.me/remember/",
		description: "Interactive guide to remembering anything",
	},
];

export default function OnboardingAdd() {
	const [theme, setTheme] = useTheme();
	const navigate = useNavigate();
	const [content, setContent] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [activeTab, setActiveTab] = useState<"url" | "note" | "document">("url");
	const { addMemory } = useMemories();
	const { uploadFile } = useUploadFile();

	const handleSubmit = async () => {
		try {
			navigate("/onboarding/import");
			if (activeTab === "document" && file) {
				const { url } = await uploadFile(file);
				if (url) {
					await addMemory({
						content: url,
						spaces: [],
					});
				}
			} else if (content) {
				await addMemory({
					content,
					spaces: [],
				});
			}
		} catch (error) {
			console.error("Error adding memory:", error);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
		}
	};

	useEffect(() => {
		setTheme(Theme.DARK);
	}, []);

	// Pre-calculate background orbs positions once on mount
	const backgroundOrbs = useMemo(() => {
		return [...Array(4)].map((_, i) => ({
			id: i,
			color: i % 2 === 0 ? "#3b82f6" : "#4f46e5",
			width: 300 + i * 50,
			height: 300 + i * 50,
			x: [200 + i * 100, 400 + i * 100],
			y: [200 + i * 100, 400 + i * 100],
		}));
	}, []);

	return (
		<div className="flex flex-col min-h-screen items-center pt-20 relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
			{/* Background effects */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				{backgroundOrbs.map((orb) => (
					<motion.div
						key={orb.id}
						className="absolute rounded-full blur-3xl opacity-20"
						style={{
							background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
							width: orb.width,
							height: orb.height,
						}}
						initial={{ x: orb.x[0], y: orb.y[0] }}
						animate={{
							x: orb.x[1],
							y: orb.y[1],
						}}
						transition={{
							duration: 20,
							repeat: Infinity,
							repeatType: "reverse",
							ease: "linear",
						}}
					/>
				))}
			</div>

			{/* Logo */}
			<div className="flex flex-col gap-2 items-center font-geist italic text-5xl tracking-tight text-white z-10">
				<Logo className="h-24 w-24" /> supermemory
			</div>

			<div className="flex flex-col gap-8 items-center mt-12 text-white max-w-2xl px-4 z-10">
				<h1 className="text-2xl font-geist font-medium">Add your first memory</h1>

				<div className="w-full max-w-md">
					<Tabs
						value={activeTab}
						onValueChange={(v) => setActiveTab(v as typeof activeTab)}
						className="w-full"
					>
						<TabsList className="grid grid-cols-3 mb-4">
							<TabsTrigger value="url" className="data-[state=active]:bg-blue-500/20">
								<Link1Icon className="h-4 w-4 mr-2" />
								URL
							</TabsTrigger>
							<TabsTrigger value="note" className="data-[state=active]:bg-emerald-500/20">
								<NotebookIcon className="h-4 w-4 mr-2" />
								Note
							</TabsTrigger>
							<TabsTrigger value="document" className="data-[state=active]:bg-amber-500/20">
								<FileIcon className="h-4 w-4 mr-2" />
								Document
							</TabsTrigger>
						</TabsList>

						<TabsContent value="url">
							<div className="relative">
								<Link1Icon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<Input
									type="url"
									placeholder="Paste a URL to save"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									className="pl-12 h-10 bg-white/10 border-gray-700 text-white placeholder:text-gray-400 text-sm rounded-lg"
								/>
							</div>
						</TabsContent>

						<TabsContent value="note">
							<Textarea
								placeholder="Write a note..."
								value={content}
								onChange={(e) => setContent(e.target.value)}
								className="bg-white/10 border-gray-700 text-white placeholder:text-gray-400 min-h-[120px]"
							/>
						</TabsContent>

						<TabsContent value="document">
							<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white/5 border-gray-700 hover:bg-white/10">
								<div className="flex flex-col items-center justify-center pt-5 pb-6">
									<Upload className="w-8 h-8 mb-2 text-gray-400" />
									<p className="text-sm text-gray-400">
										<span className="font-medium">Click to upload</span> or drag and drop
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
							{file && (
								<div className="mt-2 flex items-center gap-2 p-2 bg-white/5 rounded border border-gray-700">
									<FileIcon className="h-4 w-4 text-amber-500" />
									<span className="text-sm text-gray-300">{file.name}</span>
								</div>
							)}
						</TabsContent>
					</Tabs>

					<motion.button
						onClick={handleSubmit}
						disabled={
							(!content && !file) ||
							(activeTab === "document" && !file) ||
							(activeTab !== "document" && !content)
						}
						className="relative border-none bg-transparent p-0 cursor-pointer outline-offset-4 transition-[filter] duration-250 select-none w-full mt-4"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						<span className="absolute top-0 left-0 w-full h-full rounded-lg bg-black/25 will-change-transform translate-y-0.5 transition-transform duration-600 ease-[cubic-bezier(.3,.7,.4,1)]" />
						<span className="absolute top-0 left-0 w-full h-full rounded-lg bg-gradient-to-r from-gray-800 to-gray-700" />
						<span className="block relative px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 will-change-transform -translate-y-1 transition-transform duration-600 ease-[cubic-bezier(.3,.7,.4,1)] hover:-translate-y-1.5 hover:transition-transform hover:duration-250 hover:ease-[cubic-bezier(.3,.7,.4,1.5)] active:-translate-y-0.5 active:transition-transform active:duration-[34ms]">
							Save Memory
						</span>
					</motion.button>
				</div>

				<div className="w-full max-w-md">
					<h2 className="text-lg font-medium mb-4">Suggested Imports</h2>
					<div className="grid gap-3">
						{SUGGESTED_IMPORTS.map((item, i) => (
							<button
								key={i}
								onClick={() => {
									setActiveTab("url");
									setContent(item.url);
								}}
								className="w-full flex flex-col gap-1 p-4 text-left rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-gray-700"
							>
								<h3 className="font-medium">{item.title}</h3>
								<p className="text-sm text-gray-400">{item.description}</p>
							</button>
						))}
					</div>
				</div>

				<div className="flex gap-4 mt-4 mb-12">
					<a href="/onboarding/import" className="text-gray-400 hover:text-gray-300 text-sm">
						Skip for now →
					</a>
				</div>
			</div>
		</div>
	);
}
