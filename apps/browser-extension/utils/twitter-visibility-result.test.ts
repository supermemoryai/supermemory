import { describe, expect, it } from "bun:test"
import { getAllTweets, type TwitterAPIResponse } from "./twitter-utils"

const apiTweet = (id: string) => ({
	__typename: "Tweet",
	legacy: {
		favorite_count: 0,
		created_at: "Wed Oct 10 20:19:24 +0000 2018",
		id_str: id,
		full_text: `Tweet ${id}`,
	},
})

const timelineEntry = (id: string, result: unknown) => ({
	entryId: `tweet-${id}`,
	sortIndex: id,
	content: { itemContent: { tweet_results: { result } } },
})

describe("getAllTweets", () => {
	it("extracts visibility-wrapped results and skips unavailable tweets", () => {
		const response: TwitterAPIResponse = {
			data: {
				bookmark_timeline_v2: {
					timeline: {
						instructions: [
							{
								type: "TimelineAddEntries",
								entries: [
									timelineEntry("100", apiTweet("100")),
									timelineEntry("200", {
										__typename: "TweetWithVisibilityResults",
										limitedActionResults: {},
										tweet: apiTweet("200"),
									}),
									timelineEntry("300", {
										__typename: "TweetTombstone",
									}),
									timelineEntry("400", {
										__typename: "TweetWithVisibilityResults",
									}),
								],
							},
						],
					},
				},
			},
		}

		expect(getAllTweets(response).map((tweet) => tweet.id_str)).toEqual([
			"100",
			"200",
		])
	})
})
