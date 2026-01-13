import { getSession } from "@lib/auth"
import { OnboardingForm } from "./onboarding-form"
import { OnboardingProvider } from "./onboarding-context"
import { OnboardingProgressBar } from "./progress-bar"
import { redirect } from "next/navigation"
import { OnboardingBackground } from "./onboarding-background"
import type { Metadata } from "next"
export const metadata: Metadata = {
	title: "Welcome to Supermemory",
	description: "We're excited to have you on board.",
}

export default function OnboardingPage() {
	const session = getSession()

	if (!session) redirect("/login")

	return (
		<OnboardingProvider>
			<OnboardingProgressBar />
			<OnboardingBackground>
				<OnboardingForm />
			</OnboardingBackground>
		</OnboardingProvider>
	)
}
