"use client"

import { ArrowRightIcon } from "lucide-react"
import { useOnboardingStorage } from "@hooks/use-onboarding-storage"
import { useRouter } from "next/navigation"

export function Welcome() {
	const { markOnboardingCompleted } = useOnboardingStorage()
	const router = useRouter()

	const handleGetStarted = () => {
		markOnboardingCompleted()
		router.push("/")
	}

	return (
		<div className="flex flex-col gap-4 items-center text-center">
			<h1 className="text-white">Welcome to Supermemory</h1>
			<p className="text-white/80 text-2xl">
				We're excited to have you on board.
			</p>

			<button
				type="button"
				onClick={handleGetStarted}
				className="tracking-normal w-fit flex items-center justify-center text-2xl underline cursor-pointer font-medium text-white/80 hover:text-white transition-colors"
			>
				Get started
				<ArrowRightIcon className="size-4 ml-2" />
			</button>
		</div>
	)
}
