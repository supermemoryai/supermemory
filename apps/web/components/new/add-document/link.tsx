"use client"

import { useState, useEffect } from "react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { dmSansClassName } from "@/lib/fonts"
import { useHotkeys } from "react-hotkeys-hook"
import { Image as ImageIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

export interface LinkData {
	url: string
	title: string
	description: string
	image?: string
}

interface LinkContentProps {
	onSubmit?: (data: LinkData) => void
	onDataChange?: (data: LinkData) => void
	isSubmitting?: boolean
	isOpen?: boolean
}

export function LinkContent({
	onSubmit,
	onDataChange,
	isSubmitting,
	isOpen,
}: LinkContentProps) {
	const [url, setUrl] = useState("")
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")
	const [image, setImage] = useState<string | undefined>(undefined)
	const [isPreviewLoading, setIsPreviewLoading] = useState(false)

	const canSubmit = url.trim().length > 0 && !isSubmitting

	const handleSubmit = () => {
		if (canSubmit && onSubmit) {
			let normalizedUrl = url.trim()
			if (
				!normalizedUrl.startsWith("http://") &&
				!normalizedUrl.startsWith("https://")
			) {
				normalizedUrl = `https://${normalizedUrl}`
			}
			onSubmit({ url: normalizedUrl, title, description })
		}
	}

	const updateData = (
		newUrl: string,
		newTitle: string,
		newDescription: string,
		newImage?: string,
	) => {
		onDataChange?.({
			url: newUrl,
			title: newTitle,
			description: newDescription,
			...(newImage && { image: newImage }),
		})
	}

	const handleUrlChange = (newUrl: string) => {
		setUrl(newUrl)
		updateData(newUrl, title, description, image)
	}

	const handleTitleChange = (newTitle: string) => {
		setTitle(newTitle)
		updateData(url, newTitle, description)
	}

	const handleDescriptionChange = (newDescription: string) => {
		setDescription(newDescription)
		updateData(url, title, newDescription, image)
	}

	const handlePreviewLink = async () => {
		if (!url.trim()) {
			toast.error("Please enter a URL first")
			return
		}

		let normalizedUrl = url.trim()
		if (
			!normalizedUrl.startsWith("http://") &&
			!normalizedUrl.startsWith("https://")
		) {
			normalizedUrl = `https://${normalizedUrl}`
			setUrl(normalizedUrl)
			updateData(normalizedUrl, title, description, image)
		}

		setIsPreviewLoading(true)
		try {
			const response = await fetch(
				`/api/og?url=${encodeURIComponent(normalizedUrl)}`,
			)

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.error || "Failed to fetch preview")
			}

			const data = await response.json()

			const newTitle = data.title || ""
			const newDescription = data.description || ""
			const newImage = data.image || undefined

			setTitle(newTitle)
			setDescription(newDescription)
			setImage(newImage)
			updateData(url, newTitle, newDescription, newImage)

			if (!newTitle && !newDescription && !newImage) {
				toast.info("No Open Graph data found for this URL")
			} else {
				toast.success("Preview loaded successfully")
			}
		} catch (error) {
			console.error("Preview error:", error)
			toast.error(
				error instanceof Error ? error.message : "Failed to load preview",
			)
		} finally {
			setIsPreviewLoading(false)
		}
	}

	useHotkeys("mod+enter", handleSubmit, {
		enabled: isOpen && canSubmit,
		enableOnFormTags: ["INPUT", "TEXTAREA"],
	})

	// Reset content when modal closes
	useEffect(() => {
		if (!isOpen) {
			setUrl("")
			setTitle("")
			setDescription("")
			setImage(undefined)
			onDataChange?.({ url: "", title: "", description: "" })
		}
	}, [isOpen, onDataChange])

	return (
		<div className={cn("flex flex-col space-y-4 pt-4 mb-4", dmSansClassName())}>
			<div>
				<p
					className={cn("text-[16px] font-medium pl-2 pb-2", dmSansClassName())}
				>
					Paste a link to turn it into a memory
				</p>
				<div className="flex relative">
					<input
						type="text"
						value={url}
						onChange={(e) => handleUrlChange(e.target.value)}
						placeholder="https://example.com"
						disabled={isSubmitting}
						className="w-full p-4 rounded-xl bg-[#14161A] shadow-inside-out disabled:opacity-50 outline-1 outline-transparent focus:outline-[#525D6EB2]"
					/>
					<Button
						variant="linkPreview"
						className="absolute right-2 top-2"
						disabled={isSubmitting || isPreviewLoading || !url.trim()}
						onClick={handlePreviewLink}
					>
						{isPreviewLoading ? (
							<>
								<Loader2 className="size-4 animate-spin mr-2" />
								Loading...
							</>
						) : (
							"Preview Link"
						)}
					</Button>
				</div>
			</div>
			<div className="bg-[#14161A] rounded-[14px] py-6 px-4 space-y-4 shadow-inside-out">
				<div>
					<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
						Link title
					</p>
					<input
						type="text"
						value={title}
						onChange={(e) => handleTitleChange(e.target.value)}
						placeholder="Mahesh Sanikommu - Portfolio"
						disabled
						className="w-full px-4 py-3 bg-[#0F1217] rounded-xl disabled:opacity-50 outline-1 outline-transparent focus:outline-[#525D6EB2]"
					/>
				</div>
				<div>
					<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
						Link description
					</p>
					<textarea
						value={description}
						onChange={(e) => handleDescriptionChange(e.target.value)}
						placeholder="Portfolio website of Mahesh Sanikommu"
						disabled
						className="w-full px-4 py-3 bg-[#0F1217] rounded-xl resize-none disabled:opacity-50 outline-1 outline-transparent focus:outline-[#525D6EB2]"
					/>
				</div>
				<div>
					<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
						Link Preview Image
					</p>
					{image ? (
						<div className="w-full max-w-md aspect-4/2 bg-[#0F1217] rounded-xl overflow-hidden">
							<img
								src={image}
								alt={title || "Link preview"}
								className="w-full h-full object-cover"
								onError={(e) => {
									e.currentTarget.style.display = "none"
									e.currentTarget.parentElement?.classList.add("opacity-50")
									e.currentTarget.parentElement?.classList.add("flex")
									e.currentTarget.parentElement?.classList.add("items-center")
									e.currentTarget.parentElement?.classList.add("justify-center")
								}}
							/>
						</div>
					) : (
						<div className="w-full max-w-md aspect-4/2 bg-[#0F1217] opacity-50 rounded-xl flex items-center justify-center">
							<ImageIcon className="w-8 h-8 text-[#737373]" />
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
