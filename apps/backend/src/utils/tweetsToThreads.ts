import * as cheerio from "cheerio";
import { BaseError } from "../errors/baseError";
import { Ok, Result } from "../errors/results";

interface Tweet {
  id: string;
  text: string;
  links: Array<string>;
  images: Array<string>;
  videos: Array<string>;
}

class ProcessTweetsError extends BaseError {
  constructor(message?: string, source?: string) {
    super("[Thread Proceessing Error]", message, source);
  }
}

type TweetProcessResult = Array<Tweet>;

// there won't be a need for url caching right?
export async function unrollTweets(
  url: string
): Promise<Result<TweetProcessResult, ProcessTweetsError>> {
  const tweetId = url.split("/").pop();
  const response = await fetch(`https://unrollnow.com/status/${tweetId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Cache-Control": "max-age=3600",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(error);
    throw new Error(`HTTP error! status: ${response.status} - ${error}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const tweets: Array<Tweet> = [];

  const urlRegex = /(https?:\/\/\S+)/g;
  const paragraphs = $(".mainarticle p").toArray();

  const processedTweets = await Promise.all(
    paragraphs.map(async (element, i) => {
      const $tweet = $(element);
      let tweetText = $tweet.text().trim();
      if (tweetText.length < 1) {
        return null;
      }

      if (i === paragraphs.length - 1 && tweetText.toLowerCase() === "yes") {
        return null;
      }

      const shortUrls = tweetText.match(urlRegex) || [];
      console.log("SHORT_URLS_LEN", shortUrls.length);
      console.log("SHORT_URLS", shortUrls);

      const expandedUrls = await Promise.all(shortUrls.map(expandShortUrl));

      tweetText = tweetText.replace(urlRegex, "").trim().replace(/\s+/g, " ");

      const images = $tweet
        .nextUntil("p")
        .find("img.tweetimg")
        .map((i, img) => $(img).attr("src"))
        .get();

      const videos = $tweet
        .nextUntil("p")
        .find("video > source")
        .map((i, vid) => $(vid).attr("src"))
        .get();

      return {
        id: `${tweetId}_${i}`,
        text: tweetText,
        links: expandedUrls,
        images: images,
        videos: videos,
      };
    })
  );

  tweets.push(
    ...processedTweets.filter((tweet): tweet is Tweet => tweet !== null)
  );

  return Ok(tweets);
}

async function expandShortUrl(shortUrl: string): Promise<string> {
  try {
    const response = await fetch(shortUrl, {
      method: "HEAD",
      redirect: "follow",
    });
    const expandedUrl = response.url;
    return expandedUrl;
  } catch (error) {
    console.error(`Failed to expand URL: ${shortUrl}`, error);
    return shortUrl;
  }
}
