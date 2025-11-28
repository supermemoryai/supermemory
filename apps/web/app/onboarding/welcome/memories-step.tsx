import { motion } from "motion/react"
import { Button } from "@ui/components/button"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"

interface MemoriesStepProps {
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

export function MemoriesStep({ onSubmit }: MemoriesStepProps) {
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

	const validateTwitterLink = (value: string): string | null => {
		if (!value.trim()) return null

		const normalized = value.trim().toLowerCase()
		const isXDomain =
			normalized.includes("x.com") || normalized.includes("twitter.com")

		if (!isXDomain) {
			return "share your X profile link"
		}

		// Check if it's a profile link (not a status/tweet link)
		const profilePattern =
			/^(https?:\/\/)?(www\.)?(x\.com|twitter\.com)\/[^\/]+$/
		const statusPattern = /\/status\//i

		if (statusPattern.test(normalized) || !profilePattern.test(normalized)) {
			return "share your X profile link"
		}

		// Note: 404 validation would require a backend API endpoint
		// Format validation is handled above
		return null
	}

	const validateLinkedInLink = (value: string): string | null => {
		if (!value.trim()) return null

		const normalized = value.trim().toLowerCase()
		const isLinkedInDomain = normalized.includes("linkedin.com")

		if (!isLinkedInDomain) {
			return "share your Linkedin profile link"
		}

		// Check if it's a profile link (should have /in/ or /pub/)
		const profilePattern =
			/^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub)\/[^\/]+/

		if (!profilePattern.test(normalized)) {
			return "share your Linkedin profile link"
		}

		// Note: 404 validation would require a backend API endpoint
		// Format validation is handled above
		return null
	}

	const handleTwitterChange = (value: string) => {
		setTwitterHandle(value)
		const error = validateTwitterLink(value)
		setErrors((prev) => ({ ...prev, twitter: error }))
	}

	const handleLinkedInChange = (value: string) => {
		setLinkedinProfile(value)
		const error = validateLinkedInLink(value)
		setErrors((prev) => ({ ...prev, linkedin: error }))
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
			className="text-center w-full"
			layout
		>
			<h2 className="text-white text-[32px] font-medium mb-4 mt-[-36px]">
				Let's add your memories
			</h2>

			<div className="space-y-4 max-w-[329px] mx-auto overflow-visible">
				<div className="text-left gap-[6px] flex flex-col" id="x-twitter-field">
					<label
						htmlFor="twitter-handle"
						className="text-white text-sm font-medium block pl-2"
					>
						X/Twitter
					</label>
					<div className="relative flex items-center">
						<input
							id="twitter-handle"
							type="text"
							placeholder="x.com/yourhandle"
							value={twitterHandle}
							onChange={(e) => handleTwitterChange(e.target.value)}
							onBlur={() => {
								if (twitterHandle.trim()) {
									const error = validateTwitterLink(twitterHandle)
									setErrors((prev) => ({ ...prev, twitter: error }))
								}
							}}
							className={`w-full px-4 py-2 bg-[#070E1B] border rounded-xl text-white placeholder-onboarding focus:outline-none transition-colors h-[40px] ${
								errors.twitter
									? "border-[#52596633] bg-[#290F0A]"
									: "border-[#525966]/20"
							}`}
						/>
						{errors.twitter && (
							<div className="absolute left-full ml-3">
								<div className="relative flex-shrink-0 px-3 py-2 bg-red-500/20 rounded-xl">
									<div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-t-transparent border-b-transparent border-r-red-500/20" />
									<p className="text-red-500 text-xs whitespace-nowrap">
										{errors.twitter}
									</p>
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
						<input
							id="linkedin-profile"
							type="text"
							placeholder="linkedin.com/in/yourname"
							value={linkedinProfile}
							onChange={(e) => handleLinkedInChange(e.target.value)}
							onBlur={() => {
								if (linkedinProfile.trim()) {
									const error = validateLinkedInLink(linkedinProfile)
									setErrors((prev) => ({ ...prev, linkedin: error }))
								}
							}}
							className={`w-full px-4 py-2 bg-[#070E1B] border rounded-xl text-white placeholder-onboarding focus:outline-none transition-colors h-[40px] ${
								errors.linkedin
									? "border-[#52596633] bg-[#290F0A]"
									: "border-[#525966]/20"
							}`}
						/>
						{errors.linkedin && (
							<div className="absolute left-full ml-3">
								<div
									className={cn(
										"relative flex-shrink-0 px-3 py-2 bg-red-500/20 rounded-xl",
										dmSansClassName(),
									)}
								>
									<div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-t-transparent border-b-transparent border-r-red-500/20" />
									<p className="text-red-500 text-xs whitespace-nowrap">
										{errors.linkedin}
									</p>
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
						<span className="text-[#525966] text-[10px]">Upto 3</span>
					</div>
					{otherLinks.map((link, index) => (
						<div
							key={`other-link-${index}-${link.length}`}
							className="flex items-center mb-2 relative"
						>
							<input
								id={`other-links-${index}`}
								type="text"
								placeholder="Add your website, GitHub, Notion..."
								value={link}
								onChange={(e) => updateOtherLink(index, e.target.value)}
								className="flex-1 px-4 py-2 bg-[#070E1B] border border-[#525966]/20 rounded-xl text-white placeholder-onboarding focus:outline-none focus:border-[#4A4A4A] transition-colors h-[40px]"
							/>
							{index === otherLinks.length - 1 && otherLinks.length < 3 && (
								<button
									type="button"
									onClick={addOtherLink}
									className="size-8 m-1 absolute right-0 top-0 bg-black border border-[#161F2C] rounded-lg flex items-center justify-center text-white hover:bg-[#161F2C] transition-colors text-xl"
								>
									+
								</button>
							)}
						</div>
					))}
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
						className="w-full px-4 py-2 bg-[#070E1B] border border-[#525966]/20 rounded-xl text-white placeholder-onboarding focus:outline-none focus:border-[#4A4A4A] transition-colors min-h-[4rem]"
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
				className="mt-[24px]"
			>
				<Button
					className="rounded-xl px-6 py-3 border border-[#525966]/20 max-w-[12rem] text-white disabled:opacity-50 disabled:cursor-not-allowed h-[40px] cursor-pointer"
					disabled={isSubmitting}
					style={{
						background: "linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
					}}
					onClick={() => {
						const formData = {
							twitter: twitterHandle,
							linkedin: linkedinProfile,
							description: description,
							otherLinks: otherLinks.filter((l) => l.trim()),
						}
						onSubmit(formData)
						router.push("/onboarding?flow=setup&step=relatable")
					}}
				>
					{isSubmitting ? "Fetching..." : "Remember this →"}
				</Button>
			</motion.div>
		</motion.div>
	)
}
