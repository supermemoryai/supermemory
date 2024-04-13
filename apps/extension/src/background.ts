import { getEnv } from "./util";
import { Space } from "./types/memory";

const backendUrl =
  getEnv() === "development"
    ? "http://localhost:3000"
    : "https://supermemory.dhr.wtf";

interface TweetData {
  tweetText: string;
  postUrl: string;
  authorName: string;
  handle: string;
  time: string;
  saveToUser: string;
}

// TODO: Implement getting bookmarks from Twitter API directly
// let authorizationHeader: string | null = null;
// let csrfToken: string | null = null;
// let cookies: string | null = null;

// chrome.webRequest.onBeforeSendHeaders.addListener(
//   (details) => {
//     for (let i = 0; i < details.requestHeaders!.length; ++i) {
//       const header = details.requestHeaders![i];
//       if (header.name.toLowerCase() === 'authorization') {
//         authorizationHeader = header.value || null;
//       } else if (header.name.toLowerCase() === 'x-csrf-token') {
//         csrfToken = header.value || null;
//       } else if (header.name.toLowerCase() === 'cookie') {
//         cookies = header.value || null;
//       }

//       console.log(header, authorizationHeader, csrfToken, cookies)
//     }
//   },
//   { urls: ['https://twitter.com/*', 'https://x.com/*'] },
//   ['requestHeaders']
// );

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getJwt") {
    chrome.storage.local.get(["jwt"], ({ jwt }) => {
      sendResponse({ jwt });
    });

    return true;
  } else if (request.type === "urlChange") {
    const content = request.content;
    const url = request.url;
    const spaces = request.spaces(
      // eslint-disable-next-line no-unexpected-multiline
      async () => {
        chrome.storage.local.get(["jwt"], ({ jwt }) => {
          if (!jwt) {
            console.error("No JWT found");
            return;
          }
          fetch(`${backendUrl}/api/store`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ pageContent: content, url, spaces }),
          }).then((ers) => console.log(ers.status));
        });
      },
    )();
  } else if (request.type === "fetchSpaces") {
    chrome.storage.local.get(["jwt"], async ({ jwt }) => {
      if (!jwt) {
        console.error("No JWT found");
        return;
      }
      const resp = await fetch(`${backendUrl}/api/spaces`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      const data: {
        message: "OK" | string;
        data: Space[] | undefined;
      } = await resp.json();

      if (data.message === "OK" && data.data) {
        sendResponse(data.data);
      }
    });

    return true;
  } else if (request.type === "queryApi") {
    const input = request.input;
    const jwt = request.jwt;

    (async () => {
      await fetch(`${backendUrl}/api/ask`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          query: input,
        }),
      }).then(async (response) => {
        if (!response.body) {
          throw new Error("No response body");
        }
        if (!sender.tab?.id) {
          throw new Error("No tab ID");
        }
        const reader = response.body.getReader();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // For simplicity, we're sending chunks as they come.
          // This might need to be adapted based on your data and needs.
          const chunkAsString = new TextDecoder("utf-8")
            .decode(value)
            .replace("data: ", "");
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "streamData",
            data: chunkAsString,
          });
        }
        // Notify the content script that the stream is complete.
        chrome.tabs.sendMessage(sender.tab.id, { action: "streamEnd" });
      });
      // Indicate that sendResponse will be called asynchronously.
      return true;
    })();
  }
  // TODO: Implement getting bookmarks from Twitter API directly
  // else if (request.action === 'getAuthData') {
  //   sendResponse({
  //     authorizationHeader: authorizationHeader,
  //     csrfToken: csrfToken,
  //     cookies: cookies
  //   });
  // }
  else if (request.type === "sendBookmarkedTweets") {
    const jwt = request.jwt;
    const tweets = request.tweets as TweetData[];

    (async () => {
      await fetch(`${backendUrl}/api/vectorizeTweets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(tweets),
      }).then(async (response) => {
        return response.json();
      });
    })();

    return true;
  }
});
