import type { EnrichedQuotedTweet } from "react-tweet";

import s from "./quoted-tweet-body.module.css";

type Props = { tweet: EnrichedQuotedTweet };

export const QuotedTweetBody = ({ tweet }: Props) => (
	<p className={s.root} lang={tweet.lang} dir="auto">
		{tweet.entities.map((item, i) => (
			<span key={i} dangerouslySetInnerHTML={{ __html: item.text }} />
		))}
	</p>
);
