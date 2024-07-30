import { TweetChunks } from "../types";
import chunkText from "./chonker";
import { getRawTweet } from "@repo/shared-types/utils";

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
	if (typeof thread == "string") {
		console.log("DA WORKER FAILED DO SOMEHTING FIX DA WROKER");
		const rawTweet = getRawTweet(thread);
		const parsedTweet: any = JSON.parse(rawTweet);

		const chunkedTweet = chunkText(parsedTweet.text, 1536);
		const metadata: Metadata = {
			tweetId: parsedTweet.id_str,
			tweetLinks: parsedTweet.entities.urls.map((url: any) => url.expanded_url),
			tweetVids:
				parsedTweet.extended_entities?.media
					.filter((media: any) => media.type === "video")
					.map((media: any) => media.video_info!.variants[0].url) || [],
			tweetImages:
				parsedTweet.extended_entities?.media
					.filter((media: any) => media.type === "photo")
					.map((media: any) => media.media_url_https!) || [],
		};

		const chunks = [{ chunkedTweet: chunkedTweet, metadata }];

		return { type: "tweet", chunks };
	} else {
		console.log(JSON.stringify(thread));
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
}
