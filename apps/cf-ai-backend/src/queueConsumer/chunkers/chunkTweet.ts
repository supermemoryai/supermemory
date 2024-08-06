import { TweetChunks } from "../../types";
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
	let thread = threadText;

	try {
		thread = JSON.parse(threadText);
	} catch (e) {
		console.log("error: thread is not json.", e);
	}

	if (typeof threadText == "string") {
		console.log("DA WORKER FAILED DO SOMEHTING FIX DA WROKER", thread);
		const rawTweet = getRawTweet(thread);
		console.log(rawTweet);
		const parsedTweet: any = JSON.parse(rawTweet);

		const chunkedTweet = chunkText(parsedTweet.text, 1536);
		const metadata: Metadata = {
			tweetId: parsedTweet.id_str,
			tweetLinks: parsedTweet.entities?.urls.map(
				(url: any) => url.expanded_url,
			),
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
		console.log("thread in else statement", JSON.stringify(thread));
		const chunkedTweets = (thread as any).map((tweet: Tweet) => {
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
