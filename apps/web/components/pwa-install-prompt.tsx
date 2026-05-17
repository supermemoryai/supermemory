"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import Image from "next/image"
import { cn } from "@lib/utils"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import { XIcon, Check } from "lucide-react"
import { Drawer, DrawerContent, DrawerTitle } from "@ui/components/drawer"
import { Button } from "@ui/components/button"

const PWA_DISMISS_KEY = "pwa-install-dismissed"
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000

const INSET =
	"shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.1)]"
const CARD_INSET = "shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]"

type DeviceInfo = {
	isIOS: boolean
	isAndroid: boolean
	isSafari: boolean
	isChrome: boolean
}

let memoryDismissed = false

function getDeviceInfo(): DeviceInfo {
	if (typeof window === "undefined")
		return { isIOS: false, isAndroid: false, isSafari: false, isChrome: false }
	const ua = navigator.userAgent
	const isIOS =
		/iPad|iPhone|iPod/.test(ua) ||
		(/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
	const isAndroid = /Android/.test(ua)
	const isSafari =
		/Safari/.test(ua) && !/CriOS|FxiOS|Chrome|Chromium|Edg|OPR|Opera/.test(ua)
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

const BENEFITS = [
	"Instant launch",
	"Full-screen mode",
	"Native-app feel",
	"Stays signed in",
]

type Step = {
	title: string
	description: ReactNode
}

function buildSteps(device: DeviceInfo): Step[] {
	if (device.isIOS) {
		if (device.isSafari) {
			return [
				{
					title: "Open the share menu",
					description: (
						<>
							Tap the share icon{" "}
							<ShareIcon className="inline-block size-3.5 align-text-bottom mx-0.5 text-[#4BA0FA]" />{" "}
							at the bottom of Safari.
						</>
					),
				},
				{
					title: "Add to Home Screen",
					description:
						"Scroll down in the share sheet and tap Add to Home Screen.",
				},
				{
					title: "Confirm",
					description: "Tap Add in the top right to install.",
				},
			]
		}
		return [
			{
				title: "Open this page in Safari",
				description:
					"The install flow only works inside Safari on iPhone and iPad.",
			},
			{
				title: "Open the share menu",
				description: (
					<>
						Tap the share icon{" "}
						<ShareIcon className="inline-block size-3.5 align-text-bottom mx-0.5 text-[#4BA0FA]" />{" "}
						at the bottom.
					</>
				),
			},
			{
				title: "Add to Home Screen",
				description: "Choose Add to Home Screen and confirm.",
			},
		]
	}
	if (device.isChrome) {
		return [
			{
				title: "Open the Chrome menu",
				description: (
					<>
						Tap the menu icon{" "}
						<MoreVertIcon className="inline-block size-3.5 align-text-bottom mx-0.5 text-[#4BA0FA]" />{" "}
						in the top right.
					</>
				),
			},
			{
				title: "Add to Home screen",
				description: "Tap Add to Home screen from the menu.",
			},
			{
				title: "Confirm",
				description: "Tap Install to finish.",
			},
		]
	}
	return [
		{
			title: "Open this page in Chrome",
			description: "Install works best from Chrome on Android.",
		},
		{
			title: "Open the Chrome menu",
			description: (
				<>
					Tap the menu icon{" "}
					<MoreVertIcon className="inline-block size-3.5 align-text-bottom mx-0.5 text-[#4BA0FA]" />{" "}
					in the top right.
				</>
			),
		},
		{
			title: "Add to Home screen",
			description: "Choose Add to Home screen and confirm.",
		},
	]
}

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

	useEffect(() => {
		const info = getDeviceInfo()
		setDevice(info)

		const handleBeforeInstall = (e: Event) => {
			e.preventDefault()
			setNativePrompt(e as BeforeInstallPromptEvent)
		}
		window.addEventListener("beforeinstallprompt", handleBeforeInstall)

		const isMobile = info.isIOS || info.isAndroid
		let timer: ReturnType<typeof setTimeout> | undefined
		if (isMobile && !isStandalone() && !isDismissed()) {
			timer = setTimeout(() => setShow(true), 1500)
		}
		return () => {
			if (timer) clearTimeout(timer)
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

	const handleInstall = useCallback(async () => {
		if (nativePrompt) {
			nativePrompt.prompt()
			await nativePrompt.userChoice
			setNativePrompt(null)
		}
		dismiss()
	}, [nativePrompt, dismiss])

	const canNativeInstall = !!nativePrompt && device.isAndroid && device.isChrome
	const steps = buildSteps(device)

	return (
		<Drawer open={show} onOpenChange={(open) => !open && dismiss()}>
			<DrawerContent
				className={cn(
					"flex flex-col gap-0 border-none bg-[#1B1F24] p-0",
					"max-h-[92svh] overflow-hidden",
					"[&>div:first-child]:bg-[#3A4252] [&>div:first-child]:h-1 [&>div:first-child]:w-9 [&>div:first-child]:mt-2.5 [&>div:first-child]:mb-1",
					dmSansClassName(),
				)}
			>
				<DrawerTitle className="sr-only">Install Supermemory</DrawerTitle>

				<div
					className={cn(
						"flex flex-col gap-4 px-4 pt-3",
						"pb-[max(1rem,env(safe-area-inset-bottom))]",
					)}
				>
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-3 min-w-0">
							<Image
								src="/android-chrome-512x512.png"
								alt=""
								width={48}
								height={48}
								className="size-12 shrink-0"
								priority
							/>
							<div className="min-w-0">
								<h2
									className={cn(
										"text-[17px] font-semibold text-[#FAFAFA] leading-tight",
										dmSans125ClassName(),
									)}
								>
									Install Supermemory
								</h2>
								<p
									className={cn(
										"text-[13px] text-[#737373] leading-snug mt-0.5",
										dmSans125ClassName(),
									)}
								>
									Your memories, one tap away.
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={dismiss}
							aria-label="Dismiss install prompt"
							className={cn(
								"size-7 shrink-0 flex items-center justify-center rounded-full bg-[#0D121A] transition-opacity hover:opacity-80",
								INSET,
							)}
						>
							<XIcon className="size-3.5 text-[#737373]" />
						</button>
					</div>

					<div
						className={cn(
							"rounded-[14px] bg-[#14161A] p-5 flex flex-col gap-5",
							CARD_INSET,
						)}
					>
						<div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
							{BENEFITS.map((text) => (
								<div key={text} className="flex items-start gap-2">
									<Check className="size-4 shrink-0 text-[#4BA0FA] mt-0.5" />
									<span
										className={cn(
											"text-[13px] text-[#E4E4E7] leading-snug",
											dmSans125ClassName(),
										)}
									>
										{text}
									</span>
								</div>
							))}
						</div>

						<div className="h-px bg-white/[0.06]" />

						<ol className="flex min-w-0 flex-col">
							{steps.map((step, i) => (
								<li key={step.title} className="flex min-w-0 gap-3">
									<div className="flex flex-col items-center">
										<span
											className={cn(
												"flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#0D121A] text-[11px] font-semibold text-[#4BA0FA]",
												INSET,
											)}
										>
											{i + 1}
										</span>
										{i < steps.length - 1 && (
											<span className="w-px flex-1 bg-white/[0.10] my-1" />
										)}
									</div>
									<div
										className={cn(
											"min-w-0 flex-1 space-y-0.5",
											i < steps.length - 1 ? "pb-4" : "",
										)}
									>
										<p
											className={cn(
												"text-[13px] font-semibold text-[#FAFAFA] leading-tight",
												dmSans125ClassName(),
											)}
										>
											{step.title}
										</p>
										<p
											className={cn(
												"text-[12px] leading-relaxed text-[#A1A1AA]",
												dmSans125ClassName(),
											)}
										>
											{step.description}
										</p>
									</div>
								</li>
							))}
						</ol>
					</div>

					<Button
						variant="insideOut"
						onClick={canNativeInstall ? handleInstall : dismiss}
						className={cn("h-12 w-full px-5 text-[15px]", dmSansClassName())}
					>
						{canNativeInstall ? "Install now" : "Got it"}
					</Button>
				</div>
			</DrawerContent>
		</Drawer>
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

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent
	}
}
