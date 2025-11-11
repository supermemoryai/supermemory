"use client"

import { Suspense } from "react"
import type { Tweet } from "react-tweet/api"
import {
	TweetContainer,
	TweetHeader,
	TweetBody,
	TweetMedia,
	enrichTweet,
	TweetSkeleton,
} from "react-tweet"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/utils/fonts"

export function TweetPreview({ data }: { data: Tweet }) {
	const parsedTweet = typeof data === "string" ? JSON.parse(data) : data
	const tweet = enrichTweet(parsedTweet)

	return (
		<div className="p-3 rounded-[18px] !bg-[#0B1017] sm-tweet-theme w-full min-w-0">
			<Suspense fallback={<TweetSkeleton />}>
				<TweetContainer
					className={cn(
						"!pb-0 !my-0 !bg-transparent !border-none !w-full !min-w-0",
						dmSansClassName(),
					)}
				>
					<TweetHeader tweet={tweet} components={{}} />
					<TweetBody tweet={tweet} />
					{tweet.mediaDetails?.length ? (
						<TweetMedia tweet={tweet} components={{}} />
					) : null}
				</TweetContainer>
			</Suspense>
		</div>
	)
}
