import { TweetChunks } from "../types";
import chunkText from "./chonker";

interface Tweet {
	id: string;
	text: string;
	links: Array<string>;
	images: Array<string>;
	videos: Array<string>;
}
interface Metadata {
	tweetId: string;
	tweetLinks: any[];
	tweetVids: any[];
	tweetImages: any[];
}

export interface ThreadTweetData {
	chunkedTweet: string[];
	metadata: Metadata;
}

export function chunkThread(threadText: string): TweetChunks {
	const thread = JSON.parse(threadText);

	const chunkedTweets = thread.map((tweet: Tweet) => {
		const chunkedTweet = chunkText(tweet.text, 1536);

		const metadata = {
			tweetId: tweet.id,
			tweetLinks: tweet.links,
			tweetVids: tweet.videos,
			tweetImages: tweet.images,
		};

		return { chunkedTweet, metadata };
	});

	return { type: "tweet", chunks: chunkedTweets };
}
