import { Tweet } from "react-tweet/api";
import { features, transformTweetData } from "./helpers";

const tweetToMd = (tweet: Tweet) => {
  return `Tweet from @${tweet.user?.name ?? tweet.user?.screen_name ?? "Unknown"}
  
      ${tweet.text}
      Images: ${tweet.photos ? tweet.photos.map((photo) => photo.url).join(", ") : "none"}
      Time: ${tweet.created_at}, Likes: ${tweet.favorite_count}, Retweets: ${tweet.conversation_count}
      
       <raw>${JSON.stringify(tweet)}</raw>`;
};

const BOOKMARKS_URL = `https://x.com/i/api/graphql/xLjCVTqYWz8CGSprLU349w/Bookmarks?features=${encodeURIComponent(JSON.stringify(features))}`;

const BACKEND_URL = "https://beta.supermemory.ai";

// This is to prevent going over the rate limit
let lastTwitterFetch = 0;

const batchImportAll = async (cursor = "", totalImported = 0) => {
  chrome.storage.session.get(["cookie", "csrf", "auth"], (result) => {
    if (!result.cookie || !result.csrf || !result.auth) {
      console.log("cookie, csrf, or auth is missing");
      return;
    }

    const myHeaders = new Headers();
    myHeaders.append("Cookie", result.cookie);
    myHeaders.append("X-Csrf-token", result.csrf);
    myHeaders.append("Authorization", result.auth);

    const requestOptions: RequestInit = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };

    const variables = {
      count: 100,
      cursor: cursor,
      includePromotedContent: false,
    };

    const urlWithCursor = cursor
      ? `${BOOKMARKS_URL}&variables=${encodeURIComponent(JSON.stringify(variables))}`
      : BOOKMARKS_URL;

    fetch(urlWithCursor, requestOptions)
      .then((response) => response.json())
      .then((data) => {
        const tweets = getAllTweets(data);
        let importedCount = 0;

        for (const tweet of tweets) {
          console.log(tweet);

          const tweetMd = tweetToMd(tweet);
          (async () => {
            chrome.storage.local.get(["jwt"], ({ jwt }) => {
              if (!jwt) {
                console.error("No JWT found");
                return;
              }
              fetch(`${BACKEND_URL}/api/store`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                  pageContent: tweetMd,
                  url: `https://twitter.com/supermemoryai/status/${tweet.id_str}`,
                  title: `Tweet by ${tweet.user.name}`,
                  description: tweet.text.slice(0, 100),
                  type: "tweet",
                }),
              }).then((ers) => {
                console.log(ers.status);
                importedCount++;
                totalImported++;
                // Send an update message to the content script
                chrome.runtime.sendMessage({
                  type: "import-update",
                  importedCount: totalImported,
                });
              });
            });
          })();
        }

        console.log("tweets", tweets);
        console.log("data", data);

        const instructions =
          data.data?.bookmark_timeline_v2?.timeline?.instructions;
        const lastInstruction = instructions?.[0].entries.pop();

        if (lastInstruction?.entryId.startsWith("cursor-bottom-")) {
          let nextCursor = lastInstruction?.content?.value;

          if (!nextCursor) {
            for (let i = instructions.length - 1; i >= 0; i--) {
              if (instructions[i].entryId.startsWith("cursor-bottom-")) {
                nextCursor = instructions[i].content.value;
                break;
              }
            }
          }

          if (nextCursor) {
            batchImportAll(nextCursor, totalImported); // Recursively call with new cursor
          } else {
            console.log("All bookmarks imported");
            // Send a "done" message to the content script
            chrome.runtime.sendMessage({
              type: "import-done",
              importedCount: totalImported,
            });
          }
        } else {
          console.log("All bookmarks imported");
          // Send a "done" message to the content script
          chrome.runtime.sendMessage({
            type: "import-done",
            importedCount: totalImported,
          });
        }
      })
      .catch((error) => console.error(error));
  });
};

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (
      !(details.url.includes("x.com") || details.url.includes("twitter.com"))
    ) {
      return;
    }
    const authHeader = details.requestHeaders!.find(
      (header) => header.name.toLowerCase() === "authorization",
    );
    const auth = authHeader ? authHeader.value : "";

    const cookieHeader = details.requestHeaders!.find(
      (header) => header.name.toLowerCase() === "cookie",
    );
    const cookie = cookieHeader ? cookieHeader.value : "";

    const csrfHeader = details.requestHeaders!.find(
      (header) => header.name.toLowerCase() === "x-csrf-token",
    );
    const csrf = csrfHeader ? csrfHeader.value : "";

    if (!auth || !cookie || !csrf) {
      console.log("auth, cookie, or csrf is missing");
      return;
    }
    chrome.storage.session.set({ cookie, csrf, auth });
    chrome.storage.local.get(["twitterBookmarks"], (result) => {
      console.log("twitterBookmarks", result.twitterBookmarks);
      if (result.twitterBookmarks !== "true") {
        console.log("twitterBookmarks is NOT true");
      } else {
        if (
          !details.requestHeaders ||
          details.requestHeaders.length === 0 ||
          details.requestHeaders === undefined
        ) {
          return;
        }

        // Check cache first
        chrome.storage.local.get(["lastFetch", "cachedData"], (result) => {
          const now = new Date().getTime();
          if (result.lastFetch && now - result.lastFetch < 30 * 60 * 1000) {
            // Cached data is less than 30 minutes old, use it
            console.log("Using cached data");
            console.log(result.cachedData);
            return;
          }

          // No valid cache, proceed to fetch
          const authHeader = details.requestHeaders!.find(
            (header) => header.name.toLowerCase() === "authorization",
          );
          const auth = authHeader ? authHeader.value : "";

          const cookieHeader = details.requestHeaders!.find(
            (header) => header.name.toLowerCase() === "cookie",
          );
          const cookie = cookieHeader ? cookieHeader.value : "";

          const csrfHeader = details.requestHeaders!.find(
            (header) => header.name.toLowerCase() === "x-csrf-token",
          );
          const csrf = csrfHeader ? csrfHeader.value : "";

          if (!auth || !cookie || !csrf) {
            console.log("auth, cookie, or csrf is missing");
            return;
          }
          chrome.storage.session.set({ cookie, csrf, auth });

          const myHeaders = new Headers();
          myHeaders.append("Cookie", cookie);
          myHeaders.append("X-Csrf-token", csrf);
          myHeaders.append("Authorization", auth);

          const requestOptions: RequestInit = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow",
          };

          const variables = {
            count: 200,
            includePromotedContent: false,
          };

          // only fetch once in 1 minute
          if (now - lastTwitterFetch < 60 * 1000) {
            console.log("Waiting for ratelimits");
            return;
          }

          fetch(
            `${BOOKMARKS_URL}&variables=${encodeURIComponent(JSON.stringify(variables))}`,
            requestOptions,
          )
            .then((response) => response.text())
            .then((result) => {
              const tweets = getAllTweets(JSON.parse(result));

              console.log("tweets", tweets);
              // Cache the result along with the current timestamp
              chrome.storage.local.set({
                lastFetch: new Date().getTime(),
                cachedData: tweets,
              });

              lastTwitterFetch = now;
            })
            .catch((error) => console.error(error));
        });
        return;
      }
    });
  },
  { urls: ["*://x.com/*", "*://twitter.com/*"] },
  ["requestHeaders", "extraHeaders"],
);

const getAllTweets = (rawJson: any): Tweet[] => {
  const entries =
    rawJson?.data?.bookmark_timeline_v2?.timeline?.instructions[0]?.entries;

  console.log("Entries: ", entries);

  if (!entries) {
    console.error("No entries found");
    return [];
  }

  const tweets = entries
    .map((entry: any) => transformTweetData(entry))
    .filter((tweet: Tweet | null) => tweet !== null) as Tweet[];

  console.log(tweets);

  return tweets;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request);
  if (request.type === "getJwt") {
    chrome.storage.local.get(["jwt"], ({ jwt }) => {
      sendResponse({ jwt });
    });

    return true;
  } else if (request.type === "urlSave") {
    const content = request.content;
    const url = request.url;
    const title = request.title;
    const description = request.description;
    const ogImage = request.ogImage;
    const favicon = request.favicon;
    console.log(request.content, request.url);

    (async () => {
      chrome.storage.local.get(["jwt"], ({ jwt }) => {
        if (!jwt) {
          console.error("No JWT found");
          return;
        }
        fetch(`${BACKEND_URL}/api/store`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            pageContent: content,
            url: url + "#supermemory-user-" + Math.random(),
            title,
            spaces: request.spaces,
            description,
            ogImage,
            image: favicon,
          }),
        }).then((ers) => console.log(ers.status));
      });
    })();
  } else if (request.type === "batchImportAll") {
    batchImportAll();
  }
});
