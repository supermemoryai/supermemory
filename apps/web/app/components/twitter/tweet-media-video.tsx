"use client";

import { useState } from "react";
import { EnrichedQuotedTweet, type EnrichedTweet, getMediaUrl, getMp4Video } from "react-tweet";
import type { MediaAnimatedGif, MediaVideo } from "react-tweet/api";

import s from "./tweet-media-video.module.css";
import mediaStyles from "./tweet-media.module.css";

import clsx from "clsx";

type Props = {
	tweet: EnrichedTweet | EnrichedQuotedTweet;
	media: MediaAnimatedGif | MediaVideo;
};

export const TweetMediaVideo = ({ tweet, media }: Props) => {
	const [playButton, setPlayButton] = useState(true);
	const [isPlaying, setIsPlaying] = useState(false);
	const [ended, setEnded] = useState(false);
	const mp4Video = getMp4Video(media);
	let timeout = 0;

	return (
		<>
			<video
				className={mediaStyles.image}
				poster={getMediaUrl(media, "small")}
				controls={!playButton}
				muted
				preload="none"
				tabIndex={playButton ? -1 : 0}
				onPlay={() => {
					if (timeout) window.clearTimeout(timeout);
					if (!isPlaying) setIsPlaying(true);
					if (ended) setEnded(false);
				}}
				onPause={() => {
					// When the video is seeked (moved to a different timestamp), it will pause for a moment
					// before resuming. We don't want to show the message in that case so we wait a bit.
					if (timeout) window.clearTimeout(timeout);
					timeout = window.setTimeout(() => {
						if (isPlaying) setIsPlaying(false);
						timeout = 0;
					}, 100);
				}}
				onEnded={() => {
					setEnded(true);
				}}
			>
				<source src={mp4Video.url} type={mp4Video.content_type} />
			</video>

			{playButton && (
				<button
					type="button"
					className={s.videoButton}
					aria-label="View video on X"
					onClick={(e) => {
						const video = e.currentTarget.previousSibling as HTMLMediaElement;

						e.preventDefault();
						setPlayButton(false);
						setIsPlaying(true);
						video.play();
						video.focus();
					}}
				>
					<svg viewBox="0 0 24 24" className={s.videoButtonIcon} aria-hidden="true">
						<g>
							<path d="M21 12L4 2v20l17-10z"></path>
						</g>
					</svg>
				</button>
			)}

			{!isPlaying && !ended && (
				<div className={s.watchOnTwitter}>
					<a href={tweet.url} className={s.anchor} target="_blank" rel="noopener noreferrer">
						{playButton ? "Watch on X" : "Continue watching on X"}
					</a>
				</div>
			)}

			{ended && (
				<a
					href={tweet.url}
					className={clsx(s.anchor, s.viewReplies)}
					target="_blank"
					rel="noopener noreferrer"
				>
					View replies
				</a>
			)}
		</>
	);
};
