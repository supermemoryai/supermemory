"use client"

import { Button } from "@ui/components/button"
import {
	Bookmark,
	Zap,
	CircleX,
	Users,
	Lock,
	ChromeIcon,
	TwitterIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { analytics } from "@/lib/analytics"
import { useIsMobile } from "@hooks/use-mobile"

export function ChromeExtensionButton() {
	const [isExtensionInstalled, setIsExtensionInstalled] = useState(false)
	const [isChecking, setIsChecking] = useState(true)
	const [isDismissed, setIsDismissed] = useState(false)
	const [isMinimized, setIsMinimized] = useState(false)
	const isMobile = useIsMobile()

	useEffect(() => {
		const dismissed =
			localStorage.getItem("chrome-extension-dismissed") === "true"
		const minimized =
			localStorage.getItem("chrome-extension-minimized") === "true"

		setIsDismissed(dismissed)
		setIsMinimized(minimized)

		const checkExtension = () => {
			const message = { action: "check-extension" }

			const timeout = setTimeout(() => {
				setIsExtensionInstalled(false)
				setIsChecking(false)
				// Auto-minimize after 3 seconds if extension is not installed and not dismissed
				if (!dismissed && !minimized) {
					setTimeout(() => {
						setIsMinimized(true)
						localStorage.setItem("chrome-extension-minimized", "true")
					}, 3000)
				}
			}, 1000)

			const handleMessage = (event: MessageEvent) => {
				if (event.data?.action === "extension-detected") {
					clearTimeout(timeout)
					setIsExtensionInstalled(true)
					setIsChecking(false)
					window.removeEventListener("message", handleMessage)
				}
			}

			window.addEventListener("message", handleMessage)

			window.postMessage(message, "*")

			return () => {
				clearTimeout(timeout)
				window.removeEventListener("message", handleMessage)
			}
		}

		if (!dismissed) {
			checkExtension()
		} else {
			setIsChecking(false)
		}
	}, [])

	const handleInstall = () => {
		analytics.extensionInstallClicked()
		window.open(
			"https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc",
			"_blank",
			"noopener,noreferrer",
		)
	}

	const handleDismiss = () => {
		localStorage.setItem("chrome-extension-dismissed", "true")
		localStorage.removeItem("chrome-extension-minimized")
		setIsDismissed(true)
	}

	// Don't show if extension is installed, checking, dismissed, or on mobile
	if (isExtensionInstalled || isChecking || isDismissed || isMobile) {
		return null
	}

	return (
		<motion.div
			className="fixed bottom-4 right-4 z-50"
			initial={{ opacity: 0, y: 20, scale: 0.9 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
		>
			<div
				className={`bg-background/95 backdrop-blur-md shadow-xl ${
					isMinimized
						? "flex items-center gap-1 rounded-full"
						: "max-w-md w-90 rounded-2xl"
				}`}
			>
				{!isMinimized && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
						className="overflow-hidden"
					>
						<div className="p-4 text-white bg-cover bg-center">
							<div
								className="p-4 rounded-lg"
								style={{
									backgroundImage: "url('/images/extension-bg.png')",
									backgroundSize: "cover",
									backgroundPosition: "center",
									backgroundRepeat: "no-repeat",
								}}
							>
								<div className="relative">
									<h1 className="text-2xl font-bold mb-1">
										supermemory extension
									</h1>
									<p className="text-sm opacity-90">
										your second brain for the web.
									</p>
								</div>
							</div>
						</div>

						<div className="px-6 py-2 pb-4 space-y-4">
							<div className="flex items-start gap-3">
								<div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
									<TwitterIcon className="fill-blue-500 dark:fill-blue-400 text-blue-500 dark:text-blue-400" />
								</div>
								<div>
									<h3 className="font-semibold text-sm text-foreground">
										Twitter Imports
									</h3>
									<p className="text-xs text-muted-foreground">
										Import your twitter timeline & save tweets.
									</p>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<div className="w-10 h-10 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center justify-center flex-shrink-0">
									<Bookmark className="w-5 h-5 text-orange-600 dark:text-orange-400" />
								</div>
								<div>
									<h3 className="font-semibold text-sm text-foreground">
										Save All Bookmarks
									</h3>
									<p className="text-xs text-muted-foreground">
										Instantly save any webpage to your memory.
									</p>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<div className="w-10 h-10 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-center flex-shrink-0">
									<Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
								</div>
								<div>
									<h3 className="font-semibold text-sm text-foreground">
										Charge Empty Memory
									</h3>
									<p className="text-xs text-muted-foreground">
										Automatically capture & organize your browsing history.
									</p>
								</div>
							</div>
						</div>

						<div className="px-6 pb-4">
							<Button
								onClick={handleInstall}
								className="w-full bg-background border border-primary text-foreground hover:bg-accent font-semibold rounded-lg h-10 flex items-center justify-center gap-3"
							>
								<div className="w-6 h-6 bg-[#686CFD] rounded-full flex items-center justify-center">
									<Image
										src="/images/extension-logo.png"
										alt="Extension Logo"
										width={24}
										height={24}
									/>
								</div>
								Add to Chrome - It's Free
							</Button>
						</div>

						<div className="px-6 pb-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
							<div className="flex items-center gap-1">
								<Users className="w-3 h-3" />
								<span>4K+ users</span>
							</div>
							<div className="flex items-center gap-1">
								<Lock className="w-3 h-3" />
								<span>Privacy first</span>
							</div>
						</div>
					</motion.div>
				)}

				{isMinimized && (
					<div className="relative flex items-center w-full group">
						<Button
							size={"lg"}
							onClick={handleInstall}
							className="text-xs rounded-full"
							style={{
								backgroundImage: "url('/images/extension-bg.png')",
								backgroundSize: "cover",
								backgroundPosition: "center",
								backgroundRepeat: "no-repeat",
							}}
						>
							<ChromeIcon className="h-3 w-3 mr-1" />
							Get Extension
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDismiss}
							className="absolute top-[-16px] right-[-12px] h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-75 transition-opacity duration-200"
						>
							<CircleX className="w-4 h-4" />
						</Button>
					</div>
				)}
			</div>
		</motion.div>
	)
}
