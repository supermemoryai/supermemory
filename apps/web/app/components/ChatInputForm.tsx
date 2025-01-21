import { KeyboardEvent, useCallback, useRef, useState } from "react";

import { useFetcher, useLoaderData } from "@remix-run/react";

import { useUploadFile } from "../lib/hooks/use-upload-file";
import SpacesSelector from "./memories/SpacesSelector";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

import { SpaceIcon } from "@supermemory/shared/icons";
import { cn } from "~/lib/utils";
import { loader } from "~/routes/_index";

function MemoryInputForm({
	user,
	input,
	setInput,
	submit: externalSubmit,
	mini = false,
	fileURLs = [],
	setFileURLs,
	isLoading = false,
}: {
	user: ReturnType<typeof useLoaderData<typeof loader>>["user"];
	input: string;
	setInput: React.Dispatch<React.SetStateAction<string>>;
	submit: () => void;
	mini?: boolean;
	fileURLs?: string[];
	setFileURLs?: React.Dispatch<React.SetStateAction<string[]>>;
	isLoading?: boolean;
}) {
	const [previews, setPreviews] = useState<string[]>([]);
	const { uploadFile, isUploading } = useUploadFile();
	const fetcher = useFetcher();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragActive, setIsDragActive] = useState(false);
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);

	const submit = useCallback(() => {
		if (input.trim() || fileURLs.length > 0) {
			if (!isLoading) {
				externalSubmit();
				setInput("");
				setFileURLs?.([]);
				setPreviews([]);
			}
		}
	}, [externalSubmit, input, fileURLs.length, setInput, isLoading]);

	const handlePaste = useCallback(
		(e: React.ClipboardEvent<HTMLTextAreaElement>) => {
			const items = e.clipboardData.items;
			for (const item of items) {
				if (item.type.startsWith("image/") || item.type === "application/pdf") {
					const file = item.getAsFile();
					if (file) {
						if (isUploading || fileURLs.length !== previews.length) {
							console.log(
								"Cannot upload file: Upload in progress or previous upload not completed",
							);
							return;
						}
						if (fileURLs.length >= 5) {
							console.log("Maximum file limit reached");
							return;
						}
						handleFileUpload(file);
						break; // Only handle one file per paste
					}
				}
			}
		},
		[isUploading, fileURLs.length, previews.length],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				submit();
			}
		},
		[submit],
	);

	const handleAttachClick = useCallback(() => {
		if (isUploading || fileURLs.length !== previews.length) {
			console.log("Cannot attach file: Upload in progress or previous upload not completed");
			return;
		}
		if (fileInputRef.current) {
			fileInputRef.current.click();
			// For mobile Safari, we need to focus and blur to ensure the file picker opens
			fileInputRef.current.focus();
			fileInputRef.current.blur();
		}
	}, [isUploading, fileURLs.length, previews.length]);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files || []);
			const remainingSlots = 5 - fileURLs.length;
			files.slice(0, remainingSlots).forEach(handleFileUpload);
			e.target.value = "";
		},
		[fileURLs.length],
	);

	const handleFileUpload = useCallback(
		async (file: File) => {
			if (fileURLs.length >= 5) {
				console.log("Maximum file limit reached");
				return;
			}

			if (
				file.type !== "image/jpeg" &&
				file.type !== "image/png" &&
				file.type !== "application/pdf"
			) {
				console.error("Unsupported file type:", file.type);
				return;
			}

			const reader = new FileReader();
			reader.onload = (ev) => {
				const previewURL = ev.target?.result as string;
				if (previews.includes(previewURL)) {
					console.log("Duplicate file detected. Skipping upload.");
					return;
				}
				setPreviews((prev) => [...prev, previewURL]);
			};
			reader.readAsDataURL(file);

			try {
				const { url: fileURL, error } = await uploadFile(file);
				if (error) {
					console.error("File upload failed:", error);
					setPreviews((prev) => prev.filter((_, i) => i !== fileURLs.length));
					return;
				}
				if (fileURL) {
					const encodedURL = encodeURIComponent(fileURL);
					if (fileURLs.includes(encodedURL)) {
						console.log("Duplicate file URL detected. Skipping.");
						return;
					}
					setFileURLs?.((prev) => [...prev, encodedURL]);
				} else {
					console.error("File upload failed:", fileURL);
				}
			} catch (error) {
				console.error("File upload failed:", error);
			}
		},
		[fileURLs, previews, uploadFile],
	);

	const removeFile = useCallback((index: number) => {
		setFileURLs?.((prev) => prev.filter((_, i) => i !== index));
		setPreviews((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragActive(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		const relatedTarget = e.relatedTarget as Node | null;
		if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
			setIsDragActive(false);
		}
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragActive(false);

			const files = Array.from(e.dataTransfer.files);
			const remainingSlots = 5 - fileURLs.length;
			files.slice(0, remainingSlots).forEach(handleFileUpload);
		},
		[fileURLs.length, handleFileUpload],
	);

	return (
		<div
			className={cn(
				"rounded-2xl border border-gray-300 dark:border-neutral-700 bg-background shadow-lg focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-700",
				mini ? "fixed bottom-0 left-0 right-0 m-2 z-50" : "relative",
			)}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			<div
				className={cn(
					"transition-colors duration-200 ease-in-out rounded-t-2xl relative",
					isDragActive ? "bg-blue-50" : "bg-white dark:bg-neutral-700",
					mini && "flex flex-col md:flex-row items-center rounded-2xl",
				)}
			>
				<input
					type="file"
					accept="image/jpeg,image/png,application/pdf"
					ref={fileInputRef}
					onChange={handleFileChange}
					className="hidden"
					capture="environment"
					multiple
				/>
				<Textarea
					rows={1}
					placeholder="Ask your supermemory..."
					className={cn(
						"text-lg w-full rounded-t-2xl border-none px-4 md:px-8 py-4 md:py-6 shadow-none outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-within:outline-none min-h-[60px] resize-none",
						mini && "rounded-2xl",
					)}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					name="input"
				/>
				{mini && (
					<div className="flex items-center gap-2 p-2 md:px-4 w-full md:w-auto justify-end border-t md:border-t-0 border-gray-200 dark:border-neutral-600">
						<Button
							variant="outline"
							className="flex items-center gap-2 text-secondary-foreground hover:bg-gray-100 dark:hover:bg-neutral-600"
							onClick={handleAttachClick}
							disabled={fileURLs.length >= 5 || isUploading || fileURLs.length !== previews.length}
							aria-label="Attach file"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								className="w-5 h-5"
							>
								<path
									fillRule="evenodd"
									d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z"
									clipRule="evenodd"
								/>
							</svg>
						</Button>

						<Button
							onClick={submit}
							type="button"
							aria-label="Send message"
							className="bg-blue-500 text-white hover:bg-blue-600 dark:hover:bg-blue-700"
							disabled={
								isUploading ||
								fetcher.state !== "idle" ||
								(input.trim() === "" && fileURLs.length === 0) ||
								fileURLs.length !== previews.length ||
								isLoading
							}
						>
							{isLoading ? (
								<svg
									className="animate-spin h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									className="w-5 h-5"
								>
									<path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
								</svg>
							)}
						</Button>
					</div>
				)}
				{isDragActive && (
					<div className="absolute inset-0 flex items-center justify-center bg-blue-100 bg-opacity-50 rounded-2xl pointer-events-none">
						<p className="font-semibold text-blue-600">Drop files here...</p>
					</div>
				)}
			</div>

			{previews.length > 0 && (
				<div className="flex flex-wrap gap-2 p-4 border-t border-gray-200">
					{fileURLs.map((fileURL, index) => {
						const isPDF = previews[index].startsWith("data:application/pdf");
						return (
							<div
								key={index}
								className={cn(
									"relative group",
									fileURLs.length !== previews.length && "animate-pulse",
								)}
							>
								{isPDF ? (
									<a
										href={decodeURIComponent(fileURL)}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center justify-center gap-2 border border-border rounded-md p-2"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth={1.5}
											stroke="currentColor"
											className="size-6"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
											/>
										</svg>
										<span className="sr-only">Open PDF</span>

										{decodeURIComponent(fileURL).split("/").pop()}
									</a>
								) : (
									<img
										src={decodeURIComponent(fileURL)}
										alt={`Preview ${index + 1}`}
										className="h-16 w-16 md:h-24 md:w-24 object-cover rounded-lg"
									/>
								)}
								<button
									onClick={() => removeFile(index)}
									className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
								<input
									name={`uploadedFile-${index}`}
									type="file"
									className="hidden"
									src={decodeURIComponent(fileURL)}
									alt={`Preview ${index + 1}`}
								/>
							</div>
						);
					})}
					{fileURLs.length !== previews.length && previews[fileURLs.length] && (
						<>
							{previews[fileURLs.length].startsWith("data:application/pdf") ? (
								<div className="flex items-center justify-center gap-2 border border-border rounded-md p-2 bg-gray-200 opacity-50">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={1.5}
										stroke="currentColor"
										className="size-6 text-gray-400"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
										/>
									</svg>
									<span className="sr-only">Open PDF</span>
									<div>Uploading PDF...</div>
								</div>
							) : (
								<img
									src={previews[fileURLs.length]}
									alt={`Preview ${fileURLs.length + 1}`}
									className="h-16 w-16 md:h-24 md:w-24 object-cover rounded-lg animate-pulse opacity-50"
								/>
							)}
						</>
					)}
					{fileURLs.length !== previews.length && !previews[fileURLs.length] && (
						<div className="h-16 w-16 md:h-24 md:w-24 rounded-lg animate-pulse bg-gray-200" />
					)}
				</div>
			)}

			{!mini && (
				<div className="flex flex-row justify-between items-center px-4 md:px-6 py-4 bg-gray-50 dark:bg-neutral-700 rounded-b-2xl gap-2 md:gap-0">
					<Button
						variant="outline"
						className="flex items-center gap-2 text-secondary-foreground hover:bg-gray-100 dark:hover:bg-neutral-600"
						onClick={handleAttachClick}
						disabled={fileURLs.length >= 5 || isUploading || fileURLs.length !== previews.length}
						aria-label="Attach file"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="w-5 h-5"
						>
							<path
								fillRule="evenodd"
								d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z"
								clipRule="evenodd"
							/>
						</svg>
						<span className="hidden md:block">Attach ({fileURLs.length}/5)</span>
					</Button>

					<div className="flex items-center gap-4 w-full md:w-auto">
						<SpacesSelector selectedSpaces={selectedSpaces} onChange={setSelectedSpaces} />

						<Button
							onClick={submit}
							type="button"
							aria-label="Send message"
							className="flex-1 md:flex-none bg-blue-500 text-white hover:bg-blue-600 dark:hover:bg-blue-700"
							disabled={
								isUploading ||
								fetcher.state !== "idle" ||
								(input.trim() === "" && fileURLs.length === 0) ||
								fileURLs.length !== previews.length ||
								isLoading
							}
						>
							{isLoading ? (
								<svg
									className="animate-spin h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									className="w-5 h-5"
								>
									<path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
								</svg>
							)}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

export default MemoryInputForm;
