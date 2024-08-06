import { Tweet } from "react-tweet/api";

export const features = {
	graphql_timeline_v2_bookmark_timeline: true,
	rweb_tipjar_consumption_enabled: true,
	responsive_web_graphql_exclude_directive_enabled: true,
	verified_phone_label_enabled: false,
	creator_subscriptions_tweet_preview_api_enabled: true,
	responsive_web_graphql_timeline_navigation_enabled: true,
	responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
	communities_web_enable_tweet_community_results_fetch: true,
	c9s_tweet_anatomy_moderator_badge_enabled: true,
	articles_preview_enabled: true,
	tweetypie_unmention_optimization_enabled: true,
	responsive_web_edit_tweet_api_enabled: true,
	graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
	view_counts_everywhere_api_enabled: true,
	longform_notetweets_consumption_enabled: true,
	responsive_web_twitter_article_tweet_consumption_enabled: true,
	tweet_awards_web_tipping_enabled: false,
	creator_subscriptions_quote_tweet_preview_enabled: false,
	freedom_of_speech_not_reach_fetch_enabled: true,
	standardized_nudges_misinfo: true,
	tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
	rweb_video_timestamps_enabled: true,
	longform_notetweets_rich_text_read_enabled: true,
	longform_notetweets_inline_media_enabled: true,
	responsive_web_enhance_cards_enabled: false,
};

export function transformTweetData(input: any): Tweet | null {
	const tweet = input.content?.itemContent?.tweet_results?.result;

	if (!tweet || tweet.legacy === undefined) {
		return null;
	}

	const transformed: Tweet = {
		__typename: tweet.__typename,
		lang: tweet.legacy?.lang,
		favorite_count: tweet.legacy.favorite_count,
		created_at: new Date(tweet.legacy.created_at).toISOString(),
		display_text_range: tweet.legacy.display_text_range,
		entities: {
			hashtags: tweet.legacy.entities.hashtags,
			urls: tweet.legacy.entities?.urls,
			user_mentions: tweet.legacy.entities.user_mentions,
			symbols: tweet.legacy.entities.symbols,
		},
		id_str: tweet.legacy.id_str,
		text: tweet.legacy.full_text,
		user: {
			id_str: tweet.core.user_results.result.legacy.id_str,
			name: tweet.core.user_results.result.legacy.name,
			profile_image_url_https:
				tweet.core.user_results.result.legacy.profile_image_url_https,
			screen_name: tweet.core.user_results.result.legacy.screen_name,
			verified: tweet.core.user_results.result.legacy.verified,
			is_blue_verified: tweet.core.user_results.result.is_blue_verified,
			profile_image_shape: tweet.core.user_results.result.profile_image_shape,
		},
		edit_control: {
			edit_tweet_ids: tweet.edit_control.edit_tweet_ids,
			editable_until_msecs: tweet.edit_control.editable_until_msecs,
			is_edit_eligible: tweet.edit_control.is_edit_eligible,
			edits_remaining: tweet.edit_control.edits_remaining,
		},
		conversation_count: tweet.legacy.reply_count,
		news_action_type: "conversation",
		isEdited: tweet.edit_control.is_edit_eligible,
		isStaleEdit: false, // This value is derived from the context, adjust as needed
	};

	return transformed;
}
