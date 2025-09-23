"use client";

import { AnimatedText } from "./animated-text";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@repo/ui/components/button";
import { cn } from "@lib/utils";
import { ArrowRightIcon } from "lucide-react";
import { useOnboarding } from "./onboarding-context";
import { useIsMobile } from "@hooks/use-mobile";

export function Intro() {
    const { nextStep, introTriggers: triggers } = useOnboarding();
    const isMobile = useIsMobile();

    return (
        <motion.div
            className="flex flex-col gap-4 relative max-sm:text-4xl max-sm:w-full text-white"
            layout
            transition={{
                layout: { duration: 0.8, ease: "anticipate" }
            }}
        >
            <AnimatePresence mode="popLayout">
                {triggers.first && (
                    <motion.div
                        key="first"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                            opacity: { duration: 0.3 },
                            layout: { duration: 0.8, ease: "easeInOut" }
                        }}
                    >
                        {isMobile ? (
                            <div className="flex flex-col">
                                <AnimatedText trigger={triggers.first} delay={0}>
                                    Still looking for your
                                </AnimatedText>
                                <AnimatedText trigger={triggers.first} delay={0.1}>
                                    other half?
                                </AnimatedText>
                            </div>
                        ) : (
                            <AnimatedText trigger={triggers.first} delay={0}>
                                Still looking for your other half?
                            </AnimatedText>
                        )}
                    </motion.div>
                )}
                {triggers.second && (
                    <motion.div
                        key="second"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                            opacity: { duration: 0.3 },
                            layout: { duration: 0.8, ease: "easeInOut" }
                        }}
                    >
                        <AnimatedText trigger={triggers.second} delay={0.4}>
                            Don't worry.
                        </AnimatedText>
                    </motion.div>
                )}
                {triggers.third && (
                    <motion.div
                        key="third"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                            opacity: { duration: 0.3 },
                            layout: { duration: 0.8, ease: "easeInOut" }
                        }}
                    >
                        <AnimatedText trigger={triggers.third} delay={0.4}>
                            It's right here.
                            {/* It's right in front of you. */}
                            {/* You're looking at it. */}
                        </AnimatedText>
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div
                key="fourth"
                className="absolute -bottom-16 left-0"
                initial={{ opacity: 0, filter: "blur(5px)" }}
                animate={{
                    opacity: triggers.fourth ? 1 : 0,
                    filter: triggers.fourth ? "blur(0px)" : "blur(5px)"
                }}
                transition={{
                    opacity: { duration: 0.6, ease: "easeOut" },
                    filter: { duration: 0.4, ease: "easeOut" }
                }}
            >
                <Button
                    variant={"link"}
                    size={"lg"}
                    className={cn("text-white/60 flex items-center gap-2 hover:text-white/90 text-2xl underline group font-normal w-fit px-0! cursor-pointer", !triggers.fourth && "pointer-events-none")}
                    style={{
                        transform: triggers.fourth ? "scale(1)" : "scale(0.95)"
                    }}
                    onClick={nextStep}
                >
                    Meet Supermemory
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Button>
            </motion.div>
        </motion.div>
    )
}