"use client"

import { Suspense } from "react"
import type { Tweet } from "react-tweet/api"
import { TweetBody, enrichTweet, TweetSkeleton } from "react-tweet"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { PlayCircle } from "lucide-react"

function VerifiedBadge({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 22 22"
			aria-label="Verified account"
			className={cn("size-3", className)}
		>
			<title>Verified</title>
			<g>
				<path
					fill="#1D9BF0"
					d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
				/>
			</g>
		</svg>
	)
}

function XLogo({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			className={cn("size-3 fill-white", className)}
		>
			<title>X</title>
			<g>
				<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
			</g>
		</svg>
	)
}

function CustomTweetHeader({
	tweet,
}: {
	tweet: ReturnType<typeof enrichTweet>
}) {
	const user = tweet.user
	const isVerified = user.verified || user.is_blue_verified

	return (
		<div className="flex items-start justify-between pr-0.5 w-full">
			<div className="flex gap-2 items-center">
				<div className="bg-white overflow-hidden rounded-full shrink-0 size-[30px]">
					<img
						src={user.profile_image_url_https}
						alt={user.name}
						className="size-full object-cover"
					/>
				</div>
				<div className="flex flex-col items-start">
					<div className="flex gap-0.5 items-center">
					<p
						className={cn(
							"font-semibold leading-tight overflow-hidden text-[#fafafa] text-[12px] truncate tracking-[-0.12px]",
							dmSansClassName(),
						)}
					>
							{user.name}
						</p>
						{isVerified && <VerifiedBadge />}
					</div>
					<p
						className={cn(
							"font-medium leading-tight overflow-hidden text-[#737373] text-[12px] truncate tracking-[-0.12px]",
							dmSansClassName(),
						)}
					>
						@{user.screen_name}
					</p>
				</div>
			</div>
			<div className="flex gap-1.5 items-center">
				<XLogo />
			</div>
		</div>
	)
}

function CustomTweetMedia({
	tweet,
}: {
	tweet: ReturnType<typeof enrichTweet>
}) {
	const media = tweet.mediaDetails?.[0]
	if (!media) return null

	const isVideo = media.type === "video" || media.type === "animated_gif"
	const previewUrl = media.media_url_https

	return (
		<div className="relative w-full overflow-hidden rounded-[6px] border border-[rgba(47,50,54,0.2)]">
			<div className="relative w-full aspect-video">
				<img
					src={previewUrl}
					alt="Tweet media"
					className="w-full h-full object-cover"
				/>
				{isVideo && (
					<div className="absolute inset-0 bg-[rgba(4,5,5,0.8)] flex items-center justify-center">
						<PlayCircle className="size-8 text-white" strokeWidth={1.5} />
					</div>
				)}
			</div>
		</div>
	)
}

export function TweetPreview({
	data,
	noBgColor,
}: {
	data: Tweet
	noBgColor?: boolean
}) {
	const parsedTweet = typeof data === "string" ? JSON.parse(data) : data
	const tweet = enrichTweet(parsedTweet)

	return (
		<div
			className={cn(
				"w-full min-w-0",
				noBgColor ? "bg-transparent" : "bg-black rounded-[18px] p-3",
				dmSansClassName(),
			)}
		>
			<Suspense fallback={<TweetSkeleton />}>
				<div className="flex flex-col gap-3 w-full">
					<CustomTweetHeader tweet={tweet} />
					<div className="sm-tweet-theme w-full min-w-0">
						<TweetBody tweet={tweet} />
					</div>
					<CustomTweetMedia tweet={tweet} />
				</div>
			</Suspense>
		</div>
	)
}
