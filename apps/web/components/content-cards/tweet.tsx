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
import { DocumentCardFrame } from "./document-card-frame"
import { MemoryBadge } from "./memory-badge"
import { ConfirmDelete } from "./confirm-delete"
import { Brain, Trash2, MessageSquareQuote, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu"
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
    const [confirmOpen, setConfirmOpen] = useState(false)
    return (
        <>
            <DocumentCardFrame
                media={null}
                title={`@${data.user?.screen_name ?? "unknown"}`}
                subtitle={<><MessageSquareQuote className="w-3 h-3" aria-hidden="true" /><span>Tweet</span></>}
                body={undefined}
                footerLeft={<MemoryBadge count={activeMemories?.length ?? 0} />}
                metaRight={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button onClick={(e) => e.stopPropagation()} className="rounded p-1 text-muted-foreground/80 hover:bg-muted" type="button" aria-label="More actions">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {onDelete && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfirmOpen(true) }} className="cursor-pointer text-xs text-red-600 focus:text-red-600">
                                    <Trash2 className="w-3 h-3 mr-2" /> Delete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
            />
            {onDelete && (
                <ConfirmDelete
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    onConfirm={() => {
                        onDelete?.()
                        setConfirmOpen(false)
                    }}
                />
            )}
        </>
    )
}

