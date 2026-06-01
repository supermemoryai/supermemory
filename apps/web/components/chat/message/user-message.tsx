"use client"

import { memo } from "react"
import { Copy, Check, FileText } from "lucide-react"
import type { UIMessage } from "@ai-sdk/react"

interface UserMessageProps {
	message: UIMessage
	copiedMessageId: string | null
	onCopy: (messageId: string, text: string) => void
}

export const UserMessage = memo(function UserMessage({
	message,
	copiedMessageId,
	onCopy,
}: UserMessageProps) {
	const text = message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join(" ")

	const files = message.parts.filter(
		(part): part is Extract<typeof part, { type: "file" }> =>
			part.type === "file",
	)

	return (
		<div className="flex flex-col items-end w-full gap-2">
			{files.length > 0 && (
				<div className="flex flex-wrap justify-end gap-2 max-w-[80%]">
					{files.map((f, i) => {
						const isImage = f.mediaType.startsWith("image/")
						return isImage ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								key={i}
								src={f.url}
								alt={f.filename ?? "attachment"}
								className="max-h-48 max-w-48 rounded-xl border border-white/10 object-cover"
							/>
						) : (
							<div
								key={i}
								className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1B1F24] px-3 py-2 text-xs text-white/60"
							>
								<FileText className="size-3.5 shrink-0" />
								<span className="truncate max-w-[120px]">
									{f.filename ?? "file"}
								</span>
							</div>
						)
					})}
				</div>
			)}
			{text && (
				<div className="bg-[#1B1F24] rounded-[12px] p-3 px-[14px] max-w-[80%]">
					<p className="text-sm text-white">{text}</p>
				</div>
			)}
			{text && (
				<button
					type="button"
					onClick={() => onCopy(message.id, text)}
					className="p-1.5 hover:bg-[#293952]/40 rounded transition-colors mt-1"
					title="Copy message"
				>
					{copiedMessageId === message.id ? (
						<Check className="size-3.5 text-green-400" />
					) : (
						<Copy className="size-3.5 text-white/50" />
					)}
				</button>
			)}
		</div>
	)
})
