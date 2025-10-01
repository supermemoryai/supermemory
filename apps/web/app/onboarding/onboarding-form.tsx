"use client";

import { motion, AnimatePresence } from "motion/react";
import { NameForm } from "./name-form";
import { Intro } from "./intro";
import { useOnboarding } from "./onboarding-context";
import { BioForm } from "./bio-form";
import { ConnectionsForm } from "./connections-form";
import { ExtensionForm } from "./extension-form";
import { MCPForm } from "./mcp-form";
import { Welcome } from "./welcome";

export function OnboardingForm() {
    const { currentStep, resetIntroTriggers } = useOnboarding();

    return (
        <div className="text-6xl px-6 py-8 tracking-wide font-bold font-serif flex flex-col justify-center max-sm:w-full">
            <AnimatePresence mode="wait" onExitComplete={resetIntroTriggers}>
                {currentStep === "intro" && (
                    <motion.div
                        key="intro"
                        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
                        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
                        transition={{ duration: 0.28, ease: "easeInOut" }}
                    >
                        <Intro />
                    </motion.div>
                )}
                {currentStep === "name" && (
                    <motion.div
                        key="name"
                        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <NameForm />
                    </motion.div>
                )}
                {currentStep === "bio" && (
                    <motion.div
                        key="bio"
                        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <BioForm />
                    </motion.div>
                )}
                {currentStep === "connections" && (
                    <motion.div
                        key="connections"
                        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <ConnectionsForm />
                    </motion.div>
                )}
                {currentStep === "mcp" && (
                    <motion.div
                        key="mcp"
                        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <MCPForm />
                    </motion.div>
                )}
                {currentStep === "extension" && (
                    <motion.div
                        key="extension"
                        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <ExtensionForm />
                    </motion.div>
                )}
                {currentStep === "welcome" && (
                    <motion.div
                        key="welcome"
                        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <Welcome />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}