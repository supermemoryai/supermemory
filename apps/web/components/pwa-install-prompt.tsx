"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import { XIcon, Brain, Sparkles, Globe } from "lucide-react"
import { GradientLogo } from "@ui/assets/Logo"
import { AnimatePresence, motion } from "motion/react"

const PWA_DISMISS_KEY = "pwa-install-dismissed"
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

type DeviceInfo = {
	isIOS: boolean
	isAndroid: boolean
	isSafari: boolean
	isChrome: boolean
}

/** In-memory fallback when localStorage is unavailable */
let memoryDismissed = false

function getDeviceInfo(): DeviceInfo {
	if (typeof window === "undefined")
		return { isIOS: false, isAndroid: false, isSafari: false, isChrome: false }
	const ua = navigator.userAgent
	const isIOS =
		/iPad|iPhone|iPod/.test(ua) ||
		(/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
	const isAndroid = /Android/.test(ua)

	// Safari: contains "Safari" but not "CriOS", "FxiOS", "Chrome", "Edg", etc.
	const isSafari =
		/Safari/.test(ua) && !/CriOS|FxiOS|Chrome|Chromium|Edg|OPR|Opera/.test(ua)
	// Chrome on Android: contains "Chrome" but not "Edg", "OPR", "Opera"
	const isChrome = /Chrome/.test(ua) && !/Edg|OPR|Opera/.test(ua)

	return { isIOS, isAndroid, isSafari, isChrome }
}

function isStandalone() {
	if (typeof window === "undefined") return false
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		(window.navigator as unknown as { standalone?: boolean }).standalone ===
			true
	)
}

function isDismissed() {
	if (typeof window === "undefined") return true
	if (memoryDismissed) return true
	try {
		const dismissed = localStorage.getItem(PWA_DISMISS_KEY)
		if (!dismissed) return false
		const timestamp = Number.parseInt(dismissed, 10)
		if (Date.now() - timestamp < DISMISS_DURATION_MS) return true
		localStorage.removeItem(PWA_DISMISS_KEY)
		return false
	} catch {
		return false
	}
}

const FEATURES = [
	{ icon: Brain, label: "AI-powered memory" },
	{ icon: Sparkles, label: "Chat with Nova" },
	{ icon: Globe, label: "Access anywhere" },
]

export function PWAInstallPrompt() {
	const [show, setShow] = useState(false)
	const [device, setDevice] = useState<DeviceInfo>({
		isIOS: false,
		isAndroid: false,
		isSafari: false,
		isChrome: false,
	})
	const [nativePrompt, setNativePrompt] =
		useState<BeforeInstallPromptEvent | null>(null)
	const panelRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const info = getDeviceInfo()
		setDevice(info)

		// Listen for the native install prompt (Chromium browsers on Android)
		const handleBeforeInstall = (e: Event) => {
			e.preventDefault()
			setNativePrompt(e as BeforeInstallPromptEvent)
		}
		window.addEventListener("beforeinstallprompt", handleBeforeInstall)

		const isMobile = info.isIOS || info.isAndroid
		if (isMobile && !isStandalone() && !isDismissed()) {
			const timer = setTimeout(() => setShow(true), 1500)
			return () => {
				clearTimeout(timer)
				window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
			}
		}
		return () => {
			window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
		}
	}, [])

	const dismiss = useCallback(() => {
		setShow(false)
		memoryDismissed = true
		try {
			localStorage.setItem(PWA_DISMISS_KEY, Date.now().toString())
		} catch {}
	}, [])

	// Escape key handler
	useEffect(() => {
		if (!show) return
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") dismiss()
		}
		document.addEventListener("keydown", handler)
		return () => document.removeEventListener("keydown", handler)
	}, [show, dismiss])

	// Focus the panel when shown for accessibility
	useEffect(() => {
		if (show && panelRef.current) {
			panelRef.current.focus()
		}
	}, [show])

	const handleInstall = useCallback(async () => {
		if (nativePrompt) {
			nativePrompt.prompt()
			const { outcome } = await nativePrompt.userChoice
			if (outcome === "accepted") {
				setShow(false)
			}
			setNativePrompt(null)
		}
		dismiss()
	}, [nativePrompt, dismiss])

	/**
	 * Determine which instructions to show:
	 * - iOS + Safari → standard iOS steps
	 * - iOS + non-Safari → "open in Safari" hint
	 * - Android + Chrome (with native prompt) → trigger native install
	 * - Android + Chrome (no native prompt) → manual Chrome steps
	 * - Android + non-Chrome → "open in Chrome" hint
	 */
	const renderSteps = () => {
		if (device.isIOS) {
			if (device.isSafari) return <IOSSteps />
			return <IOSNonSafariSteps />
		}
		// Android
		if (device.isChrome) return <AndroidSteps />
		return <AndroidNonChromeSteps />
	}

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
					onClick={dismiss}
				>
					<motion.div
						ref={panelRef}
						initial={{ y: "100%" }}
						animate={{ y: 0 }}
						exit={{ y: "100%" }}
						transition={{ type: "spring", damping: 28, stiffness: 300 }}
						onClick={(e) => e.stopPropagation()}
						role="dialog"
						aria-modal="true"
						aria-labelledby="pwa-install-title"
						tabIndex={-1}
						className={cn(
							"w-full max-w-lg bg-[#1B1F24] rounded-t-[22px] p-6 pb-8 flex flex-col gap-5 outline-none",
							dmSansClassName(),
						)}
						style={{
							boxShadow:
								"0 -4px 24px 0 rgba(0, 0, 0, 0.4), 0.5px 0.5px 0.5px 0 rgba(255, 255, 255, 0.08) inset",
						}}
					>
						{/* Header */}
						<div className="flex items-start justify-between">
							<div className="flex items-center gap-3">
								<div className="size-12 rounded-[12px] bg-[#0D121A] flex items-center justify-center border border-[rgba(115,115,115,0.15)]">
									<GradientLogo className="size-7" />
								</div>
								<div>
									<h2
										id="pwa-install-title"
										className={cn(
											"text-[18px] font-semibold text-[#fafafa]",
											dmSans125ClassName(),
										)}
									>
										Supermemory
									</h2>
									<p className="text-[14px] text-[#737373] font-medium">
										Your memories, wherever you are
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={dismiss}
								className="bg-[#0D121A] size-7 flex items-center justify-center rounded-full border border-[rgba(115,115,115,0.2)] shrink-0"
								style={{
									boxShadow:
										"0 0.711px 2.842px 0 rgba(0, 0, 0, 0.25), 0.178px 0.178px 0.178px 0 rgba(255, 255, 255, 0.10) inset",
								}}
							>
								<XIcon className="size-4 text-[#737373]" />
								<span className="sr-only">Close</span>
							</button>
						</div>

						{/* Feature pills */}
						<div className="flex gap-2">
							{FEATURES.map((f) => (
								<div
									key={f.label}
									className="flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-[12px] bg-[#0D121A] border border-[rgba(115,115,115,0.1)]"
								>
									<f.icon className="size-5 text-[#4BA0FA]" />
									<span className="text-[12px] text-[#d0dae7] font-medium text-center leading-tight">
										{f.label}
									</span>
								</div>
							))}
						</div>

						{/* Install steps */}
						<div className="flex flex-col gap-3">
							<p
								className={cn(
									"text-[15px] font-semibold text-[#fafafa]",
									dmSans125ClassName(),
								)}
							>
								Install for a better experience
							</p>
							{renderSteps()}
						</div>

						{/* Action */}
						<div className="flex flex-col gap-2 mt-1">
							<button
								type="button"
								onClick={
									nativePrompt && device.isAndroid && device.isChrome
										? handleInstall
										: dismiss
								}
								className={cn(
									"w-full py-3 rounded-[12px] bg-[#2261CA] text-white text-[15px] font-semibold transition-colors hover:bg-[#1a4fa0]",
									dmSansClassName(),
								)}
							>
								{nativePrompt && device.isAndroid && device.isChrome
									? "Install now"
									: "Got it"}
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function StepRow({
	step,
	children,
}: {
	step: number
	children: React.ReactNode
}) {
	return (
		<div className="flex items-center gap-3">
			<span className="size-7 shrink-0 rounded-full bg-[#0D121A] border border-[rgba(115,115,115,0.15)] flex items-center justify-center text-[13px] font-semibold text-[#4BA0FA]">
				{step}
			</span>
			<span className="text-[14px] text-[#d0dae7]">{children}</span>
		</div>
	)
}

function IOSSteps() {
	return (
		<div className="flex flex-col gap-3">
			<StepRow step={1}>
				Tap the share button{" "}
				<ShareIcon className="inline-block size-4 align-text-bottom mx-0.5 text-[#4BA0FA]" />{" "}
				in Safari
			</StepRow>
			<StepRow step={2}>
				Scroll down and tap{" "}
				<strong className="text-[#fafafa]">Add to Home Screen</strong>
			</StepRow>
			<StepRow step={3}>
				Tap <strong className="text-[#fafafa]">Add</strong> to install
			</StepRow>
		</div>
	)
}

function IOSNonSafariSteps() {
	return (
		<div className="flex flex-col gap-3">
			<StepRow step={1}>
				Open this page in <strong className="text-[#fafafa]">Safari</strong>
			</StepRow>
			<StepRow step={2}>
				Tap the share button{" "}
				<ShareIcon className="inline-block size-4 align-text-bottom mx-0.5 text-[#4BA0FA]" />
			</StepRow>
			<StepRow step={3}>
				Tap <strong className="text-[#fafafa]">Add to Home Screen</strong>
			</StepRow>
		</div>
	)
}

function AndroidSteps() {
	return (
		<div className="flex flex-col gap-3">
			<StepRow step={1}>
				Tap the menu button{" "}
				<MoreVertIcon className="inline-block size-4 align-text-bottom mx-0.5 text-[#4BA0FA]" />{" "}
				in Chrome
			</StepRow>
			<StepRow step={2}>
				Tap <strong className="text-[#fafafa]">Add to Home screen</strong>
			</StepRow>
			<StepRow step={3}>
				Tap <strong className="text-[#fafafa]">Install</strong> to confirm
			</StepRow>
		</div>
	)
}

function AndroidNonChromeSteps() {
	return (
		<div className="flex flex-col gap-3">
			<StepRow step={1}>
				Open this page in <strong className="text-[#fafafa]">Chrome</strong>
			</StepRow>
			<StepRow step={2}>
				Tap the menu button{" "}
				<MoreVertIcon className="inline-block size-4 align-text-bottom mx-0.5 text-[#4BA0FA]" />
			</StepRow>
			<StepRow step={3}>
				Tap <strong className="text-[#fafafa]">Add to Home screen</strong>
			</StepRow>
		</div>
	)
}

function ShareIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden="true"
		>
			<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
			<polyline points="16 6 12 2 8 6" />
			<line x1="12" y1="2" x2="12" y2="15" />
		</svg>
	)
}

function MoreVertIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			className={className}
			aria-hidden="true"
		>
			<circle cx="12" cy="5" r="2" />
			<circle cx="12" cy="12" r="2" />
			<circle cx="12" cy="19" r="2" />
		</svg>
	)
}

/**
 * Type for the `beforeinstallprompt` event (not yet in TS lib).
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent
	}
}
