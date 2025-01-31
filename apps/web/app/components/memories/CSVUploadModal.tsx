import { useEffect, useState } from "react";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import SpacesSelector from "./SpacesSelector";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Upload } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

interface CSVUploadModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function CSVUploadModal({ isOpen, onClose }: CSVUploadModalProps) {
	const [file, setFile] = useState<File | null>(null);
	const [urls, setUrls] = useState<string[]>([]);
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

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			if (!selectedFile.name.endsWith(".csv")) {
				toast.error("Please upload a CSV file");
				return;
			}
			setFile(selectedFile);

			// Parse CSV file
			Papa.parse(selectedFile, {
				complete: (results) => {
					// Find column containing URLs by checking first row
					const firstRow = results.data[0];
					let urlColumnIndex = -1;

					// Look for a column containing URLs in the header row
					// @ts-expect-error - firstRow is of type unknown
					firstRow.forEach((cell: string, index: number) => {
						if (
							cell?.toLowerCase().includes("url") ||
							(cell && typeof cell === "string" && cell.trim().startsWith("http"))
						) {
							urlColumnIndex = index;
						}
					});

					// If no URL column found in header, check first data row
					if (urlColumnIndex === -1 && results.data[1]) {
						// @ts-expect-error - results.data[1] is of type unknown
						results.data[1].forEach((cell: string, index: number) => {
							if (cell && typeof cell === "string" && cell.trim().startsWith("http")) {
								urlColumnIndex = index;
							}
						});
					}

					if (urlColumnIndex === -1) {
						toast.error("Could not find a column containing URLs");
						setFile(null);
						return;
					}

					// Extract URLs from the identified column
					const validUrls = results.data
						.slice(1) // Skip header row
						.map((row: any) => row[urlColumnIndex])
						.filter((url: string) => url && url.trim() && url.startsWith("http"));

					if (validUrls.length === 0) {
						toast.error("No valid URLs found in the CSV file");
						setFile(null);
						return;
					}

					setUrls(validUrls);
					toast.success(`Found ${validUrls.length} valid URLs in column ${urlColumnIndex + 1}`);
				},
				error: (error) => {
					toast.error("Error parsing CSV file: " + error.message);
					setFile(null);
				},
			});
		}
	};

	const handleUpload = async () => {
		if (!file || urls.length === 0) return;

		setIsUploading(true);
		try {
			const response = await fetch("/backend/v1/batch-add", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					urls,
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

							if (data.status === "complete") {
								toast.success(
									`Batch upload complete! ${data.succeeded} succeeded, ${data.failed} failed`,
								);
								setTimeout(() => {
									onClose();
									setFile(null);
									setUrls([]);
									setProgress(null);
								}, 2000);
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
									Processing URLs ({progress.processed}/{progress.total})
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
						<DialogTitle>Upload CSV File</DialogTitle>
						<DialogDescription>
							Upload a CSV file containing URLs to add to your memories. The URLs should be in the
							first column.
						</DialogDescription>

						<div className="flex flex-col items-center justify-center w-full">
							<label
								htmlFor="csv-upload"
								className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-900 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800"
							>
								<div className="flex flex-col items-center justify-center pt-5 pb-6">
									<Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
									<p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
										<span className="font-semibold">Click to upload</span> or drag and drop
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">CSV files only</p>
								</div>
								<input
									id="csv-upload"
									type="file"
									className="hidden"
									accept=".csv"
									onChange={handleFileChange}
								/>
							</label>
						</div>

						{file && (
							<>
								<div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 rounded border border-gray-200 dark:border-gray-700">
									<CheckCircle className="h-4 w-4 text-green-500" />
									<span className="text-sm text-gray-700 dark:text-gray-300">
										{file.name} ({urls.length} URLs found)
									</span>
								</div>

								<SpacesSelector selectedSpaces={selectedSpaces} onChange={setSelectedSpaces} />

								<div className="flex justify-end gap-2">
									<Button variant="outline" onClick={onClose}>
										Cancel
									</Button>
									<Button onClick={handleUpload} disabled={urls.length === 0}>
										Upload
									</Button>
								</div>
							</>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
