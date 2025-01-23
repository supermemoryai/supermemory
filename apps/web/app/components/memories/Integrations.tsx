import { useEffect, useState } from "react";

import { useNavigate, useRouteLoaderData } from "@remix-run/react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Clipboard, ClipboardCheckIcon, X, FileUpIcon } from "lucide-react";
import { toast } from "sonner";
import { type IntegrationConfig, getIntegrations } from "~/config/integrations";
import { getChromeExtensionId } from "~/config/util";
import { cn } from "~/lib/utils";
import { loader } from "~/root";
import { CSVUploadModal } from "./CSVUploadModal";

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
		const response = await fetch(`/backend/api/user/key`, {
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
			const eventSource = new EventSource(`/backend/api/integrations/notion/import`, {
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
