"use client"

import { useOnboarding } from "./onboarding-context"

interface OnboardingBackgroundProps {
	children: React.ReactNode
}

export function OnboardingBackground({ children }: OnboardingBackgroundProps) {
	const { currentStep } = useOnboarding()

	// Use the completion background for the final "welcome" step
	const backgroundImage =
		currentStep === "welcome"
			? "url(/onboarding-complete.png)"
			: "url(/onboarding.png)"

	return (
		<div
			className="min-h-screen w-full overflow-x-hidden text-zinc-900 flex items-center justify-center relative"
			style={{
				backgroundImage,
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundRepeat: "no-repeat",
			}}
		>
			{children}
		</div>
	)
}
