import { Tweet } from "react-tweet/api";

export const tweetToMd = (tweet: Tweet) => {
  return `Tweet from @${tweet.user?.name ?? tweet.user?.screen_name ?? "Unknown"}

    ${tweet.text}
    Images: ${tweet.photos ? tweet.photos.map((photo) => photo.url).join(", ") : "none"}
    Time: ${tweet.created_at}, Likes: ${tweet.favorite_count}, Retweets: ${tweet.conversation_count}
    
     <raw>${JSON.stringify(tweet)}</raw>`;
};

export const getRawTweet = (tweet: string) => {
  // Get the content inside the last <raw> tag, there can any number of <raw> tags in the tweet (or just one)
  const rawTag = /<raw>(.*)<\/raw>/gs; // Use 's' flag to match across multiple lines
  const match = rawTag.exec(tweet);
  if (match && match.length > 1) {
    // Remove the specified item pattern
    const cleanedContent = match[1]?.replace(
      /<---chunkId:.*?\n.*?\n---->/gs,
      "",
    );
    return cleanedContent;
  }
  return tweet;
};
