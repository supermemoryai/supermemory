import { authClient } from "@lib/auth";
import { useAuth } from "@lib/auth-context";
import { generateId } from "@lib/generate-id";
import {
	ADD_MEMORY_SHORTCUT_URL,
	SEARCH_MEMORY_SHORTCUT_URL,
} from "@repo/lib/constants";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogPortal,
} from "@repo/ui/components/dialog";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Smartphone, X } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { toast } from "sonner";

const ChromeIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		preserveAspectRatio="xMidYMid"
		viewBox="0 0 190.5 190.5"
		className={className}
	>
		<title>Google Chrome Icon</title>
		<path
			fill="#fff"
			d="M95.252 142.873c26.304 0 47.627-21.324 47.627-47.628s-21.323-47.628-47.627-47.628-47.627 21.324-47.627 47.628 21.323 47.628 47.627 47.628z"
		/>
		<path
			fill="#229342"
			d="m54.005 119.07-41.24-71.43a95.227 95.227 0 0 0-.003 95.25 95.234 95.234 0 0 0 82.496 47.61l41.24-71.43v-.011a47.613 47.613 0 0 1-17.428 17.443 47.62 47.62 0 0 1-47.632.007 47.62 47.62 0 0 1-17.433-17.437z"
		/>
		<path
			fill="#fbc116"
			d="m136.495 119.067-41.239 71.43a95.229 95.229 0 0 0 82.489-47.622A95.24 95.24 0 0 0 190.5 95.248a95.237 95.237 0 0 0-12.772-47.623H95.249l-.01.007a47.62 47.62 0 0 1 23.819 6.372 47.618 47.618 0 0 1 17.439 17.431 47.62 47.62 0 0 1-.001 47.633z"
		/>
		<path
			fill="#1a73e8"
			d="M95.252 132.961c20.824 0 37.705-16.881 37.705-37.706S116.076 57.55 95.252 57.55 57.547 74.431 57.547 95.255s16.881 37.706 37.705 37.706z"
		/>
		<path
			fill="#e33b2e"
			d="M95.252 47.628h82.479A95.237 95.237 0 0 0 142.87 12.76 95.23 95.23 0 0 0 95.245 0a95.222 95.222 0 0 0-47.623 12.767 95.23 95.23 0 0 0-34.856 34.872l41.24 71.43.011.006a47.62 47.62 0 0 1-.015-47.633 47.61 47.61 0 0 1 41.252-23.815z"
		/>
	</svg>
);

export function IntegrationsView() {
	const { org } = useAuth();
	const [showApiKeyModal, setShowApiKeyModal] = useState(false);
	const [apiKey, setApiKey] = useState<string>("");
	const [copied, setCopied] = useState(false);
	const [selectedShortcutType, setSelectedShortcutType] = useState<
		"add" | "search" | null
	>(null);
	const apiKeyId = useId();

	const createApiKeyMutation = useMutation({
		mutationFn: async () => {
			const res = await authClient.apiKey.create({
				metadata: {
					organizationId: org?.id,
					type: "ios-shortcut",
				},
				name: `ios-${generateId().slice(0, 8)}`,
				prefix: `sm_${org?.id}_`,
			});
			return res.key;
		},
		onSuccess: (apiKey) => {
			setApiKey(apiKey);
			setShowApiKeyModal(true);
			setCopied(false);
			handleCopyApiKey();
		},
		onError: (error) => {
			toast.error("Failed to create API key", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	const handleShortcutClick = (shortcutType: "add" | "search") => {
		setSelectedShortcutType(shortcutType);
		createApiKeyMutation.mutate();
	};

	const handleCopyApiKey = async () => {
		try {
			await navigator.clipboard.writeText(apiKey);
			setCopied(true);
			toast.success("API key copied to clipboard!");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Failed to copy API key");
		}
	};

	const handleOpenShortcut = () => {
		if (!selectedShortcutType) {
			toast.error("No shortcut type selected");
			return;
		}

		if (selectedShortcutType === "add") {
			window.open(ADD_MEMORY_SHORTCUT_URL, "_blank");
		} else if (selectedShortcutType === "search") {
			window.open(SEARCH_MEMORY_SHORTCUT_URL, "_blank");
		}
	};

	const handleDialogClose = (open: boolean) => {
		setShowApiKeyModal(open);
		if (!open) {
			// Reset state when dialog closes
			setSelectedShortcutType(null);
			setApiKey("");
			setCopied(false);
		}
	};

	return (
		<div className="space-y-4">
			{/* iOS Shortcuts */}
			<div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
				<div className="p-4">
					<div className="flex items-start gap-3 mb-3">
						<div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
							<Smartphone className="h-5 w-5 text-blue-400" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-white font-semibold text-base mb-1">
								iOS Shortcuts
							</h3>
							<p className="text-white/70 text-sm leading-relaxed">
								Add memories directly from iOS
							</p>
						</div>
					</div>
					<div className="flex flex-col sm:flex-row gap-2">
						<Button
							variant="ghost"
							className="flex-1 text-white hover:bg-blue-500/10 bg-[#171F59]/75 "
							onClick={() => handleShortcutClick("add")}
							disabled={createApiKeyMutation.isPending}
						>
							<Image
								src="/images/ios-shortcuts.png"
								alt="iOS Shortcuts"
								width={20}
								height={20}
							/>
							{createApiKeyMutation.isPending
								? "Creating..."
								: "Add Memory Shortcut"}
						</Button>
						<Button
							variant="ghost"
							className="flex-1 text-white  hover:bg-blue-500/10 bg-[#171F59]/75"
							onClick={() => handleShortcutClick("search")}
							disabled={createApiKeyMutation.isPending}
						>
							<Image
								src="/images/ios-shortcuts.png"
								alt="iOS Shortcuts"
								width={20}
								height={20}
							/>
							{createApiKeyMutation.isPending
								? "Creating..."
								: "Search Memory Shortcut"}
						</Button>
					</div>
				</div>
			</div>

			{/* Chrome Extension */}
			<div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden opacity-75">
				<div className="p-4">
					<div className="flex items-start gap-3">
						<div className="p-2 bg-orange-500/20 rounded-lg flex-shrink-0">
							<ChromeIcon className="h-5 w-5 text-orange-400" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<h3 className="text-white font-semibold text-base">
									Chrome Extension
								</h3>
								<div className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full flex-shrink-0">
									Coming Soon
								</div>
							</div>
							<p className="text-white/70 text-sm leading-relaxed">
								Save web content with one click
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="p-3">
				<p className="text-white/70 text-sm leading-relaxed">
					More integrations are coming soon! Have a suggestion? Share it with us
					on{" "}
					<a
						href="https://x.com/supermemoryai"
						target="_blank"
						rel="noopener noreferrer"
						className="text-orange-500 hover:text-orange-400 text-sm underline"
					>
						X
					</a>
					.
				</p>
			</div>

			{/* API Key Modal */}
			<Dialog open={showApiKeyModal} onOpenChange={handleDialogClose}>
				<DialogPortal>
					<DialogContent className="bg-[#0f1419] border-white/10 text-white md:max-w-md z-[100]">
						<DialogHeader>
							<DialogTitle className="text-white text-lg font-semibold">
								Setup{" "}
								{selectedShortcutType === "add"
									? "Add Memory"
									: selectedShortcutType === "search"
										? "Search Memory"
										: "iOS"}{" "}
								Shortcut
							</DialogTitle>
						</DialogHeader>

						<div className="space-y-4">
							{/* API Key Section */}
							<div className="space-y-2">
								<label
									htmlFor={apiKeyId}
									className="text-sm font-medium text-white/80"
								>
									Your API Key
								</label>
								<div className="flex items-center gap-2">
									<input
										id={apiKeyId}
										type="text"
										value={apiKey}
										readOnly
										className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white font-mono"
									/>
									<Button
										size="sm"
										variant="ghost"
										onClick={handleCopyApiKey}
										className="text-white/70 hover:text-white hover:bg-white/10"
									>
										{copied ? (
											<Check className="h-4 w-4 text-green-400" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>

							{/* Steps */}
							<div className="space-y-3">
								<h4 className="text-sm font-medium text-white/80">
									Follow these steps:
								</h4>
								<div className="space-y-2">
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
											1
										</div>
										<p className="text-sm text-white/70">
											Click "Add to Shortcuts" below to open the shortcut
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
											2
										</div>
										<p className="text-sm text-white/70">
											Paste your API key when prompted
										</p>
									</div>
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
											3
										</div>
										<p className="text-sm text-white/70">
											Start using your shortcut!
										</p>
									</div>
								</div>
							</div>

							<div className="flex gap-2 pt-2">
								<Button
									onClick={handleOpenShortcut}
									className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
									disabled={!selectedShortcutType}
								>
									<Image
										src="/images/ios-shortcuts.png"
										alt="iOS Shortcuts"
										width={16}
										height={16}
										className="mr-2"
									/>
									Add to Shortcuts
								</Button>
							</div>
						</div>
					</DialogContent>
				</DialogPortal>
			</Dialog>
		</div>
	);
}
