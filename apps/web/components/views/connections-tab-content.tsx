"use client";

import { $fetch } from "@lib/api";
import {
	fetchConnectionsFeature,
	fetchConsumerProProduct,
} from "@repo/lib/queries";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";
import type { ConnectionResponseSchema } from "@repo/validation/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GoogleDrive, Notion, OneDrive } from "@ui/assets/icons";
import { useCustomer } from "autumn-js/react";
import { Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { analytics } from "@/lib/analytics";
import { useProject } from "@/stores";

// Define types
type Connection = z.infer<typeof ConnectionResponseSchema>;

// Connector configurations
const CONNECTORS = {
	"google-drive": {
		title: "Google Drive",
		description: "Connect your Google Docs, Sheets, and Slides",
		icon: GoogleDrive,
	},
	notion: {
		title: "Notion",
		description: "Import your Notion pages and databases",
		icon: Notion,
	},
	onedrive: {
		title: "OneDrive",
		description: "Access your Microsoft Office documents",
		icon: OneDrive,
	},
} as const;

type ConnectorProvider = keyof typeof CONNECTORS;

export function ConnectionsTabContent() {
	const queryClient = useQueryClient();
	const { selectedProject } = useProject();
	const autumn = useCustomer();

	const handleUpgrade = async () => {
		try {
			await autumn.attach({
				productId: "consumer_pro",
				successUrl: "https://app.supermemory.ai/",
			});
			window.location.reload();
		} catch (error) {
			console.error(error);
		}
	};

	const { data: connectionsCheck } = fetchConnectionsFeature(autumn as any);
	const connectionsUsed = connectionsCheck?.balance ?? 0;
	const connectionsLimit = connectionsCheck?.included_usage ?? 0;

	const { data: proCheck } = fetchConsumerProProduct(autumn as any);
	const isProUser = proCheck?.allowed ?? false;

	const canAddConnection = connectionsUsed < connectionsLimit;

	// Fetch connections
	const {
		data: connections = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["connections"],
		queryFn: async () => {
			const response = await $fetch("@post/connections/list", {
				body: {
					containerTags: [],
				},
			});

			if (response.error) {
				throw new Error(
					response.error?.message || "Failed to load connections",
				);
			}

			return response.data as Connection[];
		},
		staleTime: 30 * 1000,
		refetchInterval: 60 * 1000,
	});

	// Show error toast if connections fail to load
	useEffect(() => {
		if (error) {
			toast.error("Failed to load connections", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}, [error]);

	// Add connection mutation
	const addConnectionMutation = useMutation({
		mutationFn: async (provider: ConnectorProvider) => {
			// Check if user can add connections
			if (!canAddConnection && !isProUser) {
				throw new Error(
					"Free plan doesn't include connections. Upgrade to Pro for unlimited connections.",
				);
			}

			const response = await $fetch("@post/connections/:provider", {
				params: { provider },
				body: {
					redirectUrl: window.location.href,
					containerTags: [selectedProject],
				},
			});

			// biome-ignore lint/style/noNonNullAssertion: its fine
			if ("data" in response && !("error" in response.data!)) {
				return response.data;
			}

			throw new Error(response.error?.message || "Failed to connect");
		},
		onSuccess: (data, provider) => {
			analytics.connectionAdded(provider);
			analytics.connectionAuthStarted();
			if (data?.authLink) {
				window.location.href = data.authLink;
			}
		},
		onError: (error, provider) => {
			analytics.connectionAuthFailed();
			toast.error(`Failed to connect ${provider}`, {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	// Delete connection mutation
	const deleteConnectionMutation = useMutation({
		mutationFn: async (connectionId: string) => {
			await $fetch(`@delete/connections/${connectionId}`);
		},
		onSuccess: () => {
			analytics.connectionDeleted();
			toast.success(
				"Connection removal has started. supermemory will permanently delete the documents in the next few minutes.",
			);
			queryClient.invalidateQueries({ queryKey: ["connections"] });
		},
		onError: (error) => {
			toast.error("Failed to remove connection", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	const getProviderIcon = (provider: string) => {
		const connector = CONNECTORS[provider as ConnectorProvider];
		if (connector) {
			const Icon = connector.icon;
			return <Icon className="h-10 w-10" />;
		}
		return <span className="text-2xl">📎</span>;
	};

	return (
		<div className="space-y-4">
			<div className="mb-4">
				<p className="text-sm text-white/70">
					Connect your favorite services to import documents
				</p>
				{!isProUser && (
					<p className="text-xs text-white/50 mt-1">
						Connections require a Pro subscription
					</p>
				)}
			</div>

			{/* Show upgrade prompt for free users */}
			{!isProUser && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
					initial={{ opacity: 0, y: -10 }}
				>
					<p className="text-sm text-yellow-400 mb-2">
						🔌 Connections are a Pro feature
					</p>
					<p className="text-xs text-white/60 mb-3">
						Connect Google Drive, Notion, OneDrive and more to automatically
						sync your documents.
					</p>
					<Button
						asChild
						className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30"
						onClick={handleUpgrade}
						size="sm"
						variant="secondary"
					>
						Upgrade to Pro
					</Button>
				</motion.div>
			)}

			{isLoading ? (
				<div className="space-y-3">
					{[...Array(2)].map((_, i) => (
						<motion.div
							animate={{ opacity: 1 }}
							className="p-4 bg-white/5 rounded-lg"
							initial={{ opacity: 0 }}
							key={`skeleton-${Date.now()}-${i}`}
							transition={{ delay: i * 0.1 }}
						>
							<Skeleton className="h-12 w-full bg-white/10" />
						</motion.div>
					))}
				</div>
			) : connections.length === 0 ? (
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className="text-center py-4"
					initial={{ opacity: 0, scale: 0.9 }}
					transition={{ type: "spring", damping: 20 }}
				>
					<p className="text-white/50 mb-2">No connections yet</p>
					<p className="text-xs text-white/40">
						Choose a service below to connect
					</p>
				</motion.div>
			) : (
				<motion.div className="space-y-2">
					<AnimatePresence>
						{connections.map((connection, index) => (
							<motion.div
								animate={{ opacity: 1, x: 0 }}
								className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
								exit={{ opacity: 0, x: 20 }}
								initial={{ opacity: 0, x: -20 }}
								key={connection.id}
								layout
								transition={{ delay: index * 0.05 }}
							>
								<div className="flex items-center gap-3">
									<motion.div
										animate={{ rotate: 0, opacity: 1 }}
										initial={{ rotate: -180, opacity: 0 }}
										transition={{ delay: index * 0.05 + 0.2 }}
									>
										{getProviderIcon(connection.provider)}
									</motion.div>
									<div>
										<p className="font-medium text-white capitalize">
											{connection.provider.replace("-", " ")}
										</p>
										{connection.email && (
											<p className="text-sm text-white/60">
												{connection.email}
											</p>
										)}
									</div>
								</div>
								<motion.div
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
								>
									<Button
										className="text-white/50 hover:text-red-400"
										disabled={deleteConnectionMutation.isPending}
										onClick={() =>
											deleteConnectionMutation.mutate(connection.id)
										}
										size="icon"
										variant="ghost"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</motion.div>
							</motion.div>
						))}
					</AnimatePresence>
				</motion.div>
			)}

			{/* Available Connections Section */}
			<div className="mt-6">
				<h3 className="text-lg font-medium text-white mb-4">
					Available Connections
				</h3>
				<div className="grid gap-3">
					{Object.entries(CONNECTORS).map(([provider, config], index) => {
						const Icon = config.icon;
						return (
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								initial={{ opacity: 0, y: 20 }}
								key={provider}
								transition={{ delay: index * 0.05 }}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
							>
								<Button
									className="justify-start h-auto p-4 bg-white/5 hover:bg-white/10 border-white/10 text-white w-full"
									disabled={addConnectionMutation.isPending}
									onClick={() => {
										addConnectionMutation.mutate(provider as ConnectorProvider);
									}}
									variant="outline"
								>
									<Icon className="h-8 w-8 mr-3" />
									<div className="text-left">
										<div className="font-medium">{config.title}</div>
										<div className="text-sm text-white/60 mt-0.5">
											{config.description}
										</div>
									</div>
								</Button>
							</motion.div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
