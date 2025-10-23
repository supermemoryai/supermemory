import { motion } from "motion/react"
import { Button } from "@ui/components/button"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface MemoriesStepProps {
	onSubmit: (data: {
		twitter: string
		linkedin: string
		description: string
		otherLinks: string[]
	}) => void
}

export function MemoriesStep({ onSubmit }: MemoriesStepProps) {
	const router = useRouter()
	const [otherLinks, setOtherLinks] = useState([""])
	const [twitterHandle, setTwitterHandle] = useState("")
	const [linkedinProfile, setLinkedinProfile] = useState("")
	const [description, setDescription] = useState("")
	const [isSubmitting] = useState(false)

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

	const removeOtherLink = (index: number) => {
		if (otherLinks.length > 1) {
			const updated = otherLinks.filter((_, i) => i !== index)
			setOtherLinks(updated)
		}
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
			className="text-center max-w-[28rem] w-full"
			layout
		>
			<h2 className="text-white text-3xl font-medium mb-4">
				Let's add your memories
			</h2>

			<div className="space-y-6">
				<div className="text-left" id="x-twitter-field">
					<label
						htmlFor="twitter-handle"
						className="text-white text-sm font-medium mb-2 block"
					>
						X/Twitter
					</label>
					<input
						id="twitter-handle"
						type="text"
						placeholder="x.com/yourhandle"
						value={twitterHandle}
						onChange={(e) => setTwitterHandle(e.target.value)}
						className="w-full px-4 py-2 bg-[#070E1B] border border-[#525966]/20 rounded-xl text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#4A4A4A] transition-colors"
					/>
				</div>

				<div className="text-left" id="linkedin-field">
					<label
						htmlFor="linkedin-profile"
						className="text-white text-sm font-medium mb-2 block"
					>
						LinkedIn
					</label>
					<input
						id="linkedin-profile"
						type="text"
						placeholder="linkedin.com/in/yourname"
						value={linkedinProfile}
						onChange={(e) => setLinkedinProfile(e.target.value)}
						className="w-full px-4 py-2 bg-[#070E1B] border border-[#525966]/20 rounded-xl text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#4A4A4A] transition-colors"
					/>
				</div>

				<div className="text-left" id="other-links-field">
					<div className="flex items-center justify-between mb-2">
						<label
							htmlFor="other-links"
							className="text-white text-sm font-medium"
						>
							Other links
						</label>
						<span className="text-[#8A8A8A] text-xs">Upto 3</span>
					</div>
					{otherLinks.map((link, index) => (
						<div
							key={`other-link-${index}-${link.length}`}
							className="flex items-center space-x-2 mb-2"
						>
							<input
								id={`other-links-${index}`}
								type="text"
								placeholder="Add your website, GitHub, Notion..."
								value={link}
								onChange={(e) => updateOtherLink(index, e.target.value)}
								className="flex-1 px-4 py-2 bg-[#070E1B] border border-[#525966]/20 rounded-xl text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#4A4A4A] transition-colors"
							/>
							{otherLinks.length > 1 && (
								<button
									type="button"
									onClick={() => removeOtherLink(index)}
									className="w-10 h-10 bg-[#070E1B] border border-[#525966]/20 rounded-xl flex items-center justify-center text-white hover:bg-[#2A2A2A] transition-colors"
								>
									×
								</button>
							)}
							{index === otherLinks.length - 1 && otherLinks.length < 3 && (
								<button
									type="button"
									onClick={addOtherLink}
									className="w-10 h-10 bg-[#070E1B] border border-[#525966]/20 rounded-xl flex items-center justify-center text-white hover:bg-[#2A2A2A] transition-colors"
								>
									+
								</button>
							)}
						</div>
					))}
				</div>

				<div className="text-left" id="description-field">
					<label
						htmlFor="description"
						className="text-white text-sm font-medium mb-2 block"
					>
						What do you do? What do you like?
					</label>
					<textarea
						id="description"
						placeholder="Tell me the basics in your words. A few lines about your work, interests, etc."
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={4}
						className="w-full px-4 py-2 bg-[#070E1B] border border-[#525966]/20 rounded-xl text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#4A4A4A] transition-colors resize-none"
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
				className="mt-8"
			>
				<Button
					className="rounded-xl px-6 py-3 bg-[#070E1B] border border-[#525966]/20 hover:bg-[#2A2A2A] max-w-[12rem] text-white disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isSubmitting}
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
