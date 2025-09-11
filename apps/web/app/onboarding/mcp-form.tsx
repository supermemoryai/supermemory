"use client";

import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@ui/components/select";
import { useOnboarding } from "./onboarding-context";
import { useEffect, useState } from "react";
import { Button } from "@ui/components/button";
import { CheckIcon, CircleCheckIcon, CopyIcon, LoaderIcon } from "lucide-react";
import { toast } from "sonner";
import { TextMorph } from "@/components/text-morph";
import { NavMenu } from "./nav-menu";
import { cn } from "@lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { $fetch } from "@lib/api";

const clients = {
    cursor: "Cursor",
    claude: "Claude Desktop",
    vscode: "VSCode",
    cline: "Cline",
    "roo-cline": "Roo Cline",
    witsy: "Witsy",
    enconvo: "Enconvo",
    "gemini-cli": "Gemini CLI",
    "claude-code": "Claude Code",
} as const;

export function MCPForm() {
    const { totalSteps, nextStep, getStepNumberFor } = useOnboarding();
    const [client, setClient] = useState<keyof typeof clients>("cursor");
    const [isCopied, setIsCopied] = useState(false);
    const [isInstalling, setIsInstalling] = useState(true);

    const hasLoginQuery = useQuery({
        queryKey: ["mcp", "has-login"],
        queryFn: async (): Promise<{ previousLogin: boolean }> => {
            const response = await $fetch("@get/mcp/has-login");
            if (response.error) {
                throw new Error(response.error?.message || "Failed to check MCP login");
            }
            return response.data as { previousLogin: boolean };
        },
        enabled: isInstalling,
        refetchInterval: isInstalling ? 1000 : false,
        staleTime: 0,
    });

    useEffect(() => {
        if (hasLoginQuery.data?.previousLogin) {
            setIsInstalling(false);
        }
    }, [hasLoginQuery.data?.previousLogin]);

    return (
        <div className="relative flex flex-col gap-6">
            <div className="space-y-4">
                <NavMenu>
                    <p className="text-base text-zinc-600">
                        Step {getStepNumberFor("mcp")} of {totalSteps}
                    </p>
                </NavMenu>
                <h1 className="max-sm:text-4xl">Install the MCP server</h1>
                <p className="text-zinc-600 text-2xl max-sm:text-lg">
                    Bring Supermemory to all your favourite tools
                </p>
            </div>
            <div className="flex flex-col gap-4 font-sans text-base tracking-normal font-normal">
                <div className="flex gap-4">
                    <div className="relative flex-shrink-0">
                        <div style={{
                            height: "calc(100% - 0.5rem)",
                        }} className="absolute -z-10 left-1/2 top-8 w-[1px] -translate-x-1/2 transform bg-neutral-200"></div>
                        <div className="size-10 rounded-lg bg-zinc-100 border-zinc-200 border text-zinc-900 font-medium flex items-center justify-center">1</div>
                    </div>
                    <div className="mt-2 space-y-2 w-full">
                        <p>Select the app you want to install Supermemory MCP to</p>
                        <Select
                            onValueChange={(value) => setClient(value as keyof typeof clients)}
                            value={client}
                        >
                            <SelectTrigger id="client-select" className="w-full border border-zinc-200 bg-white!">
                                <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(clients).map(([key, value]) => (
                                    <SelectItem key={key} value={key}>
                                        {value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="relative flex-shrink-0">
                        <div className="size-10 rounded-lg border-zinc-200 border bg-zinc-100 text-zinc-900 font-medium flex items-center justify-center">2</div>
                        <div style={{
                            height: "calc(100% - 0.5rem)",
                        }} className="absolute left-1/2 -z-10 top-8 w-[1px] -translate-x-1/2 transform bg-neutral-200"></div>
                    </div>
                    <div className="mt-2 space-y-2">
                        <p>Copy the installation command</p>
                        <div className="bg-white relative shadow-xs rounded-lg max-w-md text-balance py-4 px-5 border border-zinc-200">
                            <p className="text-zinc-900 font-mono text-xs w-4/5">
                                npx -y install-mcp@latest https://api.supermemory.ai/mcp --client {client} --oauth=yes
                            </p>
                            <Button className="absolute right-2 top-2" onClick={() => {
                                navigator.clipboard.writeText(`npx -y install-mcp@latest https://api.supermemory.ai/mcp --client ${client} --oauth=yes`);
                                setIsCopied(true);
                                setTimeout(() => {
                                    setIsCopied(false);
                                }, 2000);
                            }}>
                                {isCopied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                                <TextMorph>
                                    {isCopied ? "Copied!" : "Copy"}
                                </TextMorph>
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="relative flex-shrink-0">
                        <div className="size-10 rounded-lg bg-zinc-100 border-zinc-200 border text-zinc-900 font-medium flex items-center justify-center">3</div>
                    </div>
                    <div className="mt-2 space-y-2 w-full">
                        <p>Run the command in your terminal of choice</p>
                        <motion.div
                            className={cn("px-5 py-4 border shadow-xs rounded-lg flex items-center gap-3 font-mono text-sm")}
                            animate={{
                                backgroundColor: isInstalling ? "rgb(250 250 250)" : "rgb(240 253 244)", // zinc-50 to green-50
                                borderColor: isInstalling ? "rgb(228 228 231)" : "rgb(187 247 208)", // zinc-200 to green-200
                            }}
                            transition={{
                                duration: 0.3,
                                ease: "easeInOut"
                            }}
                        >
                            <AnimatePresence mode="wait">
                                {isInstalling ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <LoaderIcon className="size-4 animate-spin" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <CircleCheckIcon className="size-4 text-green-500" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <motion.span
                                key={isInstalling ? "installing" : "complete"}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                {isInstalling ? "Waiting for installation..." : "Installation complete!"}
                            </motion.span>
                        </motion.div>
                    </div>
                </div>
            </div>
            <AnimatePresence
                mode="sync">
                {
                    !isInstalling ? (
                        <motion.div
                            key="save"
                            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="flex justify-end">

                            <Button variant="link" size="lg" className="text-zinc-900 font-medium! text-lg underline w-fit px-0! cursor-pointer" onClick={nextStep}>
                                Continue
                            </Button>
                        </motion.div>
                    ) : <motion.div
                        key="skip"
                        initial={{ opacity: 0, filter: "blur(5px)", }}
                        animate={{ opacity: 1, filter: "blur(0px)", }}
                        exit={{ opacity: 0, filter: "blur(5px)", }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex justify-end">

                        <Button variant="link" size="lg" className="text-zinc-900 font-medium! text-lg underline w-fit px-0! cursor-pointer" onClick={nextStep}>
                            Skip For Now
                        </Button>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    );
}