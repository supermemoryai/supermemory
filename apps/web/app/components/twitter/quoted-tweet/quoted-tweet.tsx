import type { EnrichedQuotedTweet } from "react-tweet";

import { TweetMedia } from "../tweet-media";
import { QuotedTweetBody } from "./quoted-tweet-body";
import { QuotedTweetContainer } from "./quoted-tweet-container";
import { QuotedTweetHeader } from "./quoted-tweet-header";

type Props = { tweet: EnrichedQuotedTweet };

export const QuotedTweet = ({ tweet }: Props) => (
	<QuotedTweetContainer tweet={tweet}>
		<QuotedTweetHeader tweet={tweet} />
		<QuotedTweetBody tweet={tweet} />
		{tweet.mediaDetails?.length ? <TweetMedia quoted tweet={tweet} /> : null}
	</QuotedTweetContainer>
);
