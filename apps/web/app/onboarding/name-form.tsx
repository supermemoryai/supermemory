"use client";

import { Button } from "@repo/ui/components/button";
import { useOnboarding } from "./onboarding-context";
import { useAuth } from "@lib/auth-context";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Input } from "@ui/components/input";
import { CheckIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { NavMenu } from "./nav-menu";
import { authClient } from "@lib/auth";

export function NameForm() {
    const { nextStep, totalSteps, getStepNumberFor } = useOnboarding();
    const { user } = useAuth();
    const [name, setName] = useState(user?.name ?? "");

    useEffect(() => {
        if (!name && user?.name) {
            setName(user.name);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.name]);

    function handleNext(): void {
        const trimmed = name.trim();
        if (!trimmed) {
            nextStep();
            return;
        }

        nextStep();
        void authClient
            .updateUser({ name: trimmed })
            .catch((error: unknown) => {
                console.error("Failed to update user name during onboarding:", error);
            });
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        handleNext();
    }

    if (!user) {
        return (
            <div className="flex flex-col gap-6">
                <h1 className="text-4xl">You need to sign in to continue</h1>
                <Link href="/login">Login</Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <NavMenu>
                <p className="text-base text-zinc-600">
                    Step {getStepNumberFor("name")} of {totalSteps}
                </p>
            </NavMenu>
            <h1 className="text-4xl">
                What should we call you?
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col group">
                <div className="relative flex flex-col">
                    <input type="text" autoFocus name="name" autoComplete="name" autoCorrect="off" autoCapitalize="none" spellCheck="false" className="text-black outline-0 text-2xl h-12 font-normal p-0" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                    <AnimatePresence
                        mode="popLayout">
                        {
                            name && (
                                <motion.div
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    initial={{ opacity: 0 }}
                                    key="next"
                                    transition={{ duration: 0.15 }}
                                    className="absolute pointer-events-none inset-0 flex items-center justify-end">
                                    <button type="submit" className="cursor-pointer transition-colors duration-150 gap-2 pointer-events-auto flex items-center p-2 hover:bg-zinc-100 rounded-lg">
                                        <CheckIcon className="w-4 h-4" />
                                        {/* <span className="text-sm">Next</span> */}
                                    </button>
                                </motion.div>
                            )
                        }
                    </AnimatePresence>
                </div>
                <div className="w-full rounded-full group-focus-within:bg-zinc-400 transition-colors h-px bg-zinc-200"></div>
            </form>


        </div>
    );
}