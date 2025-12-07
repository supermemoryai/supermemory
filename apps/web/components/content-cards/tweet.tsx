import { Suspense, useState } from "react"
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog"
import { Brain, Trash2 } from "lucide-react"
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
	onDelete,
}: {
	data: Tweet
	activeMemories?: Array<{ id: string; isForgotten?: boolean }>
	onDelete?: () => void
}) => {
	const [isDialogOpen, setIsDialogOpen] = useState(false)

	return (
		<div
			className="relative transition-all group"
			style={{
				backgroundColor: getPastelBackgroundColor(data.id_str || "tweet"),
			}}
		>
			<CustomTweet components={{}} tweet={data} />

			{onDelete && (
				<AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<AlertDialogTrigger asChild>
						<button
							className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/20"
							onClick={(e) => {
								e.stopPropagation()
							}}
							style={{
								color: colors.text.muted,
								backgroundColor: "rgba(255, 255, 255, 0.1)",
								backdropFilter: "blur(4px)",
							}}
							type="button"
						>
							<Trash2 className="w-3.5 h-3.5" />
						</button>
					</AlertDialogTrigger>
					<AlertDialogContent onClick={(e) => e.stopPropagation()}>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Document</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete this document and all its
								related memories? This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel
								onClick={(e) => {
									e.stopPropagation()
								}}
							>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								className="bg-red-600 hover:bg-red-700 text-white"
								onClick={(e) => {
									e.stopPropagation()
									onDelete()
								}}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}

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
