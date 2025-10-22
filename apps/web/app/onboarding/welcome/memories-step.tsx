import { motion } from "motion/react"
import { Button } from "@ui/components/button"
import { useState } from "react"
import { fetchContentFromUrls, type ExaContentResult } from "@/utils/exa-api"

export function MemoriesStep() {
	const [twitterHandle, setTwitterHandle] = useState("")
	const [linkedinProfile, setLinkedinProfile] = useState("")
	const [otherLinks, setOtherLinks] = useState([""])
	const [description, setDescription] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

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

	// URL validation and filtering helpers
	const isValidUrl = (url: string): boolean => {
		try {
			new URL(url)
			return true
		} catch {
			return false
		}
	}

	const normalizeUrl = (url: string): string => {
		if (!url.trim()) return ""
		if (url.startsWith("http://") || url.startsWith("https://")) {
			return url
		}
		return `https://${url}`
	}

	const isTwitterUrl = (url: string): boolean => {
		const normalizedUrl = url.toLowerCase()
		return (
			normalizedUrl.includes("twitter.com") || normalizedUrl.includes("x.com")
		)
	}

	const isLinkedInProfileUrl = (url: string): boolean => {
		const normalizedUrl = url.toLowerCase()
		return (
			normalizedUrl.includes("linkedin.com/in/") &&
			!normalizedUrl.includes("linkedin.com/company/")
		)
	}

	const collectValidUrls = (): string[] => {
		const urls: string[] = []

		// Add LinkedIn profile if valid and not empty
		if (linkedinProfile.trim()) {
			const normalizedLinkedIn = normalizeUrl(linkedinProfile.trim())
			if (
				isValidUrl(normalizedLinkedIn) &&
				isLinkedInProfileUrl(normalizedLinkedIn)
			) {
				urls.push(normalizedLinkedIn)
			}
		}

		// Add other links if valid and not empty, excluding Twitter
		otherLinks
			.filter((link) => link.trim())
			.forEach((link) => {
				const normalizedLink = normalizeUrl(link.trim())
				if (isValidUrl(normalizedLink) && !isTwitterUrl(normalizedLink)) {
					urls.push(normalizedLink)
				}
			})

		return urls
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
					onClick={async () => {
						setIsSubmitting(true)

						try {
							// Collect valid URLs for fetching
							const urlsToFetch = collectValidUrls()

							// Fetch content from URLs using Exa API
							let fetchedData: Record<string, ExaContentResult> = {}
							if (urlsToFetch.length > 0) {
								const contentResults = await fetchContentFromUrls(urlsToFetch)
								fetchedData = Object.fromEntries(
									contentResults.map((result) => [result.url, result]),
								)
							}

							// Log complete form data including fetched content
							console.log("Form submitted:", {
								twitterHandle,
								linkedinProfile,
								otherLinks: otherLinks.filter((link) => link.trim()),
								description,
								fetchedContent: fetchedData,
							})

							// Navigate to setup page after form submission
							window.location.href = "/onboarding/setup"
						} catch (error) {
							console.warn("Error during form submission:", error)
							// Continue with form submission even if API fails
							console.log("Form submitted (without fetched content):", {
								twitterHandle,
								linkedinProfile,
								otherLinks: otherLinks.filter((link) => link.trim()),
								description,
								fetchedContent: {},
							})
							window.location.href = "/onboarding/setup"
						} finally {
							setIsSubmitting(false)
						}
					}}
				>
					{isSubmitting ? "Fetching..." : "Remember this →"}
				</Button>
			</motion.div>
		</motion.div>
	)
}
