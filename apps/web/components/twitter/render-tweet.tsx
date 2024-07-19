import type { Tweet } from "react-tweet/api";
import {
	type TwitterComponents,
	TweetContainer,
	TweetInReplyTo,
	TweetBody,
	TweetMedia,
	TweetInfo,
	QuotedTweet,
	enrichTweet,
	EnrichedTweet,
} from "react-tweet";
import clsx from "clsx";
import s from "./tweet-header.module.css";
import { VerifiedBadge } from "./verified-badge";

type Props = {
	tweet: Tweet | { error: string };
	components?: TwitterComponents;
};

type AvatarImgProps = {
	src: string;
	alt: string;
	width: number;
	height: number;
};
const AvatarImg = (props: AvatarImgProps) => <img {...props} />;

const TweetHeader = ({
	tweet,
	components,
}: {
	tweet: EnrichedTweet;
	components?: TwitterComponents;
}) => {
	const Img = components?.AvatarImg ?? AvatarImg;
	const { user } = tweet;

	return (
		<div className={s.header}>
			<a
				href={tweet.url}
				className={s.avatar}
				target="_blank"
				rel="noopener noreferrer"
			>
				<div
					className={clsx(
						s.avatarOverflow,
						user.profile_image_shape === "Square" && s.avatarSquare,
					)}
				>
					<Img
						src={user.profile_image_url_https}
						alt={user.name}
						width={48}
						height={48}
					/>
				</div>
				<div className={s.avatarOverflow}>
					<div className={s.avatarShadow}></div>
				</div>
			</a>
			<div className={s.author}>
				<a
					href={tweet.url}
					className={s.authorLink}
					target="_blank"
					rel="noopener noreferrer"
				>
					<div className={s.authorLinkText}>
						<span title={user.name}>{user.name}</span>
					</div>
					<VerifiedBadge user={user} className={s.authorVerified} />
				</a>
				<div className={s.authorMeta}>
					<a
						href={tweet.url}
						className={s.username}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span title={`@${user.screen_name}`}>@{user.screen_name}</span>
					</a>
					<div className={s.authorFollow}>
						<span className={s.separator}>·</span>
						<a
							href={user.follow_url}
							className={s.follow}
							target="_blank"
							rel="noopener noreferrer"
						>
							Follow
						</a>
					</div>
				</div>
			</div>
		</div>
	);
};

export const MyTweet = ({ tweet: t, components }: Props) => {
	if ("error" in t) {
		return <div>{t.error}</div>;
	}

	const tweet = enrichTweet(t);
	return (
		<TweetContainer className="bg-transparent !m-0 !p-0 !z-0">
			<TweetHeader tweet={tweet} components={components} />
			{tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
			<TweetBody tweet={tweet} />
			{tweet.mediaDetails?.length ? (
				<TweetMedia tweet={tweet} components={components} />
			) : null}
			{tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
			<TweetInfo tweet={tweet} />
		</TweetContainer>
	);
};
