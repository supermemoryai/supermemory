import * as ReactTweet from "react-tweet";
import { ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import { EnrichedTweet, TwitterComponents } from "react-tweet";
import type { Tweet } from "react-tweet/api";
import "react-tweet/theme.css";

import { QuotedTweet } from "./quoted-tweet/quoted-tweet";
import tweetBodyStyles from "./tweet-body.module.css";
import tweetContainerStyles from "./tweet-container.module.css";
import tweetHeaderStyles from "./tweet-header.module.css";
import tweetInReplyToStyles from "./tweet-in-reply-to.module.css";
import tweetLinkStyles from "./tweet-link.module.css";
import { TweetMedia } from "./tweet-media";
import { VerifiedBadge } from "./verified-badge";

import clsx from "clsx";
import { useTheme } from "~/lib/theme-provider";

const { enrichTweet } = ReactTweet;

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

const AvatarImg = memo((props: AvatarImgProps) => <img {...props} />);

const TweetHeader = memo(
	({ tweet, components }: { tweet: EnrichedTweet; components?: TwitterComponents }) => {
		const Img = components?.AvatarImg ?? AvatarImg;
		const { user } = tweet;

		const avatarClasses = useMemo(
			() =>
				clsx(
					tweetHeaderStyles.avatarOverflow,
					user.profile_image_shape === "Square" && tweetHeaderStyles.avatarSquare,
				),
			[user.profile_image_shape],
		);

		return (
			<div className={tweetHeaderStyles.header}>
				<a
					href={tweet.url}
					className={tweetHeaderStyles.avatar}
					target="_blank"
					rel="noopener noreferrer"
				>
					<div className={avatarClasses}>
						<Img src={user.profile_image_url_https} alt={user.name} width={48} height={48} />
					</div>
					<div className={tweetHeaderStyles.avatarOverflow}>
						<div className={tweetHeaderStyles.avatarShadow}></div>
					</div>
				</a>
				<div className={tweetHeaderStyles.author}>
					<a
						href={tweet.url}
						className={tweetHeaderStyles.authorLink}
						target="_blank"
						rel="noopener noreferrer"
					>
						<div className={tweetHeaderStyles.authorLinkText}>
							<span title={user.name}>{user.name}</span>
						</div>
						<VerifiedBadge user={user} className={tweetHeaderStyles.authorVerified} />
					</a>
					<div className={tweetHeaderStyles.authorMeta}>
						<a
							href={tweet.url}
							className={tweetHeaderStyles.username}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span title={`@${user.screen_name}`}>@{user.screen_name}</span>
						</a>
					</div>
				</div>
			</div>
		);
	},
);

export const TweetContainer = memo(
	({ className, children }: { className?: string; children: ReactNode }) => {
		const containerClasses = useMemo(
			() => clsx("react-tweet-theme", tweetContainerStyles.root, className),
			[className],
		);

		return (
			<div className={containerClasses}>
				<article className={tweetContainerStyles.article}>{children}</article>
			</div>
		);
	},
);

export const TweetInReplyTo = memo(({ tweet }: { tweet: EnrichedTweet }) => (
	<a
		href={tweet.in_reply_to_url}
		className={tweetInReplyToStyles.root}
		target="_blank"
		rel="noopener noreferrer"
	>
		Replying to @{tweet.in_reply_to_screen_name}
	</a>
));

export const TweetBody = memo(({ tweet }: { tweet: EnrichedTweet }) => {
	const renderEntity = useCallback((item: any, i: number) => {
		switch (item.type) {
			case "hashtag":
			case "mention":
			case "url":
			case "symbol":
				return (
					<TweetLink key={i} href={item.href}>
						{item.text}
					</TweetLink>
				);
			case "media":
				return;
			default:
				return <span key={i} dangerouslySetInnerHTML={{ __html: item.text }} />;
		}
	}, []);

	return (
		<p className={tweetBodyStyles.root} lang={tweet.lang} dir="auto">
			{tweet.entities.map(renderEntity)}
		</p>
	);
});

export const TweetLink = memo(({ href, children }: { children: ReactNode; href: string }) => (
	<a
		href={href}
		className={tweetLinkStyles.root}
		target="_blank"
		rel="noopener noreferrer nofollow"
	>
		{children}
	</a>
));

export const CustomTwitterComp = memo(({ tweet: t, components }: Props) => {
	const [tweet, setTweet] = useState<EnrichedTweet | null>(null);
	const [theme] = useTheme();

	useEffect(() => {
		console.log("t", t);
		if ("error" in t) {
			setTweet(null);
		} else {
			try {
				const enrichedTweet = enrichTweet(t);
				setTweet(enrichedTweet);
			} catch (error) {
				console.error("Failed to enrich tweet:", error);
				setTweet(null);
			}
		}
	}, [t]);

	const tweetId = useMemo(
		() => (tweet && typeof tweet === "object" ? `tweet-${tweet?.id_str}-${theme}` : ""),
		[tweet?.id_str, theme],
	);

	if (typeof tweet === "undefined" || tweet === null) {
		return <ReactTweet.TweetSkeleton />;
	}

	if ("error" in t) {
		return <div>{"Failed to load tweet"}</div>;
	}

	return (
		<div className="" id={tweetId}>
			<TweetContainer className="!z-0 !m-0 w-full bg-transparent !p-0">
				<TweetHeader tweet={tweet} components={components} />
				{tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
				<TweetBody tweet={tweet} />
				{tweet.mediaDetails?.length ? <TweetMedia tweet={tweet} components={components} /> : null}
				{tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
			</TweetContainer>
		</div>
	);
});
