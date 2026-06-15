"use client"

import { useMemo, useState } from "react"
import { LinkIcon } from "lucide-react"
import { cn } from "@lib/utils"
import { Button } from "@ui/components/button"
import { dmSansClassName } from "@/lib/fonts"
import { TextEditor } from "../text-editor"
import { extractUrls } from "@/lib/url-helpers"

interface NoteContentProps {
	onSubmit?: (content: string) => void
	onContentChange?: (content: string) => void
	onImportLinks?: (urls: string[]) => void
	isSubmitting?: boolean
	isOpen?: boolean
	initialContent?: string
}

export function NoteContent({
	onSubmit,
	onContentChange,
	onImportLinks,
	isSubmitting,
	initialContent,
}: NoteContentProps) {
	const [content, setContent] = useState(initialContent ?? "")
	const [seededContent] = useState(initialContent || undefined)
	const [dismissed, setDismissed] = useState(false)

	const { urls: detectedUrls } = useMemo(() => extractUrls(content), [content])
	const showBulkOffer = detectedUrls.length >= 2 && !dismissed

	const canSubmit = content.trim().length > 0 && !isSubmitting

	const handleSubmit = () => {
		if (canSubmit && onSubmit) {
			onSubmit(content)
		}
	}

	const handleContentChange = (newContent: string) => {
		setContent(newContent)
		onContentChange?.(newContent)
	}

	return (
		<div className="flex h-full min-h-[45dvh] w-full flex-1 flex-col gap-2 md:mb-4!">
			{showBulkOffer && (
				<div
					className={cn(
						"flex shrink-0 items-center justify-between gap-3 rounded-[14px] bg-[#14161A] px-3 py-2.5 shadow-inside-out",
						dmSansClassName(),
					)}
				>
					<div className="flex min-w-0 items-center gap-2 text-[13px] text-[#737373]">
						<LinkIcon className="size-4 shrink-0" />
						<p className="truncate">
							<span className="font-medium text-white">
								{detectedUrls.length} links
							</span>{" "}
							detected — save each as its own memory?
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setDismissed(true)}
							disabled={isSubmitting}
							className="rounded-full px-3 text-[#737373]/80 hover:text-white"
						>
							Dismiss
						</Button>
						<Button
							variant="insideOut"
							size="sm"
							onClick={() => onImportLinks?.(detectedUrls)}
							disabled={isSubmitting}
							className="rounded-full px-4"
						>
							Save as {detectedUrls.length} memories
						</Button>
					</div>
				</div>
			)}
			<div className="flex min-h-0 w-full flex-1 overflow-y-auto rounded-[14px] bg-[#10151C] p-3 shadow-inside-out ring-1 ring-[#202A36] md:bg-[#14161A] md:p-4 md:ring-0">
				<TextEditor
					content={seededContent}
					onContentChange={handleContentChange}
					onSubmit={handleSubmit}
					debounceMs={0}
				/>
			</div>
		</div>
	)
}
