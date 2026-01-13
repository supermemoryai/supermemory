"use client"

import { useState, useEffect } from "react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { dmSansClassName } from "@/utils/fonts"
import { useHotkeys } from "react-hotkeys-hook"

export interface LinkData {
	url: string
	title: string
	description: string
}

interface LinkContentProps {
	onSubmit?: (data: LinkData) => void
	onDataChange?: (data: LinkData) => void
	isSubmitting?: boolean
	isOpen?: boolean
}

export function LinkContent({ onSubmit, onDataChange, isSubmitting, isOpen }: LinkContentProps) {
	const [url, setUrl] = useState("")
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")

	const canSubmit = url.trim().length > 0 && !isSubmitting

	const handleSubmit = () => {
		if (canSubmit && onSubmit) {
			onSubmit({ url, title, description })
		}
	}

	const updateData = (newUrl: string, newTitle: string, newDescription: string) => {
		onDataChange?.({ url: newUrl, title: newTitle, description: newDescription })
	}

	const handleUrlChange = (newUrl: string) => {
		setUrl(newUrl)
		updateData(newUrl, title, description)
	}

	const handleTitleChange = (newTitle: string) => {
		setTitle(newTitle)
		updateData(url, newTitle, description)
	}

	const handleDescriptionChange = (newDescription: string) => {
		setDescription(newDescription)
		updateData(url, title, newDescription)
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
			onDataChange?.({ url: "", title: "", description: "" })
		}
	}, [isOpen, onDataChange])

	return (
		<div className={cn("flex flex-col space-y-4 pt-4", dmSansClassName())}>
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
						placeholder="https://maheshthedev.me"
						disabled={isSubmitting}
						className={cn(
							"w-full p-4 rounded-xl bg-[#14161A] shadow-inside-out disabled:opacity-50",
						)}
					/>
					<Button variant="linkPreview" className="absolute right-2 top-2" disabled={isSubmitting}>
						Preview Link
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
						disabled={isSubmitting}
						className="w-full px-4 py-3 bg-[#0F1217] rounded-xl disabled:opacity-50"
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
						disabled={isSubmitting}
						className="w-full px-4 py-3 bg-[#0F1217] rounded-xl disabled:opacity-50"
					/>
				</div>
				<div>
					<p className="pl-2 pb-2 font-semibold text-[16px] text-[#737373]">
						Link Preview
					</p>
					<div className="w-full px-4 py-3 bg-[#0F1217] rounded-xl">
						<p>{description || "Portfolio website of Mahesh Sanikommu"}</p>
					</div>
				</div>
			</div>
		</div>
	)
}
