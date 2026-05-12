"use client"

import { useState, useEffect } from "react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { useHotkeys } from "react-hotkeys-hook"

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
			onSubmit({ url: normalizedUrl, title: "", description: "" })
		}
	}

	const handleUrlChange = (newUrl: string) => {
		setUrl(newUrl)
		onDataChange?.({ url: newUrl, title: "", description: "" })
	}

	useHotkeys("mod+enter", handleSubmit, {
		enabled: isOpen && canSubmit,
		enableOnFormTags: ["INPUT", "TEXTAREA"],
	})

	// Reset content when modal closes
	useEffect(() => {
		if (!isOpen) {
			setUrl("")
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
				<input
					type="text"
					value={url}
					onChange={(e) => handleUrlChange(e.target.value)}
					placeholder="https://example.com/article"
					disabled={isSubmitting}
					className="w-full p-4 rounded-xl bg-[#14161A] shadow-inside-out disabled:opacity-50 outline-1 outline-transparent focus:outline-[#525D6EB2]"
				/>
			</div>
		</div>
	)
}
