import { WorkflowStep } from "cloudflare:workers";
import { isErr, Ok } from "../errors/results";
import { typeDecider } from "./typeDecider";
import { Env, WorkflowParams } from "../types";
import { unrollTweets } from "./tweetsToThreads";
import { Tweet } from "react-tweet/api";
import { NonRetryableError } from "cloudflare:workflows";
import { extractPageContent } from "./extractor";
import { extractDocumentContent } from "./extractDocumentContent";

export const fetchContent = async (
  params: WorkflowParams,
  env: Env,
  step: WorkflowStep
) => {
  const type = typeDecider(params.content);

  if (isErr(type)) {
    throw type.error;
  }

  switch (type.value) {
    case "page":
      const pageContent = await step?.do(
        "extract page content",
        async () => await extractPageContent(params.content, env)
      );
      return {
        ...pageContent,
        type: "page",
      };

    case "tweet":
      const tweetUrl = new URL(params.content);
      tweetUrl.search = ""; // Remove all search params
      const tweetId = tweetUrl.pathname.split("/").pop();

      const unrolledTweetContent = await step.do(
        "get unrolled tweet content",
        async () => await unrollTweets(tweetUrl.toString())
      );

      const rawBaseTweetContent = await step.do(
        "extract tweet content",
        async () => {
          const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue%3Btfw_tweet_edit_backend%3Aon%3Btfw_refsrc_session%3Aon%3Btfw_fosnr_soft_interventions_enabled%3Aon%3Btfw_show_birdwatch_pivots_enabled%3Aon%3Btfw_show_business_verified_badge%3Aon%3Btfw_duplicate_scribes_to_settings%3Aon%3Btfw_use_profile_image_shape_enabled%3Aon%3Btfw_show_blue_verified_badge%3Aon%3Btfw_legacy_timeline_sunset%3Atrue%3Btfw_show_gov_verified_badge%3Aon%3Btfw_show_business_affiliate_badge%3Aon%3Btfw_tweet_edit_frontend%3Aon&token=4c2mmul6mnh`;

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

          const data = (await resp.json()) as Tweet;
          return data;
        }
      );

      let tweetContent: {
        text: string;
        metadata: {
          media?: string[] | undefined;
          links?: string[] | undefined;
        };
        raw: string;
      };

      if (!unrolledTweetContent || isErr(unrolledTweetContent)) {
        console.error("Can't get thread, reverting back to single tweet");
        tweetContent = {
          text: rawBaseTweetContent.text,
          metadata: {
            media: [
              ...(rawBaseTweetContent.photos?.map((url) => url.expandedUrl) ??
                []),
              ...(rawBaseTweetContent.video?.variants[0].src ?? []),
            ],
          },
          raw: `<raw>${JSON.stringify(rawBaseTweetContent)}</raw>`,
        };
      } else {
        tweetContent = {
          text: unrolledTweetContent.value
            .map((tweet) => tweet.text)
            .join("\n"),
          metadata: {
            media: unrolledTweetContent.value.flatMap((tweet) => [
              ...tweet.videos,
              ...tweet.images,
            ]),
            links: unrolledTweetContent.value.flatMap((tweet) => tweet.links),
          },
          raw: `<raw>${JSON.stringify(rawBaseTweetContent)}</raw>`,
        };
      }

      // make it the same type as the page content
      const pageContentType: Awaited<ReturnType<typeof extractPageContent>> & {
        type: string;
      } = {
        contentToVectorize:
          tweetContent.text +
          "\n\nMetadata for this tweet:\n" +
          JSON.stringify(tweetContent.metadata) +
          "\n\nRaw tweet data:\n" +
          tweetContent.raw,
        contentToSave: tweetContent.raw,
        title: "",
        description: JSON.stringify(tweetContent.metadata),
        image: "",
        favicon: "",
        type: "tweet",
      };
      return pageContentType;
    case "note":
      const noteContent = {
        contentToVectorize: params.content,
        // TODO: different when using platejs
        contentToSave: params.content,
        // title is the first 30 characters of the first line
        title: params.content.split("\n")[0].slice(0, 30),
        type: "note",
      };
      return noteContent;
    case "document":
      const documentContent = await step.do(
        "extract document content",
        async () => await extractDocumentContent(params.content)
      );
      return {
        contentToVectorize: documentContent.content,
        contentToSave: documentContent.content,
        type: "document",
      };
    default:
      throw new NonRetryableError("Unknown content type");
  }
};
