"use client";

import { motion } from "motion/react";
import { useOnboarding } from "./onboarding-context";

export function OnboardingProgressBar() {
    const { currentVisibleStepNumber, totalSteps } = useOnboarding();

    const progress = totalSteps === 0
        ? 0
        : (currentVisibleStepNumber / totalSteps) * 100;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-zinc-200">
            <motion.div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-gold-600"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{
                    duration: 0.8,
                    ease: "easeInOut"
                }}
            />
        </div>
    );
}
