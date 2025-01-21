import type { Tweet } from "react-tweet/api";

export const getRawTweet = (tweet: string) => {
	// Get the content inside the last <raw> tag, there can any number of <raw> tags in the tweet (or just one)
	const rawTag = /<raw>(.*)<\/raw>/g;
	const match = rawTag.exec(tweet);
	if (match) {
		return match[1];
	}
	return `{
    "error": "No <raw> tag found"
  }`;
};

export const getTweet = (tweet: string) => {
	const rawTweet = getRawTweet(tweet);
	try {
		return JSON.parse(rawTweet) as Tweet;
	} catch (e) {
		return { error: "Error parsing tweet from text" };
	}
};
