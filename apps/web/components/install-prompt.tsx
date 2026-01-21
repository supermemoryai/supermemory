import { Button } from "@repo/ui/components/button"
import { Download, Share, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"

export function InstallPrompt() {
	const [isIOS, setIsIOS] = useState(false)
	const [showPrompt, setShowPrompt] = useState(false)
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

	useEffect(() => {
		const isIOSDevice =
			/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
		const isInStandaloneMode = window.matchMedia(
			"(display-mode: standalone)",
		).matches
		const hasSeenPrompt =
			localStorage.getItem("install-prompt-dismissed") === "true"

		setIsIOS(isIOSDevice)

		const isDevelopment = process.env.NODE_ENV === "development"
		setShowPrompt(
			!hasSeenPrompt &&
				(isDevelopment ||
					(!isInStandaloneMode &&
						(isIOSDevice || "serviceWorker" in navigator))),
		)

		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault()
			setDeferredPrompt(e)
			if (!hasSeenPrompt) {
				setShowPrompt(true)
			}
		}

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

		return () => {
			window.removeEventListener(
				"beforeinstallprompt",
				handleBeforeInstallPrompt,
			)
		}
	}, [])

	const handleInstall = async () => {
		if (deferredPrompt) {
			deferredPrompt.prompt()
			const { outcome } = await deferredPrompt.userChoice
			if (outcome === "accepted") {
				localStorage.setItem("install-prompt-dismissed", "true")
				setShowPrompt(false)
			}
			setDeferredPrompt(null)
		}
	}

	const handleDismiss = () => {
		localStorage.setItem("install-prompt-dismissed", "true")
		setShowPrompt(false)
	}

	if (!showPrompt) {
		return null
	}

	return (
		<AnimatePresence>
			<motion.div
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: 100, opacity: 0 }}
				initial={{ y: 100, opacity: 0 }}
				className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm md:hidden"
			>
				<div className="bg-black/90 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-white/10">
					<div className="flex items-start justify-between mb-3">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 bg-[#0f1419] rounded-lg flex items-center justify-center">
								<Download className="w-4 h-4" />
							</div>
							<h3 className="font-semibold text-sm">Install Supermemory</h3>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDismiss}
							className="text-white/60 hover:text-white h-6 w-6 p-0"
						>
							<X className="w-4 h-4" />
						</Button>
					</div>

					<p className="text-white/80 text-xs mb-4 leading-relaxed">
						Add Supermemory to your home screen for quick access and a better
						experience.
					</p>

					{isIOS ? (
						<div className="space-y-3">
							<p className="text-white/70 text-xs flex items-center gap-1">
								1. Tap the <Share className="w-3 h-3 inline" /> Share button in
								Safari
							</p>
							<p className="text-white/70 text-xs">
								2. Select "Add to Home Screen" ➕
							</p>
							<Button
								variant="secondary"
								size="sm"
								onClick={handleDismiss}
								className="w-full text-xs"
							>
								Got it
							</Button>
						</div>
					) : (
						<Button
							onClick={handleInstall}
							size="sm"
							className="w-full bg-[#0f1419] hover:bg-[#1a1f2a] text-white text-xs"
						>
							<Download className="w-3 h-3 mr-1" />
							Add to Home Screen
						</Button>
					)}
				</div>
			</motion.div>
		</AnimatePresence>
	)
}
