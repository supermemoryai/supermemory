"use client"

import { useEffect, useState } from "react"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { useRouter } from "next/navigation"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@ui/components/dialog"
import { Button } from "@ui/components/button"
import { useIsMobile } from "@hooks/use-mobile"

export function NewOnboardingModal() {
	const router = useRouter()
	const flagEnabled = true
	const isMobile = useIsMobile()
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (flagEnabled) {
			setOpen(true)
		}
	}, [flagEnabled])

	const handleContinue = () => {
		setOpen(false)
		router.push("/new/onboarding")
	}

	if (!flagEnabled) {
		return null
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					setOpen(false)
				}
			}}
		>
			<DialogContent onInteractOutside={(e) => e.preventDefault()}>
				<DialogHeader>
					<DialogTitle>Experience the new onboarding</DialogTitle>
					<DialogDescription>
						We've redesigned the onboarding experience. Would you like to try
						it?
						{isMobile && (
							<span className="block mt-2 text-yellow-600 dark:text-yellow-500">
								Desktop view is recommended for the best experience.
							</span>
						)}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Stay here
					</Button>
					<Button onClick={handleContinue}>Continue to new onboarding</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
