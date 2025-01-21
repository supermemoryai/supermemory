import type { EnrichedQuotedTweet } from "react-tweet";

import { AvatarImg } from "../avatar-img";
import { VerifiedBadge } from "../verified-badge.js";
import s from "./quoted-tweet-header.module.css";

import clsx from "clsx";

type Props = { tweet: EnrichedQuotedTweet };

export const QuotedTweetHeader = ({ tweet }: Props) => {
	const { user } = tweet;

	return (
		<div className={s.header}>
			<a href={tweet.url} className={s.avatar} target="_blank" rel="noopener noreferrer">
				<div
					className={clsx(
						s.avatarOverflow,
						user.profile_image_shape === "Square" && s.avatarSquare,
					)}
				>
					<AvatarImg src={user.profile_image_url_https} alt={user.name} width={20} height={20} />
				</div>
			</a>
			<div className={s.author}>
				<div className={s.authorText}>
					<span title={user.name}>{user.name}</span>
				</div>
				<VerifiedBadge user={user} />
				<div className={s.username}>
					<span title={`@${user.screen_name}`}>@{user.screen_name}</span>
				</div>
			</div>
		</div>
	);
};
