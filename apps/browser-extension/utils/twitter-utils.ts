// Twitter API data structures and transformation utilities

interface TwitterAPITweet {
	__typename?: string
	legacy: {
		lang?: string
		favorite_count: number
		created_at: string
		display_text_range?: [number, number]
		entities?: {
			hashtags?: Array<{ indices: [number, number]; text: string }>
			urls?: Array<{
				display_url: string
				expanded_url: string
				indices: [number, number]
				url: string
			}>
			user_mentions?: Array<{
				id_str: string
				indices: [number, number]
				name: string
				screen_name: string
			}>
			symbols?: Array<{ indices: [number, number]; text: string }>
			media?: MediaEntity[]
		}
		id_str: string
		full_text: string
		reply_count?: number
		retweet_count?: number
		quote_count?: number
	}
	core?: {
		user_results?: {
			result?: {
				legacy?: {
					id_str: string
					name: string
					profile_image_url_https: string
					screen_name: string
					verified: boolean
				}
				is_blue_verified?: boolean
			}
		}
	}
}

interface MediaEntity {
	type: string
	media_url_https: string
	sizes?: {
		large?: {
			w: number
			h: number
		}
	}
	video_info?: {
		variants?: Array<{
			url: string
		}>
		duration_millis?: number
	}
}

export interface Tweet {
	__typename?: string
	lang?: string
	favorite_count: number
	created_at: string
	display_text_range?: [number, number]
	entities: {
		hashtags: Array<{
			indices: [number, number]
			text: string
		}>
		urls?: Array<{
			display_url: string
			expanded_url: string
			indices: [number, number]
			url: string
		}>
		user_mentions: Array<{
			id_str: string
			indices: [number, number]
			name: string
			screen_name: string
		}>
		symbols: Array<{
			indices: [number, number]
			text: string
		}>
	}
	id_str: string
	text: string
	user: {
		id_str: string
		name: string
		profile_image_url_https: string
		screen_name: string
		verified: boolean
		is_blue_verified?: boolean
	}
	conversation_count: number
	photos?: Array<{
		url: string
		width: number
		height: number
	}>
	videos?: Array<{
		url: string
		thumbnail_url: string
		duration: number
	}>
	retweet_count?: number
	quote_count?: number
	reply_count?: number
}

export interface TwitterAPIResponse {
	data: {
		bookmark_timeline_v2?: {
			timeline: {
				instructions: Array<{
					type: string
					entries?: Array<{
						entryId: string
						sortIndex: string
						content: Record<string, unknown>
					}>
				}>
			}
		}
		bookmark_collection_timeline?: {
			timeline: {
				instructions: Array<{
					type: string
					entries?: Array<{
						entryId: string
						sortIndex: string
						content: Record<string, unknown>
					}>
				}>
			}
		}
	}
}

// Twitter API features configuration
export const TWITTER_API_FEATURES = {
	graphql_timeline_v2_bookmark_timeline: true,
	responsive_web_graphql_exclude_directive_enabled: true,
	responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
	responsive_web_graphql_timeline_navigation_enabled: true,
	responsive_web_enhance_cards_enabled: false,
	rweb_tipjar_consumption_enabled: true,
	responsive_web_twitter_article_notes_tab_enabled: true,
	creator_subscriptions_tweet_preview_api_enabled: true,
	freedom_of_speech_not_reach_fetch_enabled: true,
	standardized_nudges_misinfo: true,
	tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
	longform_notetweets_rich_text_read_enabled: true,
	longform_notetweets_inline_media_enabled: true,
	responsive_web_media_download_video_enabled: false,
	responsive_web_text_conversations_enabled: false,
	// Missing features that the API is complaining about
	creator_subscriptions_quote_tweet_preview_enabled: true,
	view_counts_everywhere_api_enabled: true,
	c9s_tweet_anatomy_moderator_badge_enabled: true,
	graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
	tweetypie_unmention_optimization_enabled: true,
	responsive_web_twitter_article_tweet_consumption_enabled: true,
	tweet_awards_web_tipping_enabled: true,
	communities_web_enable_tweet_community_results_fetch: true,
	responsive_web_edit_tweet_api_enabled: true,
	longform_notetweets_consumption_enabled: true,
	articles_preview_enabled: true,
	rweb_video_timestamps_enabled: true,
	verified_phone_label_enabled: true,
}

// Twitter API features configuration for BookmarkFolderTimeline
export const TWITTER_BOOKMARK_FOLDER_FEATURES = {
	rweb_video_screen_enabled: false,
	payments_enabled: false,
	profile_label_improvements_pcf_label_in_post_enabled: true,
	responsive_web_profile_redirect_enabled: false,
	rweb_tipjar_consumption_enabled: true,
	verified_phone_label_enabled: false,
	creator_subscriptions_tweet_preview_api_enabled: true,
	responsive_web_graphql_timeline_navigation_enabled: true,
	responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
	premium_content_api_read_enabled: false,
	communities_web_enable_tweet_community_results_fetch: true,
	c9s_tweet_anatomy_moderator_badge_enabled: true,
	responsive_web_grok_analyze_button_fetch_trends_enabled: false,
	responsive_web_grok_analyze_post_followups_enabled: true,
	responsive_web_jetfuel_frame: true,
	responsive_web_grok_share_attachment_enabled: true,
	articles_preview_enabled: true,
	responsive_web_edit_tweet_api_enabled: true,
	graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
	view_counts_everywhere_api_enabled: true,
	longform_notetweets_consumption_enabled: true,
	responsive_web_twitter_article_tweet_consumption_enabled: true,
	tweet_awards_web_tipping_enabled: false,
	responsive_web_grok_show_grok_translated_post: true,
	responsive_web_grok_analysis_button_from_backend: true,
	creator_subscriptions_quote_tweet_preview_enabled: false,
	freedom_of_speech_not_reach_fetch_enabled: true,
	standardized_nudges_misinfo: true,
	tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
	longform_notetweets_rich_text_read_enabled: true,
	longform_notetweets_inline_media_enabled: true,
	responsive_web_grok_image_annotation_enabled: true,
	responsive_web_grok_imagine_annotation_enabled: true,
	responsive_web_grok_community_note_auto_translation_is_enabled: false,
	responsive_web_enhance_cards_enabled: false,
}

export const BOOKMARKS_URL = `https://x.com/i/api/graphql/xLjCVTqYWz8CGSprLU349w/Bookmarks?features=${encodeURIComponent(JSON.stringify(TWITTER_API_FEATURES))}`

export const BOOKMARK_COLLECTION_URL = `https://x.com/i/api/graphql/I8Y9ni1dqP-ZSpwxqJQ--Q/BookmarkFolderTimeline?features=${encodeURIComponent(JSON.stringify(TWITTER_BOOKMARK_FOLDER_FEATURES))}`

/**
 * Transform raw Twitter API response data into standardized Tweet format
 */
export function transformTweetData(
	input: Record<string, unknown>,
): Tweet | null {
	try {
		const content = input.content as {
			itemContent?: { tweet_results?: { result?: unknown } }
		}
		const tweetData = content?.itemContent?.tweet_results?.result

		if (!tweetData) {
			return null
		}

		const tweet = tweetData as TwitterAPITweet

		if (!tweet.legacy) {
			return null
		}

		// Handle media entities
		const media = (tweet.legacy.entities?.media as MediaEntity[]) || []
		const photos = media
			.filter((m) => m.type === "photo")
			.map((m) => ({
				url: m.media_url_https,
				width: m.sizes?.large?.w || 0,
				height: m.sizes?.large?.h || 0,
			}))

		const videos = media
			.filter((m) => m.type === "video")
			.map((m) => ({
				url: m.video_info?.variants?.[0]?.url || "",
				thumbnail_url: m.media_url_https,
				duration: m.video_info?.duration_millis || 0,
			}))

		const transformed: Tweet = {
			__typename: tweet.__typename,
			lang: tweet.legacy?.lang,
			favorite_count: tweet.legacy.favorite_count || 0,
			created_at: new Date(tweet.legacy.created_at).toISOString(),
			display_text_range: tweet.legacy.display_text_range,
			entities: {
				hashtags: tweet.legacy.entities?.hashtags || [],
				urls: tweet.legacy.entities?.urls || [],
				user_mentions: tweet.legacy.entities?.user_mentions || [],
				symbols: tweet.legacy.entities?.symbols || [],
			},
			id_str: tweet.legacy.id_str,
			text: tweet.legacy.full_text,
			user: {
				id_str: tweet.core?.user_results?.result?.legacy?.id_str || "",
				name: tweet.core?.user_results?.result?.legacy?.name || "Unknown",
				profile_image_url_https:
					tweet.core?.user_results?.result?.legacy?.profile_image_url_https ||
					"",
				screen_name:
					tweet.core?.user_results?.result?.legacy?.screen_name || "unknown",
				verified: tweet.core?.user_results?.result?.legacy?.verified || false,
				is_blue_verified:
					tweet.core?.user_results?.result?.is_blue_verified || false,
			},
			conversation_count: tweet.legacy.reply_count || 0,
			retweet_count: tweet.legacy.retweet_count || 0,
			quote_count: tweet.legacy.quote_count || 0,
			reply_count: tweet.legacy.reply_count || 0,
		}

		if (photos.length > 0) {
			transformed.photos = photos
		}

		if (videos.length > 0) {
			transformed.videos = videos
		}

		return transformed
	} catch (error) {
		console.error("Error transforming tweet data:", error)
		return null
	}
}

/**
 * Extract all tweets from Twitter API response
 */
export function getAllTweets(data: TwitterAPIResponse): Tweet[] {
	const tweets: Tweet[] = []

	try {
		const instructions =
			data.data?.bookmark_timeline_v2?.timeline?.instructions ||
			data.data?.bookmark_collection_timeline?.timeline?.instructions ||
			[]

		for (const instruction of instructions) {
			if (instruction.type === "TimelineAddEntries" && instruction.entries) {
				for (const entry of instruction.entries) {
					if (entry.entryId.startsWith("tweet-")) {
						const tweet = transformTweetData(entry)
						if (tweet) {
							tweets.push(tweet)
						}
					}
				}
			}
		}
	} catch (error) {
		console.error("Error extracting tweets:", error)
	}

	return tweets
}

/**
 * Extract pagination cursor from Twitter API response
 */
export function extractNextCursor(
	instructions: Array<Record<string, unknown>>,
): string | null {
	try {
		for (const instruction of instructions) {
			if (instruction.type === "TimelineAddEntries" && instruction.entries) {
				const entries = instruction.entries as Array<{
					entryId: string
					content?: { value?: string }
				}>
				for (const entry of entries) {
					if (entry.entryId.startsWith("cursor-bottom-")) {
						return entry.content?.value || null
					}
				}
			}
		}
	} catch (error) {
		console.error("Error extracting cursor:", error)
	}

	return null
}

/**
 * Convert Tweet object to markdown format for storage
 */
export function tweetToMarkdown(tweet: Tweet): string {
	const username = tweet.user?.screen_name || "unknown"
	const displayName = tweet.user?.name || "Unknown User"
	const date = new Date(tweet.created_at).toLocaleDateString()
	const time = new Date(tweet.created_at).toLocaleTimeString()

	let markdown = `# Tweet by @${username} (${displayName})\n\n`
	markdown += `**Date:** ${date} ${time}\n`
	markdown += `**Likes:** ${tweet.favorite_count} | **Retweets:** ${tweet.retweet_count || 0} | **Replies:** ${tweet.reply_count || 0}\n\n`

	// Add tweet text
	markdown += `${tweet.text}\n\n`

	// Add media if present
	if (tweet.photos && tweet.photos.length > 0) {
		markdown += "**Images:**\n"
		tweet.photos.forEach((photo, index) => {
			markdown += `![Image ${index + 1}](${photo.url})\n`
		})
		markdown += "\n"
	}

	if (tweet.videos && tweet.videos.length > 0) {
		markdown += "**Videos:**\n"
		tweet.videos.forEach((video, index) => {
			markdown += `[Video ${index + 1}](${video.url})\n`
		})
		markdown += "\n"
	}

	// Add hashtags and mentions
	if (tweet.entities.hashtags.length > 0) {
		markdown += `**Hashtags:** ${tweet.entities.hashtags.map((h) => `#${h.text}`).join(", ")}\n`
	}

	if (tweet.entities.user_mentions.length > 0) {
		markdown += `**Mentions:** ${tweet.entities.user_mentions.map((m) => `@${m.screen_name}`).join(", ")}\n`
	}

	// Add raw data for reference
	markdown += `\n---\n<details>\n<summary>Raw Tweet Data</summary>\n\n\`\`\`json\n${JSON.stringify(tweet, null, 2)}\n\`\`\`\n</details>`

	return markdown
}

/**
 * Build Twitter API request variables for pagination
 */
export function buildRequestVariables(cursor?: string, count = 100) {
	const variables = {
		count,
		includePromotedContent: false,
	}

	if (cursor) {
		;(variables as Record<string, unknown>).cursor = cursor
	}

	return variables
}

/**
 * Build Twitter API request variables for bookmark collection
 */
export function buildBookmarkCollectionVariables(bookmarkCollectionId: string) {
	return {
		bookmark_collection_id: bookmarkCollectionId,
		includePromotedContent: true,
	}
}
