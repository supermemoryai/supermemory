"use client"

import type { Tweet } from "react-tweet/api"
import { TweetPreview } from "@/components/document-cards/tweet-preview"
import { ExternalLinkIcon } from "lucide-react"

interface TweetContentProps {
	url?: string | null
	tweetMetadata?: unknown
	content?: string | null
}

export function TweetContent({
	url,
	tweetMetadata,
	content,
}: TweetContentProps) {
	if (tweetMetadata) {
		return (
			<div className="flex-1 flex items-center justify-center w-full p-4 overflow-auto">
				<TweetPreview data={tweetMetadata as Tweet} noBgColor />
			</div>
		)
	}

	if (content) {
		return (
			<div className="flex-1 flex flex-col w-full p-6 overflow-auto">
				<pre className="whitespace-pre-wrap text-sm text-[#E5E5E5] font-sans leading-relaxed">
					{content}
				</pre>
				{url && (
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1.5 text-sm text-blue-400 hover:underline mt-4"
					>
						View on X
						<ExternalLinkIcon className="w-3.5 h-3.5" />
					</a>
				)}
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
			<p>Tweet preview unavailable</p>
			{url && (
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-1.5 text-sm text-blue-400 hover:underline"
				>
					View on X
					<ExternalLinkIcon className="w-3.5 h-3.5" />
				</a>
			)}
		</div>
	)
}
