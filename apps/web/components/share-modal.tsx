"use client"

import { useState, useRef, useCallback } from "react"
import { dmSansClassName, dmSans125ClassName } from "@/lib/fonts"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog"
import { Button } from "@ui/components/button"
import { cn } from "@lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon, Download, Copy, Check } from "lucide-react"
import { GradientLogo } from "@ui/assets/Logo"
import { useAuth } from "@lib/auth-context"
import { toast } from "sonner"
import * as htmlToImage from "html-to-image"

type BackgroundTheme = "gradient" | "dark-gradient" | "black"

interface ShareModalProps {
	isOpen: boolean
	onClose: () => void
	graphCanvasRef?: React.RefObject<HTMLCanvasElement | null>
}

// X/Twitter icon
const XIcon2 = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 16 16"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M12.6 0.75H15.054L9.694 6.89L16 15.25H11.063L7.196 10.176L2.771 15.25H0.316L6.05 8.682L0 0.75H5.063L8.558 5.391L12.6 0.75ZM11.74 13.77H13.1L4.324 2.145H2.865L11.74 13.77Z"
			fill="#737373"
		/>
	</svg>
)

// LinkedIn icon
const LinkedInIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 16 16"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M3.58065 4.89474H0V16H3.58065V4.89474ZM1.79032 0C0.801613 0 0 0.801613 0 1.79032C0 2.77903 0.801613 3.58065 1.79032 3.58065C2.77903 3.58065 3.58065 2.77903 3.58065 1.79032C3.58065 0.801613 2.77903 0 1.79032 0ZM8.71613 4.89474H5.33871V16H8.71613V10.0645C8.71613 8.46774 9.11774 6.93548 11.1613 6.93548C13.1774 6.93548 13.2097 8.75806 13.2097 10.1613V16H16V9.48387C16 6.74194 15.3871 4.64516 12.1935 4.64516C10.6452 4.64516 9.59677 5.48387 9.16129 6.27419H9.12903V4.89474H8.71613Z"
			fill="#737373"
		/>
	</svg>
)

// Instagram icon
const InstagramIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 13 13"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<rect
			x="1.08333"
			y="1.08333"
			width="10.8333"
			height="10.8333"
			rx="2.58333"
			stroke="#737373"
			strokeWidth="1.08333"
		/>
		<circle
			cx="6.5"
			cy="6.5"
			r="2.16667"
			stroke="#737373"
			strokeWidth="1.08333"
		/>
		<circle cx="9.75" cy="3.25" r="0.8125" fill="#737373" />
	</svg>
)

// Background gradient overlay component
const BackgroundGradient = ({
	theme,
	className,
}: {
	theme: BackgroundTheme
	className?: string
}) => {
	if (theme === "black") {
		return (
			<div className={cn("absolute inset-0 bg-black", className)}>
				{/* Dotted pattern */}
				<div
					className="absolute inset-0 opacity-20"
					style={{
						backgroundImage:
							"radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
						backgroundSize: "12px 12px",
					}}
				/>
			</div>
		)
	}

	if (theme === "dark-gradient") {
		return (
			<div className={cn("absolute inset-0", className)}>
				{/* Base dark background */}
				<div className="absolute inset-0 bg-[#030710]" />
				{/* Blue glow effect */}
				<div
					className="absolute inset-0"
					style={{
						background:
							"radial-gradient(ellipse 60% 50% at 50% 100%, rgba(30, 90, 200, 0.3) 0%, transparent 70%)",
					}}
				/>
				<div
					className="absolute inset-0"
					style={{
						background:
							"radial-gradient(ellipse 40% 30% at 30% 80%, rgba(60, 120, 255, 0.15) 0%, transparent 70%)",
					}}
				/>
				{/* Dotted pattern */}
				<div
					className="absolute inset-0 opacity-20"
					style={{
						backgroundImage:
							"radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
						backgroundSize: "12px 12px",
					}}
				/>
			</div>
		)
	}

	// Default: gradient theme (first screenshot)
	return (
		<div className={cn("absolute inset-0", className)}>
			{/* Base dark blue gradient */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"linear-gradient(180deg, #030B1A 0%, #0A1A35 50%, #1A3A6A 100%)",
				}}
			/>
			{/* Blue glow from bottom */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 80% 50% at 50% 100%, rgba(30, 100, 220, 0.4) 0%, transparent 70%)",
				}}
			/>
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 50% 30% at 20% 90%, rgba(60, 140, 255, 0.2) 0%, transparent 60%)",
				}}
			/>
			{/* Dotted pattern */}
			<div
				className="absolute inset-0 opacity-20"
				style={{
					backgroundImage:
						"radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
					backgroundSize: "12px 12px",
				}}
			/>
		</div>
	)
}

// Theme selector button
const ThemeButton = ({
	theme,
	isSelected,
	onClick,
}: {
	theme: BackgroundTheme
	isSelected: boolean
	onClick: () => void
}) => {
	const getPreviewContent = () => {
		if (theme === "black") {
			return <div className="w-full h-full bg-black rounded" />
		}
		if (theme === "dark-gradient") {
			return (
				<div className="w-full h-full rounded relative overflow-hidden">
					<div className="absolute inset-0 bg-[#030710]" />
					<div
						className="absolute inset-0"
						style={{
							background:
								"radial-gradient(ellipse 60% 50% at 50% 100%, rgba(30, 90, 200, 0.4) 0%, transparent 70%)",
						}}
					/>
				</div>
			)
		}
		return (
			<div className="w-full h-full rounded relative overflow-hidden">
				<div
					className="absolute inset-0"
					style={{
						background:
							"linear-gradient(180deg, #030B1A 0%, #0A1A35 50%, #1A3A6A 100%)",
					}}
				/>
				<div
					className="absolute inset-0"
					style={{
						background:
							"radial-gradient(ellipse 80% 50% at 50% 100%, rgba(30, 100, 220, 0.5) 0%, transparent 70%)",
					}}
				/>
			</div>
		)
	}

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"w-10 h-8 rounded overflow-hidden transition-all",
				isSelected
					? "ring-2 ring-[#4BA0FA] ring-offset-1 ring-offset-transparent"
					: "border border-[rgba(115,115,115,0.2)]",
			)}
			style={{
				background: "#0D121A",
				boxShadow: "inset 1.3125px 1.3125px 3.9375px rgba(0, 0, 0, 0.7)",
			}}
		>
			{getPreviewContent()}
		</button>
	)
}

// Social button component
const SocialButton = ({
	icon,
	onClick,
	label,
}: {
	icon: React.ReactNode
	onClick: () => void
	label: string
}) => (
	<button
		type="button"
		onClick={onClick}
		className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
		style={{
			background: "#0D121A",
			border: "0.875px solid rgba(115, 115, 115, 0.2)",
			boxShadow: "inset 1.3125px 1.3125px 3.9375px rgba(0, 0, 0, 0.7)",
		}}
		title={label}
	>
		{icon}
	</button>
)

export function ShareModal({
	isOpen,
	onClose,
	graphCanvasRef,
}: ShareModalProps) {
	const { user } = useAuth()
	const [selectedTheme, setSelectedTheme] =
		useState<BackgroundTheme>("gradient")
	const [isCopying, setIsCopying] = useState(false)
	const [copied, setCopied] = useState(false)
	const previewRef = useRef<HTMLDivElement>(null)

	const displayName =
		user?.displayUsername ||
		(typeof window !== "undefined" ? localStorage.getItem("username") : null) ||
		(typeof window !== "undefined" ? localStorage.getItem("userName") : null) ||
		""
	const userName = displayName ? `${displayName.split(" ")[0]}'s` : "Your"

	const capturePreview = useCallback(async (): Promise<Blob | null> => {
		if (!previewRef.current) return null

		try {
			const dataUrl = await htmlToImage.toPng(previewRef.current, {
				pixelRatio: 2,
				quality: 1,
			})

			// Convert data URL to blob
			const response = await fetch(dataUrl)
			const blob = await response.blob()
			return blob
		} catch (error) {
			console.error("Failed to capture preview:", error)
			return null
		}
	}, [])

	const handleCopySnapshot = useCallback(async () => {
		setIsCopying(true)
		try {
			const blob = await capturePreview()
			if (!blob) {
				throw new Error("Failed to capture image")
			}

			await navigator.clipboard.write([
				new ClipboardItem({
					"image/png": blob,
				}),
			])

			setCopied(true)
			toast.success("Snapshot copied to clipboard!")
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.error("Failed to copy:", error)
			toast.error("Failed to copy snapshot. Try downloading instead.")
		} finally {
			setIsCopying(false)
		}
	}, [capturePreview])

	const handleDownload = useCallback(async () => {
		try {
			const blob = await capturePreview()
			if (!blob) {
				throw new Error("Failed to capture image")
			}

			const url = URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = url
			a.download = `supermemory-graph-${Date.now()}.png`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)

			toast.success("Snapshot downloaded!")
		} catch (error) {
			console.error("Failed to download:", error)
			toast.error("Failed to download snapshot")
		}
	}, [capturePreview])

	const handleShareTwitter = useCallback(async () => {
		const text = encodeURIComponent(
			"Check out my knowledge graph on supermemory! 🧠\n\nhttps://supermemory.ai",
		)
		window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
	}, [])

	const handleShareLinkedIn = useCallback(async () => {
		const url = encodeURIComponent("https://supermemory.ai")
		window.open(
			`https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
			"_blank",
		)
	}, [])

	const handleShareInstagram = useCallback(async () => {
		// Instagram doesn't have a direct share URL, so we'll download and show a message
		await handleDownload()
		toast.info("Image downloaded! You can now share it on Instagram.")
	}, [handleDownload])

	const handleClose = () => {
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent
				className={cn(
					"w-[90%]! max-w-[706px]! border-none bg-[#1B1F24] flex flex-col p-4 gap-4 rounded-[22px]",
					dmSansClassName(),
				)}
				style={{
					boxShadow:
						"0 2.842px 14.211px 0 rgba(0, 0, 0, 0.25), 0.711px 0.711px 0.711px 0 rgba(255, 255, 255, 0.10) inset",
				}}
				showCloseButton={false}
			>
				<div className="flex flex-col gap-3">
					{/* Header */}
					<div className="flex justify-between items-center px-2">
						<DialogHeader className="flex-1">
							<DialogTitle
								className={cn(
									"font-semibold text-[#fafafa] text-base text-center",
									dmSans125ClassName(),
								)}
							>
								Share snapshot of your supermemory
							</DialogTitle>
						</DialogHeader>
						<DialogPrimitive.Close
							onClick={handleClose}
							className="bg-[#0D121A] w-7 h-7 flex items-center justify-center focus:ring-ring rounded-full transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border border-[rgba(115,115,115,0.2)] shrink-0"
							style={{
								boxShadow:
									"0 0.711px 2.842px 0 rgba(0, 0, 0, 0.25), 0.178px 0.178px 0.178px 0 rgba(255, 255, 255, 0.10) inset",
							}}
						>
							<XIcon className="size-4 text-[#737373]" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>

					{/* Preview area */}
					<div
						ref={previewRef}
						className="relative w-full aspect-[674/505] rounded-[14px] overflow-hidden"
						style={{
							boxShadow: "inset 2.42px 2.42px 4.26316px rgba(11, 15, 21, 0.7)",
						}}
					>
						<BackgroundGradient theme={selectedTheme} />

						{/* Branding header */}
						<div className="absolute top-4 left-4 flex items-center gap-2 z-10">
							<GradientLogo className="w-7 h-6" />
							<div className="flex flex-col">
								<span className="text-[10px] text-white/70 leading-tight">
									{userName}
								</span>
								<span className="text-sm text-white font-semibold leading-tight">
									supermemory
								</span>
							</div>
						</div>

						{/* Graph canvas placeholder - will show the actual graph */}
						<div className="absolute inset-0 flex items-center justify-center">
							{graphCanvasRef?.current ? (
								<img
									src={graphCanvasRef.current.toDataURL("image/png")}
									alt="Memory graph"
									className="max-w-full max-h-full object-contain"
								/>
							) : (
								<div className="text-white/30 text-sm">
									Graph preview will appear here
								</div>
							)}
						</div>
					</div>

					{/* Bottom controls */}
					<div className="flex justify-between items-center">
						{/* Theme selectors */}
						<div className="flex items-center gap-2">
							<ThemeButton
								theme="gradient"
								isSelected={selectedTheme === "gradient"}
								onClick={() => setSelectedTheme("gradient")}
							/>
							<ThemeButton
								theme="dark-gradient"
								isSelected={selectedTheme === "dark-gradient"}
								onClick={() => setSelectedTheme("dark-gradient")}
							/>
							<ThemeButton
								theme="black"
								isSelected={selectedTheme === "black"}
								onClick={() => setSelectedTheme("black")}
							/>
						</div>

						{/* Action buttons */}
						<div className="flex items-center gap-2">
							<Button
								onClick={handleCopySnapshot}
								disabled={isCopying}
								className={cn(
									"h-8 px-3 rounded-full text-sm font-normal gap-1.5",
									dmSansClassName(),
								)}
								style={{
									background: "#0D121A",
									border: "1px solid rgba(115, 115, 115, 0.2)",
									boxShadow: "inset 1.5px 1.5px 4.5px rgba(0, 0, 0, 0.7)",
								}}
							>
								{copied ? (
									<>
										<Check className="size-4 text-green-500" />
										<span className="text-green-500">Copied!</span>
									</>
								) : (
									<>
										<span className="text-white">Copy snapshot</span>
										<Copy className="size-4 text-[#737373]" />
									</>
								)}
							</Button>

							<SocialButton
								icon={<Download className="size-4 text-[#737373]" />}
								onClick={handleDownload}
								label="Download"
							/>
							<SocialButton
								icon={<XIcon2 className="size-4" />}
								onClick={handleShareTwitter}
								label="Share on X"
							/>
							<SocialButton
								icon={<LinkedInIcon className="size-4" />}
								onClick={handleShareLinkedIn}
								label="Share on LinkedIn"
							/>
							<SocialButton
								icon={<InstagramIcon className="size-[13px]" />}
								onClick={handleShareInstagram}
								label="Share on Instagram"
							/>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
