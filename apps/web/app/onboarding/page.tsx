import { getSession } from "@lib/auth";
import { OnboardingForm } from "./onboarding-form";
import { OnboardingProvider } from "./onboarding-context";
import { FloatingOrbs } from "./floating-orbs";
import { OnboardingProgressBar } from "./progress-bar";
import { redirect } from "next/navigation";
import { type Metadata } from "next";

export const metadata: Metadata = {
    title: "Welcome to Supermemory",
    description: "We're excited to have you on board.",
};

export default function OnboardingPage() {
    const session = getSession();

    if (!session) redirect("/login");

    return (
        <div className="min-h-screen w-full overflow-x-hidden text-zinc-900 bg-white flex items-center justify-center relative">
            <OnboardingProvider>
                <OnboardingProgressBar />
                <FloatingOrbs />
                <OnboardingForm />
            </OnboardingProvider>
        </div>
    );
}