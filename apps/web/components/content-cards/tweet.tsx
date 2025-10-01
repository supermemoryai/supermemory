import { Suspense } from "react"
import type { Tweet } from "react-tweet/api"
import {
	type TwitterComponents,
	TweetContainer,
	TweetHeader,
	TweetInReplyTo,
	TweetBody,
	TweetMedia,
	TweetInfo,
	QuotedTweet,
	TweetNotFound,
	TweetSkeleton,
	enrichTweet,
} from "react-tweet"
import { Badge } from "@repo/ui/components/badge"
import { Brain } from "lucide-react"
import { colors } from "@repo/ui/memory-graph/constants"
import { getPastelBackgroundColor } from "../memories-utils"

type MyTweetProps = {
	tweet: Tweet
	components?: TwitterComponents
}

const MyTweet = ({ tweet: t, components }: MyTweetProps) => {
	const parsedTweet = typeof t === "string" ? JSON.parse(t) : t
	const tweet = enrichTweet(parsedTweet)
	return (
		<TweetContainer className="pb-5">
			<TweetHeader tweet={tweet} components={components} />
			{tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
			<TweetBody tweet={tweet} />
			{tweet.mediaDetails?.length ? (
				<TweetMedia tweet={tweet} components={components} />
			) : null}
			{tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
			<TweetInfo tweet={tweet} />
		</TweetContainer>
	)
}

const TweetContent = ({
	components,
	tweet,
}: {
	components: TwitterComponents
	tweet: Tweet
}) => {
	if (!tweet) {
		const NotFound = components?.TweetNotFound || TweetNotFound
		return <NotFound />
	}

	return <MyTweet tweet={tweet} components={components} />
}

const CustomTweet = ({
	fallback = <TweetSkeleton />,
	...props
}: {
	components: TwitterComponents
	tweet: Tweet
	fallback?: React.ReactNode
}) => (
	<Suspense fallback={fallback}>
		<TweetContent {...props} />
	</Suspense>
)

export const TweetCard = ({
	data,
	activeMemories,
}: {
	data: Tweet
	activeMemories?: Array<{ id: string; isForgotten?: boolean }>
}) => {
	return (
		<div
			className="relative transition-all"
			style={{
				backgroundColor: getPastelBackgroundColor(data.id_str || "tweet"),
			}}
		>
			<CustomTweet components={{}} tweet={data} />
			{activeMemories && activeMemories.length > 0 && (
				<div className="absolute bottom-2 left-4 z-10">
					<Badge
						className="text-xs text-accent-foreground"
						style={{
							backgroundColor: colors.memory.secondary,
						}}
						variant="secondary"
					>
						<Brain className="w-3 h-3 mr-1" />
						{activeMemories.length}{" "}
						{activeMemories.length === 1 ? "memory" : "memories"}
					</Badge>
				</div>
			)}
		</div>
	)
}

TweetCard.displayName = "TweetCard"
