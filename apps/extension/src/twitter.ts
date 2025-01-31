import { getBaseURL } from "@/lib/utils";
import { features } from "./twitter.constants";

const DEBUG = true;

const log = (message: string, ...args: any[]) => {
  if (DEBUG) {
    console.log("[twitter]", message, ...args);
  }
};

const logError = (message: string, error?: any) => {
  // Always log errors
  console.error(message, error);
};

export const waitForRequiredData = () => {
  return new Promise((resolve) => {
    const checkData = () => {
      chrome.storage.local.get(
        ["bookmarksApiId", "cookie", "csrf", "auth"],
        (result) => {
          if (
            result.bookmarksApiId &&
            result.cookie &&
            result.csrf &&
            result.auth
          ) {
            log("Got all data needed to fetch bookmarks");
            resolve(true);
          } else {
            setTimeout(checkData, 100); // Check again after 100ms
          }
        }
      );
    };
    checkData();
  });
};

export const handleExportXBookmarks = async () => {
  log("Received export request from popup");

  // First, create the Twitter tab
  const tab = await chrome.tabs.create({
    url: "https://x.com/i/bookmarks/all",
  });

  // Wait for the tab to finish loading
  await new Promise((resolve) => {
    const checkTab = () => {
      if (tab.id) {
        chrome.tabs.get(tab.id, (updatedTab) => {
          if (updatedTab.status === "complete") {
            resolve(true);
          } else {
            setTimeout(checkTab, 100);
          }
        });
      }
    };
    checkTab();
  });

  void chrome.storage.local.set({ attemptingImportCurrently: true });

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const currentTab = tabs[0];
    if (currentTab.id) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ["scripts/content.js"],
        });
      } catch (error) {
        console.error("Error injecting content script:", error);
      }
    }
  });

  // Wait for required data and start the bookmark export
  await waitForRequiredData();
  await sendProgressUpdate(0, 200);

  await getBookmarks();

  return { status: 200 };
};

const getNextCursor = (entries: any[]) => {
  const cursorEntry = entries.find((entry) =>
    entry.entryId.startsWith("cursor-bottom-")
  );
  return cursorEntry ? cursorEntry.content.value : null;
};

type MessageType = "IMPORT_PROGRESS_UPDATE" | "IMPORT_COMPLETE";

const sendMessageToTwitterTabs = async (
  message: {
    type: MessageType;
    payload: any;
  },
  retries = 3
) => {
  try {
    log(`Sending message of type ${message.type}:`, message.payload);

    const tabs = await chrome.tabs.query({
      url: ["*://*.twitter.com/*", "*://*.x.com/*"],
    });

    if (tabs.length === 0) {
      if (retries > 0) {
        // Wait and retry if no matching tab found
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return sendMessageToTwitterTabs(message, retries - 1);
      }
      throw new Error("No Twitter tab found");
    }

    const messagePromises = tabs.map((tab) => {
      if (!tab.id) return Promise.resolve();
      return chrome.tabs.sendMessage(tab.id, message).catch((error) => {
        logError(`Failed to send message to tab ${tab.id}:`, error);
      });
    });

    await Promise.all(messagePromises);
    log(`Message sent to ${tabs.length} tabs`);
  } catch (error) {
    logError(`Error sending message of type ${message.type}:`, error);
  }
};

const sendProgressUpdate = (progress: number, status: number) => {
  return sendMessageToTwitterTabs({
    type: "IMPORT_PROGRESS_UPDATE",
    payload: { progress, status },
  });
};

const sendImportComplete = () => {
  return sendMessageToTwitterTabs({
    type: "IMPORT_COMPLETE",
    payload: { success: true },
  });
};

const getBookmarks = async (cursor = "", totalImported = 0, allTweets = []) => {
  try {
    const getSessionData = (): Promise<{
      cookie: string;
      csrf: string;
      auth: string;
      bookmarksApiId: string;
    }> => {
      return new Promise((resolve) => {
        const checkData = () => {
          chrome.storage.local.get(
            ["cookie", "csrf", "auth", "bookmarksApiId"],
            (result) => {
              if (
                result.cookie &&
                result.csrf &&
                result.auth &&
                result.bookmarksApiId
              ) {
                resolve({
                  cookie: result.cookie,
                  csrf: result.csrf,
                  auth: result.auth,
                  bookmarksApiId: result.bookmarksApiId,
                });
              } else {
                setTimeout(checkData, 3000); // Check again after 3 seconds
              }
            }
          );
        };
        checkData();
      });
    };

    const sessionResult = await getSessionData();
    const baseURL = await getBaseURL();

    const headers = new Headers();
    headers.append("Cookie", sessionResult.cookie);
    headers.append("X-Csrf-token", sessionResult.csrf);
    headers.append("Authorization", sessionResult.auth);

    const variables = {
      count: 100,
      cursor: cursor,
      includePromotedContent: false,
    };
    const API_URL = `https://x.com/i/api/graphql/${
      sessionResult.bookmarksApiId
    }/Bookmarks?features=${encodeURIComponent(
      JSON.stringify(features)
    )}&variables=${encodeURIComponent(JSON.stringify(variables))}` as const;

    const response = await fetch(API_URL, {
      method: "GET",
      headers: headers,
      redirect: "follow",
    });

    if (response.status === 429) {
      log("Rate limited, waiting 60 seconds before retrying...");
      await sendProgressUpdate(totalImported, 429);
      await new Promise((resolve) => setTimeout(resolve, 60000));
      return getBookmarks(cursor, totalImported, allTweets);
    }

    const data = (await response.json()) as any;
    const entries =
      data.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]?.entries ||
      [];

    const tweetEntries = entries.filter((entry: { entryId: string }) =>
      entry.entryId.startsWith("tweet-")
    );

    // Process tweets and create URLs
    const tweetUrls = tweetEntries
      .map((tweet: any) => {
        const tweetId = tweet?.entryId?.split("-")[1];
        const username =
          tweet?.content?.itemContent?.tweet_results?.result?.core?.user_results
            ?.result?.legacy?.screen_name;

        if (!tweetId) return null;
        return `https://x.com/${username || "supermemoryai"}/status/${tweetId}`;
      })
      .filter(Boolean);

    // Send progress update before processing batch
    await sendProgressUpdate(totalImported, 102); // 102 = Processing batch

    // Send all tweets in parallel
    const addRequests = tweetUrls.map((tweetUrl: string) =>
      fetch(`${baseURL}/backend/v1/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: tweetUrl,
        }),
      })
    );

    const results = await Promise.all(addRequests);

    // Track different response statuses
    const statusCounts = results.reduce((acc: { [key: number]: number }, r) => {
      const status = r.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Log status counts
    Object.entries(statusCounts).forEach(([status, count]) => {
      log(`Status ${status}: ${count} tweets`);
    });

    // If we have any 409s, send that in the progress update
    if (statusCounts[409]) {
      await sendProgressUpdate(totalImported, 409);
    }

    // Consider request successful even if some tweets already exist (409)
    const failedRequests = results.filter(
      (r) => !r.ok && r.status !== 409
    ).length;
    if (failedRequests > 0) {
      await sendProgressUpdate(totalImported, 500); // 500 = Some requests failed
    }

    allTweets = allTweets.concat(tweetEntries);
    const newTweetsCount = tweetEntries.length;
    totalImported += newTweetsCount;

    // Update progress based on total tweets found so far
    const estimatedTotalTweets = Math.max(totalImported, 200); // Adjust estimate as we find more
    await sendProgressUpdate(
      totalImported,
      failedRequests > 0 ? 500 : statusCounts[409] ? 409 : 200
    );

    log(
      `Processing batch: ${newTweetsCount} new tweets, total: ${totalImported}`
    );
    const nextCursor = getNextCursor(entries);

    if (nextCursor && newTweetsCount > 0) {
      // Add delay between batches to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return getBookmarks(nextCursor, totalImported, allTweets);
    } else {
      // Final success update
      await sendImportComplete();

      chrome.storage.local.set({ bookmarks: allTweets }, () => {
        log("Bookmarks stored in local storage");
      });
      const timestamp = new Date().toISOString();
      chrome.storage.local.get(["successful_exports"], (result) => {
        const successful_exports = result.successful_exports || [];
        successful_exports.push({
          timestamp,
          tweetCount: allTweets.length,
        });
        chrome.storage.local.set({ successful_exports }, () => {
          log(`Export completed: ${allTweets.length} tweets`);
        });
      });
      void chrome.storage.local.set({ attemptingImportCurrently: false });

      // After successful import completion:
      window.postMessage(
        { type: "TWITTER_IMPORT_COMPLETE" },
        window.location.origin
      );
    }
  } catch (error) {
    logError("Error fetching bookmarks:", error);
    void chrome.storage.local.set({ attemptingImportCurrently: false });
  }
};

export const setupTwitterHeaderListener = () => {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      try {
        // Validate input
        if (!details || !details.url) {
          console.error("Invalid details object received");
          return;
        }

        // Check if URL is from Twitter/X
        if (
          !(
            details.url.includes("x.com") || details.url.includes("twitter.com")
          )
        ) {
          return;
        }

        // Ensure requestHeaders exists
        if (!details.requestHeaders) {
          console.error("No request headers found");
          return;
        }

        // Check if stuff is already stored
        chrome.storage.local.get(
          ["bookmarksApiId", "cookie", "csrf", "auth"],
          (result) => {
            try {
              // Check if the URL matches the pattern for bookmarks API
              const bookmarksUrlPattern =
                /https:\/\/x\.com\/i\/api\/graphql\/([^/]+)\/Bookmarks\?/;
              const match = details.url.match(bookmarksUrlPattern);

              if (match?.[1] && !result.bookmarksApiId) {
                const bookmarksApiId = match[1];
                chrome.storage.local.set({ bookmarksApiId }, () => {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "Error storing bookmarksApiId:",
                      chrome.runtime.lastError
                    );
                    return;
                  }
                  console.log(`Stored bookmarksApiId: ${bookmarksApiId}`);
                });
              }

              // Extract headers with error handling
              const getHeaderValue = (name: string): string => {
                const header = details.requestHeaders?.find(
                  (h) => h.name.toLowerCase() === name.toLowerCase()
                );
                return header?.value || "";
              };

              const auth = getHeaderValue("authorization");
              const cookie = getHeaderValue("cookie");
              const csrf = getHeaderValue("x-csrf-token");

              // // Validate required headers
              // if (!auth || !cookie || !csrf) {
              //   console.warn("Missing required headers", {
              //     hasAuth: !!auth,
              //     hasCookie: !!cookie,
              //     hasCsrf: !!csrf,
              //   });
              //   return;
              // }

              // Only update storage if values have changed
              if (
                result.cookie !== cookie ||
                result.csrf !== csrf ||
                result.auth !== auth
              ) {
                chrome.storage.local.set({ cookie, csrf, auth }, () => {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "Error updating credentials:",
                      chrome.runtime.lastError
                    );
                    return;
                  }
                  console.log(
                    "Updated cookie, csrf, and auth in local storage"
                  );
                });
              }
            } catch (err) {
              console.error("Error processing request headers:", err);
            }
          }
        );
      } catch (err) {
        console.error("Top level error in onBeforeSendHeaders listener:", err);
      }
    },
    { urls: ["*://x.com/*", "*://twitter.com/*"] },
    ["requestHeaders", "extraHeaders"]
  );
};
