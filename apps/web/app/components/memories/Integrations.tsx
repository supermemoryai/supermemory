import { useEffect, useState } from "react";

import { useNavigate, useRouteLoaderData } from "@remix-run/react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { CSVUploadModal } from "./CSVUploadModal";
import { MarkdownUploadModal } from "./MarkdownUploadModal";

import { motion } from "framer-motion";
import {
	AlertCircle,
	BookIcon,
	CheckCircle,
	Clipboard,
	ClipboardCheckIcon,
	FileUpIcon,
	X,
} from "lucide-react";
import { toast } from "sonner";
import { type IntegrationConfig, getIntegrations } from "~/config/integrations";
import { getChromeExtensionId } from "~/config/util";
import { cn } from "~/lib/utils";
import { loader } from "~/root";

function IntegrationButton({
	integration,
	onClick,
}: {
	integration: IntegrationConfig;
	onClick: () => void;
}) {
	return (
		<Card
			className="group relative overflow-hidden transition-all hover:shadow-lg flex-1 basis-[calc(33.333%-1rem)]"
			onClick={onClick}
		>
			<div
				className={cn(
					"absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100",
					integration.buttonClassName,
				)}
			/>

			<div className="relative z-10 flex flex-col items-center gap-4 p-6">
				{integration.icon && (
					<div className="rounded-full bg-white/10 p-3">
						<integration.icon
							className={cn(
								"transition-transform group-hover:scale-110",
								integration.iconClassName,
							)}
						/>
					</div>
				)}

				<div className="text-center">
					<h3 className="font-semibold text-neutral-900 dark:text-white">{integration.name}</h3>
					<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 hidden md:block">
						{integration.description}
					</p>
				</div>
			</div>
		</Card>
	);
}

function LoadingIntegration({
	integration,
	onCancel,
}: {
	integration: IntegrationConfig;
	onCancel: () => void;
}) {
	const [extensionPresent, setExtensionPresent] = useState(false);
	const [importComplete, setImportComplete] = useState(false);

	useEffect(() => {
		if (integration.id === "xBookmarks") {
			try {
				// Listen for import complete message
				const handleMessage = (event: MessageEvent) => {
					if (event.data.type === "TWITTER_IMPORT_COMPLETE") {
						setImportComplete(true);
						// Auto close after 2 seconds
						setTimeout(() => {
							onCancel();
						}, 2000);
					}
				};

				window.addEventListener("message", handleMessage);

				// Check if extension is present
				chrome?.runtime.sendMessage(getChromeExtensionId(), { action: "ping" }, (response: any) => {
					setExtensionPresent(!chrome?.runtime.lastError);
				});

				return () => {
					window.removeEventListener("message", handleMessage);
				};
			} catch (e) {
				setExtensionPresent(false);
			}
		}
	}, [integration, onCancel]);

	return (
		<Dialog open onOpenChange={() => onCancel()}>
			<DialogContent className="sm:max-w-md">
				{integration.id === "xBookmarks" && !extensionPresent ? (
					<div className="text-center">
						<AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
						<DialogTitle className="mt-4">Extension Required</DialogTitle>
						<DialogDescription>
							Please install the SuperMemory extension to connect with X
						</DialogDescription>
						<Button variant="outline" onClick={onCancel} className="mt-4">
							Cancel
						</Button>
					</div>
				) : importComplete ? (
					<div className="text-center">
						<CheckCircle className="mx-auto h-12 w-12 text-green-500" />
						<DialogTitle className="mt-4">Import Complete!</DialogTitle>
						<DialogDescription>Your X bookmarks have been successfully imported.</DialogDescription>
					</div>
				) : (
					<div className="text-center">
						{integration.icon && (
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
								className="w-12 h-12 mx-auto"
							>
								<integration.icon className="h-full w-full text-neutral-900 dark:text-white" />
							</motion.div>
						)}
						<DialogTitle className="mt-4">Importing from {integration.name}...</DialogTitle>
						<DialogDescription className="mt-4">
							The import has started. It will keep going in the background. You can close this modal
							and enjoy supermemory! (You might need to reload to see the changes!)
						</DialogDescription>
						<Button variant="outline" onClick={onCancel} className="mt-4">
							Cancel
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function Integrations() {
	const navigate = useNavigate();
	const data = useRouteLoaderData<typeof loader>("root");
	const env = data?.ENV || {};
	const integrations = getIntegrations(env);
	const [loadingIntegration, setLoadingIntegration] = useState<IntegrationConfig | null>(null);
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
	const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState(false);

	const handleIntegrationClick = (integration: IntegrationConfig) => {
		setLoadingIntegration(integration);

		if (integration.handleConnection) {
			integration.handleConnection(env, navigate);
		} else if (integration.getAuthUrl) {
			const authUrl = integration.getAuthUrl(env);

			// Small delay to show the loading state
			setTimeout(() => {
				if (authUrl.startsWith(window.location.origin)) {
					navigate(new URL(authUrl).pathname);
				} else {
					window.location.href = authUrl;
				}
			}, 500);
		}
	};

	const getApiKey = async () => {
		const response = await fetch(`/backend/v1/user/key`, {
			credentials: "include",
		});
		if (response.ok) {
			const data = (await response.json()) as { key: string };
			setApiKey(data.key);
		} else {
			toast.error("Failed to fetch API key");
			console.error("Failed to fetch API key", response);
			return null;
		}
	};

	useEffect(() => {
		getApiKey();
	}, []);

	useEffect(() => {
		if (copied) {
			const timeout = setTimeout(() => {
				setCopied(false);
			}, 2000);
			return () => clearTimeout(timeout);
		}
	}, [copied]);

	return (
		<div className="container mx-auto px-4 py-8 md:py-16 max-w-full overflow-hidden">
			<div className="mb-8 md:mb-12 text-center">
				<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
					Import your content
				</h2>
				<p className="mt-3 text-base md:text-lg text-neutral-600 dark:text-neutral-400">
					Connect your favorite platforms to import your content into Supermemory
				</p>
			</div>

			<div className="max-w-full bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 mb-8">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
						Your API Key
					</span>
					{apiKey ? (
						<button
							onClick={() => {
								navigator.clipboard.writeText(apiKey);
								setCopied(true);
								toast.success("API key copied to clipboard!");
							}}
							className="flex-1 flex items-center gap-2 font-mono text-sm bg-white dark:bg-neutral-800 px-3 py-1.5 rounded group hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all overflow-hidden"
						>
							<span className="flex-shrink-0 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-all">
								{copied ? (
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								) : (
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
										/>
									</svg>
								)}
							</span>
							<span className="blur-sm group-hover:blur-none transition-all truncate max-w-[500px]">
								{apiKey}
							</span>
						</button>
					) : (
						<div className="flex-1 text-sm text-neutral-600 dark:text-neutral-400">Loading...</div>
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-4 overflow-x-auto">
				<Card
					className="group relative overflow-hidden transition-all hover:shadow-lg flex-1 basis-[calc(33.333%-1rem)]"
					onClick={() => setIsMarkdownModalOpen(true)}
				>
					<div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-r from-purple-500/10 to-purple-600/10" />
					<div className="relative z-10 flex flex-col items-center gap-4 p-6">
						<div className="rounded-full bg-white/10 p-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="w-6 h-6"
								preserveAspectRatio="xMidYMid"
								viewBox="0 0 256 332"
							>
								<defs>
									<radialGradient
										id="a"
										cx="72.819%"
										cy="96.934%"
										r="163.793%"
										fx="72.819%"
										fy="96.934%"
										gradientTransform="rotate(-104 11141.322 0)"
									>
										<stop offset="0%" stop-color="#FFF" stop-opacity=".4" />
										<stop offset="100%" stop-opacity=".1" />
									</radialGradient>
									<radialGradient
										id="b"
										cx="52.917%"
										cy="90.632%"
										r="190.361%"
										fx="52.917%"
										fy="90.632%"
										gradientTransform="rotate(-82 10746.75 0)"
									>
										<stop offset="0%" stop-color="#FFF" stop-opacity=".6" />
										<stop offset="100%" stop-color="#FFF" stop-opacity=".1" />
									</radialGradient>
									<radialGradient
										id="c"
										cx="31.174%"
										cy="97.138%"
										r="178.714%"
										fx="31.174%"
										fy="97.138%"
										gradientTransform="rotate(-77 10724.606 0)"
									>
										<stop offset="0%" stop-color="#FFF" stop-opacity=".8" />
										<stop offset="100%" stop-color="#FFF" stop-opacity=".4" />
									</radialGradient>
									<radialGradient
										id="d"
										cx="71.813%"
										cy="99.994%"
										r="92.086%"
										fx="71.813%"
										fy="99.994%"
										gradientTransform="translate(0 22251839.658) skewY(-90)"
									>
										<stop offset="0%" stop-color="#FFF" stop-opacity=".3" />
										<stop offset="100%" stop-opacity=".3" />
									</radialGradient>
									<radialGradient
										id="e"
										cx="117.013%"
										cy="34.769%"
										r="328.729%"
										fx="117.013%"
										fy="34.769%"
										gradientTransform="rotate(102 -1004.443 0)"
									>
										<stop offset="0%" stop-color="#FFF" stop-opacity="0" />
										<stop offset="100%" stop-color="#FFF" stop-opacity=".2" />
									</radialGradient>
									<radialGradient
										id="f"
										cx="-9.431%"
										cy="8.712%"
										r="153.492%"
										fx="-9.431%"
										fy="8.712%"
										gradientTransform="rotate(45 1674.397 0)"
									>
										<stop offset="0%" stop-color="#FFF" stop-opacity=".2" />
										<stop offset="100%" stop-color="#FFF" stop-opacity=".4" />
									</radialGradient>
									<radialGradient
										id="g"
										cx="103.902%"
										cy="-22.172%"
										r="394.771%"
										fx="103.902%"
										fy="-22.172%"
										gradientTransform="rotate(80 3757.522 0)"
									>
										<stop offset="0%" stop-color="#FFF" stop-opacity=".1" />
										<stop offset="100%" stop-color="#FFF" stop-opacity=".3" />
									</radialGradient>
									<radialGradient
										id="h"
										cx="99.348%"
										cy="89.193%"
										r="203.824%"
										fx="99.348%"
										fy="89.193%"
										gradientTransform="translate(0 -38783246.548) skewY(-90)"
									>
										<stop offset="0%" stop-color="#FFF" stop-opacity=".2" />
										<stop offset="50%" stop-color="#FFF" stop-opacity=".2" />
										<stop offset="100%" stop-color="#FFF" stop-opacity=".3" />
									</radialGradient>
								</defs>
								<path
									fill-opacity=".3"
									d="M209.056 308.305c-2.043 14.93-16.738 26.638-31.432 22.552-20.823-5.658-44.946-14.616-66.634-16.266l-33.317-2.515a22.002 22.002 0 0 1-14.144-6.522L6.167 246.778a21.766 21.766 0 0 1-4.244-24.124s35.36-77.478 36.775-81.485c1.257-4.008 6.13-39.211 8.958-58.07a22.002 22.002 0 0 1 7.072-12.965L122.462 9.47a22.002 22.002 0 0 1 31.903 2.672l57.048 71.978a23.18 23.18 0 0 1 4.872 14.38c0 13.594 1.179 41.646 8.8 59.72a236.756 236.756 0 0 0 27.974 45.732 11.001 11.001 0 0 1 .786 12.258c-4.95 8.408-14.851 24.595-28.76 45.26a111.738 111.738 0 0 0-16.108 46.834h.079Z"
								/>
								<path
									fill="#6C31E3"
									d="M209.606 305.79c-2.043 15.009-16.737 26.717-31.432 22.71-20.744-5.737-44.79-14.695-66.555-16.345L78.38 309.64a21.923 21.923 0 0 1-14.144-6.6L6.874 244.106a21.923 21.923 0 0 1-4.243-24.36s35.438-77.792 36.774-81.878c1.336-4.007 6.13-39.289 8.958-58.305a22.002 22.002 0 0 1 7.072-13.044L123.17 5.621a22.002 22.002 0 0 1 31.902 2.75l56.97 72.292a23.338 23.338 0 0 1 4.871 14.38c0 13.673 1.18 41.804 8.723 59.955a238.092 238.092 0 0 0 27.974 45.969 11.001 11.001 0 0 1 .864 12.336c-5.03 8.487-14.851 24.674-28.838 45.497a112.603 112.603 0 0 0-16.03 46.99Z"
								/>
								<path
									fill="url(#a)"
									d="M70.365 307.44c26.638-53.983 25.93-92.722 14.537-120.225-10.372-25.459-29.781-41.489-45.025-51.468a19.233 19.233 0 0 1-1.415 4.243L2.631 219.747a21.923 21.923 0 0 0 4.321 24.36l57.284 58.933a23.762 23.762 0 0 0 6.129 4.4Z"
								/>
								<path
									fill="url(#b)"
									d="M142.814 197.902a86.025 86.025 0 0 1 21.06 4.793c21.844 8.172 41.724 26.56 58.147 61.999 1.179-2.043 2.357-4.008 3.615-5.894a960.226 960.226 0 0 0 28.838-45.497 11.001 11.001 0 0 0-.786-12.336 238.092 238.092 0 0 1-28.052-45.969c-7.544-18.073-8.644-46.282-8.723-59.955 0-5.186-1.65-10.294-4.871-14.38l-56.97-72.292-.943-1.178c4.165 13.75 3.93 24.752 1.336 34.731-2.357 9.272-6.757 17.68-11.394 26.56-1.571 2.986-3.143 6.05-4.636 9.193a110.01 110.01 0 0 0-12.415 45.576c-.786 19.016 3.064 42.825 15.716 74.65h.078Z"
								/>
								<path
									fill="url(#c)"
									d="M142.736 197.902c-12.652-31.824-16.502-55.633-15.716-74.65.786-18.858 6.286-33.002 12.415-45.575l4.715-9.193c4.558-8.88 8.88-17.288 11.315-26.56a61.684 61.684 0 0 0-1.336-34.731c-8.136-8.94-21.96-9.642-30.96-1.572L55.436 66.519a22.002 22.002 0 0 0-7.072 13.044l-8.25 54.69c0 .55-.158 1.022-.236 1.572 15.244 9.901 34.574 25.931 45.025 51.312 2.043 5.029 3.772 10.294 5.029 16.03a157.157 157.157 0 0 1 52.805-5.343v.078Z"
								/>
								<path
									fill="url(#d)"
									d="M178.253 328.5c14.616 4.007 29.31-7.701 31.353-22.789a120.225 120.225 0 0 1 12.494-41.017c-16.502-35.44-36.382-53.827-58.148-61.999-23.18-8.643-48.404-5.736-74.021.472 5.736 26.01 2.357 60.034-19.487 104.273 2.436 1.257 5.186 1.965 7.936 2.2l34.496 2.593c18.701 1.336 46.597 11.001 65.377 16.266Z"
								/>
								<path
									fill="url(#e)"
									d="M127.177 122.074c-.864 18.859 1.493 40.39 14.144 72.135l-3.929-.393c-11.394-33.081-13.908-50.054-13.044-69.149.786-19.094 6.994-33.789 13.123-46.361 1.571-3.143 5.186-9.037 6.758-12.023 4.557-8.879 7.622-13.515 10.215-21.609 3.772-11.315 2.986-16.658 2.514-22.001 2.908 19.251-8.172 35.988-16.501 53.04a113.939 113.939 0 0 0-13.358 46.361h.078Z"
								/>
								<path
									fill="url(#f)"
									d="M88.674 188.551c1.571 3.458 2.907 6.287 3.85 10.608l-3.379.786c-1.336-5.029-2.357-8.643-4.322-12.965-11.472-26.953-29.86-40.861-44.79-51.076 18.074 9.744 36.697 25.066 48.64 52.647Z"
								/>
								<path
									fill="url(#g)"
									d="M92.681 202.617c6.286 29.467-.786 66.948-21.609 103.409 17.445-36.146 25.931-70.8 18.859-102.938l2.75-.55v.079Z"
								/>
								<path
									fill="url(#h)"
									d="M164.659 199.867c34.181 12.808 47.383 40.86 57.205 64.355-12.18-24.516-29.074-51.626-58.462-61.684-22.317-7.7-41.175-6.758-73.471.55l-.707-3.143c34.26-7.858 52.176-8.8 75.435 0v-.078Z"
								/>
							</svg>
						</div>
						<div className="text-center">
							<h3 className="font-semibold text-neutral-900 dark:text-white">Obsidian</h3>
							<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 hidden md:block">
								Import notes from your Obsidian vault
							</p>
						</div>
					</div>
				</Card>

				<Card
					className="group relative overflow-hidden transition-all hover:shadow-lg flex-1 basis-[calc(33.333%-1rem)]"
					onClick={() => setIsCSVModalOpen(true)}
				>
					<div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-r from-blue-500/10 to-blue-600/10" />
					<div className="relative z-10 flex flex-col items-center gap-4 p-6">
						<div className="rounded-full bg-white/10 p-3">
							<FileUpIcon className="transition-transform group-hover:scale-110 text-blue-500" />
						</div>
						<div className="text-center">
							<h3 className="font-semibold text-neutral-900 dark:text-white">CSV Upload</h3>
							<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 hidden md:block">
								Bulk import URLs from a CSV file
							</p>
						</div>
					</div>
				</Card>

				{Object.entries(integrations).map(([key, integration]) => (
					<IntegrationButton
						key={key}
						integration={integration}
						onClick={() => handleIntegrationClick(integration)}
					/>
				))}
			</div>

			{loadingIntegration && (
				<LoadingIntegration
					integration={loadingIntegration}
					onCancel={() => setLoadingIntegration(null)}
				/>
			)}

			<CSVUploadModal isOpen={isCSVModalOpen} onClose={() => setIsCSVModalOpen(false)} />
			<MarkdownUploadModal
				isOpen={isMarkdownModalOpen}
				onClose={() => setIsMarkdownModalOpen(false)}
			/>

			<div className="mt-8 md:mt-12 text-center">
				<p className="text-sm text-neutral-600 dark:text-neutral-400">
					More integrations coming soon.{" "}
					<a
						href="mailto:integrations@supermemory.ai"
						className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
					>
						Have a suggestion?
					</a>
				</p>
			</div>
		</div>
	);
}

type ImportStatus = "idle" | "loading" | "success" | "error";

export function IntegrationModals({ integrationId }: { integrationId: string }) {
	const [status, setStatus] = useState<ImportStatus>("idle");
	const [progress, setProgress] = useState<number>(0);
	const [isModalOpen, setIsModalOpen] = useState(true);
	const router = useNavigate();

	useEffect(() => {
		if (integrationId === "notion") {
			handleNotionImport();
		}
	}, [integrationId]);

	const handleNotionImport = async () => {
		setStatus("loading");
		let toastId: string | number | undefined;

		try {
			const eventSource = new EventSource(`/backend/v1/integrations/notion/import`, {
				withCredentials: true,
			});

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.progress) {
						setProgress(data.progress);
						if (data.page) {
							toastId = toast.loading(`Importing ${data.page}... ${data.progress}%`, {
								id: toastId,
							});
						} else {
							toastId = toast.loading(`Importing from Notion: ${data.progress}%`, { id: toastId });
						}
					}
					if (data.warning) {
						toast.warning(data.message);
					}
					if (data.error) {
						throw new Error(data.error);
					}
					if (data.progress === 100) {
						eventSource.close();
						setStatus("success");
						if (toastId) {
							toast.success("Successfully imported from Notion!", { id: toastId });
						} else {
							toast.success("Successfully imported from Notion!");
						}
						setTimeout(() => {
							router("/");
						}, 1500);
					}
				} catch (e) {
					console.error("Error parsing SSE data:", e);
					eventSource.close();
					setStatus("error");
					if (toastId) {
						toast.error(e instanceof Error ? e.message : "Failed to import from Notion", {
							id: toastId,
						});
					} else {
						toast.error(e instanceof Error ? e.message : "Failed to import from Notion");
					}
				}
			};

			eventSource.onerror = (error) => {
				console.error("EventSource error:", error);
				eventSource.close();
				setStatus("error");
				if (toastId) {
					toast.error("Failed to connect to import stream", { id: toastId });
				} else {
					toast.error("Failed to connect to import stream");
				}
			};
		} catch (error) {
			console.error("Import error:", error);
			setStatus("error");
			if (toastId) {
				toast.error(error instanceof Error ? error.message : "Failed to import from Notion", {
					id: toastId,
				});
			} else {
				toast.error(error instanceof Error ? error.message : "Failed to import from Notion");
			}
		}
	};

	const handleClose = () => {
		setIsModalOpen(false);
	};

	if (!integrationId || !isModalOpen) return null;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
			onClick={handleClose}
		>
			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				className="relative w-full max-w-sm md:max-w-md rounded-xl bg-white p-6 md:p-8 shadow-xl dark:bg-neutral-800"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					onClick={handleClose}
					className="absolute right-3 top-3 md:right-4 md:top-4 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
				>
					<X className="size-5" />
				</button>

				<div className="flex flex-col items-center gap-4 md:gap-6">
					{status === "loading" && (
						<>
							<div className="relative">
								<div className="absolute inset-0 flex items-center justify-center">
									<span className="text-lg font-semibold text-blue-500">{progress}%</span>
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
										strokeDashoffset={283 - (283 * progress) / 100}
										strokeLinecap="round"
										stroke="currentColor"
										fill="transparent"
										r="45"
										cx="48"
										cy="48"
									/>
								</svg>
							</div>

							<div className="text-center">
								<h3 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-white">
									Importing from Notion
								</h3>
								<p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
									This may take a few minutes. You can close this modal and let it run in the
									background.
								</p>
							</div>
						</>
					)}

					{status === "success" && (
						<>
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="rounded-full bg-green-100 p-3 md:p-4 dark:bg-green-900/30"
							>
								<CheckCircle className="size-10 md:size-12 text-green-600 dark:text-green-400" />
							</motion.div>
							<div className="text-center">
								<h3 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-white">
									Import Complete!
								</h3>
								<p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
									Redirecting you to your dashboard...
								</p>
							</div>
						</>
					)}

					{status === "error" && (
						<>
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="rounded-full bg-red-100 p-3 md:p-4 dark:bg-red-900/30"
							>
								<AlertCircle className="size-10 md:size-12 text-red-600 dark:text-red-400" />
							</motion.div>
							<div className="text-center">
								<h3 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-white">
									Import Failed
								</h3>
								<p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
									Please try again or contact support if the issue persists
								</p>
								<Button onClick={handleNotionImport} variant="outline" className="mt-4">
									Retry Import
								</Button>
							</div>
						</>
					)}
				</div>
			</motion.div>
		</motion.div>
	);
}

export default Integrations;
