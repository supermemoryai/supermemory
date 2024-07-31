import { Tweet } from "react-tweet/api";
import { Result, Ok, Err, isErr } from "../../errors/results";
import { BaseError } from "../../errors/baseError";
import { getMetaData, Metadata } from "../utils/get-metadata";
import { tweetToMd } from "@repo/shared-types/utils"; // can I do this?

class ProcessTweetError extends BaseError {
	constructor(message?: string, source?: string) {
		super("[Tweet Proceessing Error]", message, source);
	}
}

type GetTweetResult = Tweet;

export const getTweetData = async (
	tweetID: string,
): Promise<Result<GetTweetResult, ProcessTweetError>> => {
	try {
		console.log("is fetch defined here?");
		const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetID}&lang=en&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue%3Btfw_tweet_edit_backend%3Aon%3Btfw_refsrc_session%3Aon%3Btfw_fosnr_soft_interventions_enabled%3Aon%3Btfw_show_birdwatch_pivots_enabled%3Aon%3Btfw_show_business_verified_badge%3Aon%3Btfw_duplicate_scribes_to_settings%3Aon%3Btfw_use_profile_image_shape_enabled%3Aon%3Btfw_show_blue_verified_badge%3Aon%3Btfw_legacy_timeline_sunset%3Atrue%3Btfw_show_gov_verified_badge%3Aon%3Btfw_show_business_affiliate_badge%3Aon%3Btfw_tweet_edit_frontend%3Aon&token=4c2mmul6mnh`;

		const resp = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
				Accept: "application/json",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br",
				Connection: "keep-alive",
				"Upgrade-Insecure-Requests": "1",
				"Cache-Control": "max-age=0",
				TE: "Trailers",
			},
		});
		console.log(resp.status);

		const data = (await resp.json()) as Tweet;

		return Ok(data);
	} catch (e) {
		console.error("[Tweet Proceessing Error]", e);
		return Err(new ProcessTweetError(e, "getTweetData"));
	}
};

export const getThreadData = async (
	tweetUrl: string,
	cf_thread_endpoint: string,
	authKey: string,
): Promise<Result<string, ProcessTweetError>> => {
	const threadRequest = await fetch(cf_thread_endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: authKey,
		},
		body: JSON.stringify({ url: tweetUrl }),
	});
	if (threadRequest.status !== 200) {
		return Err(
			new ProcessTweetError(
				`Failed to fetch the thread: ${tweetUrl}, Reason: ${threadRequest.statusText}`,
				"getThreadData",
			),
		);
	}

	const thread = await threadRequest.text();
	console.log("[thread response]");

	if (thread.trim().length === 2) {
		console.log("Thread is an empty array");
		return Err(
			new ProcessTweetError(
				"[THREAD FETCHING SERVICE] Got no content form thread worker",
				"getThreadData",
			),
		);
	}
	return Ok(thread);
};
