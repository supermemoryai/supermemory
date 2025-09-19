"use client";

import { motion, type Transition } from "framer-motion";
import { Button } from "@ui/components/button";
import { useOnboarding } from "./onboarding-context";
import { $fetch } from "@lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConnectionResponseSchema } from "@repo/validation/api";
import type { z } from "zod";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { useProject } from "@/stores";
import { NavMenu } from "./nav-menu";

type Connection = z.infer<typeof ConnectionResponseSchema>;

const CONNECTORS = {
    "google-drive": {
        title: "Google Drive",
        description: "Supermemory can use the documents and files in your Google Drive to better understand and assist you.",
        iconSrc: "/images/gdrive.svg",
    },
    notion: {
        title: "Notion",
        description: "Help Supermemory understand how you organize your life and what you have going on by connecting your Notion account.",
        iconSrc: "/images/notion.svg",
    },
    onedrive: {
        title: "OneDrive",
        description: "By integrating with OneDrive, Supermemory can better understand both your previous and your current work.",
        iconSrc: "/images/onedrive.svg",
    },
} as const;

type ConnectorProvider = keyof typeof CONNECTORS;

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.1 } satisfies Transition,
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 500, damping: 35, mass: 0.8 } satisfies Transition,
    },
};

function ConnectionCard({
    title,
    description,
    iconSrc,
    isConnected = false,
    onConnect,
    isConnecting = false
}: {
    title: string;
    description: string;
    iconSrc: string;
    isConnected?: boolean;
    onConnect?: () => void;
    isConnecting?: boolean;
}) {
    return (
        <div className="flex items-center max-sm:items-start max-sm:gap-3 max-sm:flex-col shadow-lg bg-white rounded-xl py-4 px-6 gap-6 border border-zinc-200">
            <img src={iconSrc} alt={title} className="size-10 max-sm:hidden" />
            <div className="flex flex-col gap-0.5 max-sm:gap-2">
                <div className="flex items-center gap-3">
                    <img src={iconSrc} alt={title} className="size-5 sm:hidden" />
                    <h3 className="text-lg font-medium">{title}</h3>
                </div>
                <p className="text-zinc-600 text-sm">{description}</p>
            </div>
            <div className="sm:ml-auto max-sm:w-full">
                {isConnected ? (
                    <Button
                        variant="outline"
                        className="max-sm:w-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 cursor-default"
                        disabled
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Connected
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className="max-sm:w-full border border-zinc-200! hover:text-zinc-900 text-zinc-900 cursor-pointer"
                        onClick={onConnect}
                        disabled={isConnecting}
                    >
                        Connect
                    </Button>
                )}
            </div>
        </div>
    );
}

export function ConnectionsForm() {
    const { totalSteps, nextStep, getStepNumberFor } = useOnboarding();
    const { selectedProject } = useProject();

    const { data: connections = [] } = useQuery({
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

    const addConnectionMutation = useMutation({
        mutationFn: async (provider: ConnectorProvider) => {
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

    function isConnectorConnected(provider: ConnectorProvider): boolean {
        return connections.some(connection => connection.provider === provider);
    }

    function handleConnect(provider: ConnectorProvider) {
        addConnectionMutation.mutate(provider);
    }

    return (
        <div className="relative">
            <div className="space-y-4">
                <NavMenu>
                    <p className="text-base text-zinc-600">
                        Step {getStepNumberFor("connections")} of {totalSteps}
                    </p>
                </NavMenu>
                <h1 className="max-sm:text-4xl">Connect your accounts</h1>
                <p className="text-zinc-600 text-2xl max-sm:text-lg">
                    Help Supermemory get to know you and your documents better
                    {/* The more context you provide, the better Supermemory becomes */}
                    {/* Supermemory understands your needs and goals better with more context */}
                    {/* Supermemory understands you better when it integrates with your apps */}
                </p>
            </div>
            <motion.div className="font-sans text-base mt-8 font-normal tracking-normal flex flex-col gap-4 max-w-prose" initial="hidden" animate="visible" variants={containerVariants}>
                {Object.entries(CONNECTORS).map(([provider, config]) => {
                    const providerKey = provider as ConnectorProvider;
                    const isConnected = isConnectorConnected(providerKey);
                    const isConnecting = addConnectionMutation.isPending && addConnectionMutation.variables === providerKey;

                    return (
                        <motion.div key={provider} variants={itemVariants}>
                            <ConnectionCard
                                title={config.title}
                                description={config.description}
                                iconSrc={config.iconSrc}
                                isConnected={isConnected}
                                onConnect={() => handleConnect(providerKey)}
                                isConnecting={isConnecting}
                            />
                        </motion.div>
                    );
                })}
            </motion.div>
            <div className="flex justify-end mt-4">
                <Button variant="link" size="lg" className="text-zinc-900 font-medium! text-lg underline w-fit px-0! cursor-pointer" onClick={nextStep}>
                    Skip For Now
                </Button>
            </div>
        </div>
    );
}