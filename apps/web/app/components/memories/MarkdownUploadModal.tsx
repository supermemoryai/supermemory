import { useEffect, useState } from "react";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import SpacesSelector from "./SpacesSelector";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Upload } from "lucide-react";
import { toast } from "sonner";

interface MarkdownUploadModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function MarkdownUploadModal({ isOpen, onClose }: MarkdownUploadModalProps) {
	const [files, setFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [progress, setProgress] = useState<{
		progress: number;
		processed: number;
		total: number;
		succeeded: number;
		failed: number;
		status: string;
	} | null>(null);
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = e.target.files;
		if (!selectedFiles) return;

		const mdFiles: File[] = [];
		const processFile = async (file: File) => {
			if (file.name.endsWith(".md")) {
				mdFiles.push(file);
			}
		};

		// Handle both individual files and directory
		const files = Array.from(selectedFiles);
		await Promise.all(files.map(processFile));

		if (mdFiles.length === 0) {
			toast.error("No markdown files found");
			return;
		}

		setFiles(mdFiles);
		toast.success(`Found ${mdFiles.length} markdown files`);
	};

	const handleUpload = async () => {
		if (files.length === 0) return;

		setIsUploading(true);
		const progressToastId = toast.loading("Starting markdown import...");
		let lastToastTime = Date.now();

		try {
			// Convert markdown files to content
			const contents = await Promise.all(
				files.map(async (file) => {
					const content = await file.text();
					return {
						content,
						title: file.name.replace(".md", ""),
						type: "note",
					};
				}),
			);

			// Send to batch endpoint
			const response = await fetch("/backend/api/batch-add", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contents,
					spaces: selectedSpaces,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to start batch upload");
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No reader available");

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = new TextDecoder().decode(value);
				const lines = text.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(5));
							setProgress(data);

							// Update the main progress toast every 500ms
							const now = Date.now();
							if (now - lastToastTime > 500) {
								toast.loading(
									`Processing files: ${data.processed}/${data.total} (${data.progress}%)`,
									{ id: progressToastId },
								);
								lastToastTime = now;
							}

							// Show individual file status toasts with a limit
							if (data.status === "success" && data.processed % 5 === 0) {
								toast.success(`Successfully imported ${data.processed} files so far`);
							} else if (data.status === "error") {
								toast.error(`Failed to import: ${data.title} - ${data.error}`);
							}

							if (data.status === "complete") {
								toast.success(
									`Import complete! ${data.succeeded} succeeded, ${data.failed} failed`,
									{ id: progressToastId, duration: 5000 },
								);

								// Wait for 2 seconds before closing
								await new Promise((resolve) => setTimeout(resolve, 2000));
								onClose();
								setFiles([]);
								setProgress(null);
								break;
							}
						} catch (e) {
							console.error("Error parsing SSE data:", e);
						}
					}
				}
			}
		} catch (error) {
			toast.error("Upload failed: " + (error instanceof Error ? error.message : "Unknown error"));
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={() => !isUploading && onClose()}>
			<DialogContent className="sm:max-w-md">
				{isUploading ? (
					<div className="text-center">
						{progress ? (
							<>
								<div className="relative">
									<div className="absolute inset-0 flex items-center justify-center">
										<span className="text-lg font-semibold text-blue-500">
											{progress.progress}%
										</span>
									</div>
									<svg className="size-20 md:size-24 -rotate-90 transform">
										<circle
											className="text-neutral-200 dark:text-neutral-700"
											strokeWidth="6"
											stroke="currentColor"
											fill="transparent"
											r="45"
											cx="48"
											cy="48"
										/>
										<circle
											className="text-blue-500 transition-all duration-300"
											strokeWidth="6"
											strokeDasharray={283}
											strokeDashoffset={283 - (283 * progress.progress) / 100}
											strokeLinecap="round"
											stroke="currentColor"
											fill="transparent"
											r="45"
											cx="48"
											cy="48"
										/>
									</svg>
								</div>
								<DialogTitle className="mt-4">
									Processing Files ({progress.processed}/{progress.total})
								</DialogTitle>
								<DialogDescription className="mt-2">
									{progress.succeeded} succeeded, {progress.failed} failed
								</DialogDescription>
							</>
						) : (
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
								className="w-12 h-12 mx-auto"
							>
								<Upload className="h-full w-full text-neutral-900 dark:text-white" />
							</motion.div>
						)}
					</div>
				) : (
					<div className="space-y-4">
						<DialogTitle>Import from Obsidian</DialogTitle>
						<DialogDescription>
							Upload markdown files from your Obsidian vault. You can select multiple files or drop
							a folder.
						</DialogDescription>

						<div className="flex flex-col gap-4">
							{/* Individual Files Selection */}
							<div className="flex flex-col items-center justify-center w-full">
								<label
									htmlFor="markdown-files-upload"
									className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-900 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800"
								>
									<div className="flex flex-col items-center justify-center pt-5 pb-6">
										<Upload className="w-6 h-6 mb-2 text-gray-500 dark:text-gray-400" />
										<p className="text-sm text-gray-500 dark:text-gray-400">
											<span className="font-semibold">Select Files</span>
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											Choose individual markdown files
										</p>
									</div>
									<input
										id="markdown-files-upload"
										type="file"
										className="hidden"
										accept=".md"
										multiple
										onChange={handleFileChange}
									/>
								</label>
							</div>

							<div className="text-center text-sm text-gray-500 dark:text-gray-400">OR</div>

							{/* Folder Selection */}
							<div className="flex flex-col items-center justify-center w-full">
								<label
									htmlFor="markdown-folder-upload"
									className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-900 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800"
								>
									<div className="flex flex-col items-center justify-center pt-5 pb-6">
										<Upload className="w-6 h-6 mb-2 text-gray-500 dark:text-gray-400" />
										<p className="text-sm text-gray-500 dark:text-gray-400">
											<span className="font-semibold">Select Folder</span>
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											Choose an entire folder
										</p>
									</div>
									<input
										id="markdown-folder-upload"
										type="file"
										className="hidden"
										accept=".md"
										multiple
										// @ts-ignore - webkitdirectory is a non-standard attribute
										webkitdirectory=""
										// @ts-ignore - directory is a non-standard attribute
										directory=""
										onChange={handleFileChange}
									/>
								</label>
							</div>
						</div>

						{files.length > 0 && (
							<>
								<div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 rounded border border-gray-200 dark:border-gray-700">
									<CheckCircle className="h-4 w-4 text-green-500" />
									<span className="text-sm text-gray-700 dark:text-gray-300">
										{files.length} markdown files selected
									</span>
								</div>

								<SpacesSelector selectedSpaces={selectedSpaces} onChange={setSelectedSpaces} />

								<div className="flex justify-end gap-2">
									<Button variant="outline" onClick={onClose}>
										Cancel
									</Button>
									<Button onClick={handleUpload}>Import</Button>
								</div>
							</>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
