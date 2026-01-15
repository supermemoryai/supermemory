import { motion } from "motion/react"
import { Button } from "@ui/components/button"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import {
	parseXHandle,
	parseLinkedInHandle,
	toXProfileUrl,
	toLinkedInProfileUrl,
} from "@/lib/url-helpers"

interface ProfileStepProps {
	onSubmit: (data: {
		twitter: string
		linkedin: string
		description: string
		otherLinks: string[]
	}) => void
}

type ValidationError = {
	twitter: string | null
	linkedin: string | null
}

export function ProfileStep({ onSubmit }: ProfileStepProps) {
	const router = useRouter()
	const [otherLinks, setOtherLinks] = useState([""])
	const [twitterHandle, setTwitterHandle] = useState("")
	const [linkedinProfile, setLinkedinProfile] = useState("")
	const [description, setDescription] = useState("")
	const [isSubmitting] = useState(false)
	const [errors, setErrors] = useState<ValidationError>({
		twitter: null,
		linkedin: null,
	})

	const addOtherLink = () => {
		if (otherLinks.length < 3) {
			setOtherLinks([...otherLinks, ""])
		}
	}

	const updateOtherLink = (index: number, value: string) => {
		const updated = [...otherLinks]
		updated[index] = value
		setOtherLinks(updated)
	}

	const validateTwitterHandle = (handle: string): string | null => {
		if (!handle.trim()) return null

		// Basic validation: handle should be alphanumeric, underscore, or hyphen
		// X/Twitter handles can contain letters, numbers, and underscores, max 15 chars
		const handlePattern = /^[a-zA-Z0-9_]{1,15}$/
		if (!handlePattern.test(handle.trim())) {
			return "Enter your handle or profile link"
		}

		return null
	}

	const validateLinkedInHandle = (handle: string): string | null => {
		if (!handle.trim()) return null

		// Basic validation: LinkedIn handles are typically alphanumeric with hyphens
		// They can be quite long, so we'll be lenient
		const handlePattern = /^[a-zA-Z0-9-]+$/
		if (!handlePattern.test(handle.trim())) {
			return "Enter your handle or profile link"
		}

		return null
	}

	const handleTwitterChange = (value: string) => {
		const parsedHandle = parseXHandle(value)
		setTwitterHandle(parsedHandle)
		const error = validateTwitterHandle(parsedHandle)
		setErrors((prev) => ({ ...prev, twitter: error }))
	}

	const handleLinkedInChange = (value: string) => {
		const parsedHandle = parseLinkedInHandle(value)
		setLinkedinProfile(parsedHandle)
		const error = validateLinkedInHandle(parsedHandle)
		setErrors((prev) => ({ ...prev, linkedin: error }))
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
			className="text-center w-full "
		>
			<h2 className="text-white text-[32px] font-medium mb-4 mt-[-36px]">
				Let's add your memories
			</h2>

			<div className="space-y-4 max-w-[329px] mx-auto overflow-visible gap-4">
				<div className="text-left gap-[6px] flex flex-col" id="x-twitter-field">
					<label
						htmlFor="twitter-handle"
						className="text-white text-sm font-medium block pl-2"
					>
						X/Twitter
					</label>
					<div className="relative flex items-center">
						<div
							className={`flex items-center border rounded-xl overflow-hidden h-[40px] w-full ${
								errors.twitter
									? "border-[#52596633] bg-[#290F0A]"
									: "border-onboarding/20"
							}`}
						>
							<div className="px-3 py-2 bg-[#070E1B] text-white/60 text-sm border-r border-onboarding/20 whitespace-nowrap">
								x.com/
							</div>
							<input
								id="twitter-handle"
								type="text"
								placeholder="handle"
								value={twitterHandle}
								onChange={(e) => handleTwitterChange(e.target.value)}
								onBlur={() => {
									if (twitterHandle.trim()) {
										const error = validateTwitterHandle(twitterHandle)
										setErrors((prev) => ({ ...prev, twitter: error }))
									}
								}}
								className={`flex-1 px-4 py-2 bg-[#070E1B] text-white placeholder-onboarding focus:outline-none transition-colors ${
									errors.twitter ? "bg-[#290F0A]" : ""
								}`}
							/>
						</div>
						{errors.twitter && (
							<div className="absolute left-full ml-3">
								<div
									className={cn(
										"relative shrink-0 px-3 py-2 bg-[#290F0A] text-[#C73B1B] rounded-xl",
										dmSansClassName(),
									)}
								>
									<div className="absolute left-0.5 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-8 border-t-transparent border-b-transparent border-[#290F0A]" />
									<p className="text-xs whitespace-nowrap">{errors.twitter}</p>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="text-left gap-[6px] flex flex-col" id="linkedin-field">
					<label
						htmlFor="linkedin-profile"
						className="text-white text-sm font-medium block pl-2"
					>
						LinkedIn
					</label>
					<div className="relative flex items-center">
						<div
							className={`flex items-center border rounded-xl overflow-hidden h-[40px] w-full ${
								errors.linkedin
									? "border-[#52596633] bg-[#290F0A]"
									: "border-onboarding/20"
							}`}
						>
							<div className="px-3 py-2 bg-[#070E1B] text-white/60 text-sm border-r border-onboarding/20 whitespace-nowrap w-[140px]">
								linkedin.com/in/
							</div>
							<input
								id="linkedin-profile"
								type="text"
								placeholder="username"
								value={linkedinProfile}
								onChange={(e) => handleLinkedInChange(e.target.value)}
								onBlur={() => {
									if (linkedinProfile.trim()) {
										const error = validateLinkedInHandle(linkedinProfile)
										setErrors((prev) => ({ ...prev, linkedin: error }))
									}
								}}
								className={`flex-1 px-4 py-2 bg-[#070E1B] text-white placeholder-onboarding focus:outline-none transition-colors ${
									errors.linkedin ? "bg-[#290F0A]" : ""
								}`}
							/>
						</div>
						{errors.linkedin && (
							<div className="absolute left-full ml-3">
								<div
									className={cn(
										"relative shrink-0 px-3 py-2 bg-[#290F0A] text-[#C73B1B] rounded-xl",
										dmSansClassName(),
									)}
								>
									<div className="absolute left-0.5 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-8 border-t-transparent border-b-transparent border-[#290F0A]" />
									<p className="text-xs whitespace-nowrap">{errors.linkedin}</p>
								</div>
							</div>
						)}
					</div>
				</div>

				<div
					className="text-left gap-[6px] flex flex-col"
					id="other-links-field"
				>
					<div className="flex items-center justify-between">
						<label
							htmlFor="other-links"
							className="text-white text-sm font-medium pl-2"
						>
							Other links
						</label>
						<span className="text-onboarding text-[10px]">Upto 3</span>
					</div>
					<div className="flex flex-col gap-1.5">
						{otherLinks.map((link, index) => (
							<div
								key={`other-link-${index}`}
								className="flex items-center relative"
							>
								<input
									id={`other-links-${index}`}
									type="text"
									placeholder="Add your website, GitHub, Notion..."
									value={link}
									onChange={(e) => updateOtherLink(index, e.target.value)}
									className="flex-1 px-4 py-2 bg-[#070E1B] border border-onboarding/20 rounded-xl text-white placeholder-onboarding focus:outline-none focus:border-[#4A4A4A] transition-colors h-[40px]"
								/>
								{index === otherLinks.length - 1 && otherLinks.length < 3 && (
									<button
										type="button"
										onClick={(e) => {
											e.preventDefault()
											e.stopPropagation()
											addOtherLink()
										}}
										className="size-8 m-1 absolute right-0 top-0 bg-black border border-[#161F2C] rounded-lg flex items-center justify-center text-white hover:bg-[#161F2C] transition-colors text-xl"
									>
										+
									</button>
								)}
							</div>
						))}
					</div>
				</div>

				<div
					className="text-left gap-[6px] flex flex-col"
					id="description-field"
				>
					<label
						htmlFor="description"
						className="text-white text-sm font-medium block pl-2"
					>
						What do you do? What do you like?
					</label>
					<textarea
						id="description"
						placeholder="Tell me the basics in your words. A few lines about your work, interests, etc."
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={2}
						className="w-full px-4 py-2 bg-[#070E1B] border border-onboarding/20 rounded-xl text-white placeholder-onboarding focus:outline-none focus:border-[#4A4A4A] transition-colors min-h-16"
					/>
				</div>
			</div>

			<motion.div
				animate={{
					opacity: 1,
					y: 0,
				}}
				transition={{ duration: 1, ease: "easeOut", delay: 1 }}
				initial={{ opacity: 0, y: 10 }}
				className="mt-[24px] pb-30"
			>
				<Button
					variant="onboarding"
					disabled={isSubmitting}
					style={{
						background: "linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
					}}
					onClick={() => {
						const formData = {
							twitter: toXProfileUrl(twitterHandle),
							linkedin: toLinkedInProfileUrl(linkedinProfile),
							description: description,
							otherLinks: otherLinks.filter((l) => l.trim()),
						}
						onSubmit(formData)
						router.push("/new/onboarding?flow=setup&step=relatable")
					}}
				>
					{isSubmitting ? "Fetching..." : "Remember this →"}
				</Button>
			</motion.div>
		</motion.div>
	)
}
