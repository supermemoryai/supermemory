"use client"

import { useOnboarding } from "./onboarding-context"

interface OnboardingBackgroundProps {
	children: React.ReactNode
}

export function OnboardingBackground({ children }: OnboardingBackgroundProps) {
	const { currentStep, visibleSteps } = useOnboarding()

	const backgroundImage = "url(/onboarding.png)"

	const currentZoomStepIndex = visibleSteps.indexOf(currentStep)

	const zoomScale =
		currentZoomStepIndex >= 0 ? 1.0 + currentZoomStepIndex * 0.1 : 1.0

	return (
		<div className="min-h-screen w-full overflow-x-hidden text-zinc-900 flex items-center justify-center relative px-4 md:px-0">
			<div
				className="absolute inset-0 transition-transform duration-700 ease-in-out"
				style={{
					backgroundImage,
					backgroundSize: "cover",
					backgroundPosition: "bottom",
					backgroundRepeat: "no-repeat",
					transform: `scale(${zoomScale})`,
				}}
			/>
			<div className="relative z-10 w-full max-w-4xl mx-auto">{children}</div>
		</div>
	)
}
