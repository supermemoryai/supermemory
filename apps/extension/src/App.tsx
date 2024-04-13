import { useEffect, useState } from "react";
import { z } from "zod";
import { userObj } from "./types/zods";
import { getEnv } from "./util";

const backendUrl =
  getEnv() === "development"
    ? "http://localhost:3000"
    : "https://supermemory.dhr.wtf";

function App() {
  const [userData, setUserData] = useState<z.infer<typeof userObj> | null>(
    null,
  );

  const getUserData = () => {
    chrome.runtime.sendMessage({ type: "getJwt" }, (response) => {
      const jwt = response.jwt;
      const loginButton = document.getElementById("login");

      if (loginButton) {
        if (jwt) {
          fetch(`${backendUrl}/api/me`, {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          })
            .then((res) => res.json())
            .then((data) => {
              const d = userObj.safeParse(data);
              if (d.success) {
                setUserData(d.data);
              } else {
                console.error(d.error);
              }
            });
          loginButton.style.display = "none";
        }
      }
    });
  };

  useEffect(() => {
    getUserData();
  }, []);

  // TODO: Implement getting bookmarks from Twitter API directly
  // const [status, setStatus] = useState('');
  // const [bookmarks, setBookmarks] = useState<TweetData[]>([]);

  // const fetchBookmarks = (e: React.MouseEvent<HTMLButtonElement>) => {
  //   e.preventDefault();

  //   chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  //     chrome.tabs.sendMessage(tabs[0].id!, { action: 'showProgressIndicator' });
  //   });

  //   chrome.tabs.create(
  //     { url: 'https://twitter.com/i/bookmarks/all' },
  //     function (tab) {
  //       chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
  //         if (tabId === tab.id && info.status === 'complete') {
  //           chrome.tabs.onUpdated.removeListener(listener);

  //           chrome.runtime.sendMessage(
  //             { action: 'getAuthData' },
  //             function (response) {
  //               const authorizationHeader = response.authorizationHeader;
  //               const csrfToken = response.csrfToken;
  //               const cookies = response.cookies;

  //               if (authorizationHeader && csrfToken && cookies) {
  //                 fetchAllBookmarks(authorizationHeader, csrfToken, cookies)
  //                   .then((bookmarks) => {
  //                     console.log('Bookmarks data:', bookmarks);
  //                     setBookmarks(bookmarks);
  //                     chrome.tabs.sendMessage(tabId, {
  //                       action: 'hideProgressIndicator',
  //                     });
  //                     setStatus(
  //                       `Fetched ${bookmarks.length} bookmarked tweets.`,
  //                     );
  //                   })
  //                   .catch((error) => {
  //                     console.error('Error:', error);
  //                     chrome.tabs.sendMessage(tabId, {
  //                       action: 'hideProgressIndicator',
  //                     });
  //                     setStatus(
  //                       'Error fetching bookmarks. Please check the console for details.',
  //                     );
  //                   });
  //               } else {
  //                 chrome.tabs.sendMessage(tabId, {
  //                   action: 'hideProgressIndicator',
  //                 });
  //                 setStatus('Missing authentication data');
  //               }
  //             },
  //           );
  //         }
  //       });
  //     },
  //   );
  // };

  return (
    <div className="p-8">
      <button
        onClick={() =>
          chrome.tabs.create({
            url: `${backendUrl}/api/auth/signin`,
          })
        }
        id="login"
      >
        Log in
      </button>
      <div>
        {userData && (
          <div className="flex items-center">
            <img
              width={40}
              className="rounded-full"
              src={userData.data.user.image!}
              alt=""
            />
            <div>
              <h3>{userData.data.user.name}</h3>
              <p>{userData.data.user.email}</p>
            </div>
            {/* TODO: Implement getting bookmarks from API directly */}
            {/* <button onClick={(e) => fetchBookmarks(e)}>Fetch Bookmarks</button>
            <div>{status}</div>

            <div>
              {bookmarks.map((bookmark) => (
                <div key={bookmark.tweet_id}>
                  <p>{bookmark.author}</p>
                  <p>{bookmark.date}</p>
                  <p>{bookmark.full_text}</p>
                </div>
              ))}
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}

// TODO: Implement getting bookmarks from Twitter API directly
// async function fetchAllBookmarks(
//   authorizationHeader: string,
//   csrfToken: string,
//   cookies: string,
// ): Promise<TweetData[]> {
//   const baseUrl =
//     'https://twitter.com/i/api/graphql/uJEL6XARgGmo2EAsO2Pfkg/Bookmarks';
//   const params = new URLSearchParams({
//     variables: JSON.stringify({
//       count: 100,
//       includePromotedContent: true,
//     }),
//     features: JSON.stringify({
//       graphql_timeline_v2_bookmark_timeline: true,
//       rweb_tipjar_consumption_enabled: false,
//       responsive_web_graphql_exclude_directive_enabled: true,
//       verified_phone_label_enabled: true,
//       creator_subscriptions_tweet_preview_api_enabled: true,
//       responsive_web_graphql_timeline_navigation_enabled: true,
//       responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
//       communities_web_enable_tweet_community_results_fetch: true,
//       c9s_tweet_anatomy_moderator_badge_enabled: true,
//       tweetypie_unmention_optimization_enabled: true,
//       responsive_web_edit_tweet_api_enabled: true,
//       graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
//       view_counts_everywhere_api_enabled: true,
//       longform_notetweets_consumption_enabled: true,
//       responsive_web_twitter_article_tweet_consumption_enabled: true,
//       tweet_awards_web_tipping_enabled: false,
//       creator_subscriptions_quote_tweet_preview_enabled: false,
//       freedom_of_speech_not_reach_fetch_enabled: true,
//       standardized_nudges_misinfo: true,
//       tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:
//         true,
//       tweet_with_visibility_results_prefer_gql_media_interstitial_enabled:
//         false,
//       rweb_video_timestamps_enabled: true,
//       longform_notetweets_rich_text_read_enabled: true,
//       longform_notetweets_inline_media_enabled: true,
//       responsive_web_enhance_cards_enabled: false,
//     }),
//   });

//   const requestUrl = `${baseUrl}?${params}`;

//   const headers = {
//     Authorization: authorizationHeader,
//     'X-Csrf-Token': csrfToken,
//     Cookie: cookies,
//   };

//   const bookmarks: TweetData[] = [];
//   let nextCursor = null;
//   let requestCount = 0;
//   const maxRequestsPerWindow = 450;
//   const windowDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
//   let windowStartTime = Date.now();

//   do {
//     if (nextCursor) {
//       params.set(
//         'variables',
//         JSON.stringify({
//           count: 100,
//           cursor: nextCursor,
//           includePromotedContent: true,
//         }),
//       );
//     }

//     // Check if the rate limit is exceeded
//     if (requestCount >= maxRequestsPerWindow) {
//       const elapsedTime = Date.now() - windowStartTime;
//       if (elapsedTime < windowDuration) {
//         const waitTime = windowDuration - elapsedTime;
//         await new Promise((resolve) => setTimeout(resolve, waitTime));
//       }
//       requestCount = 0;
//       windowStartTime = Date.now();
//     }

//     try {
//       const response = await fetch(requestUrl, {
//         method: 'GET',
//         headers: headers,
//       });

//       requestCount++;

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();
//       const timeline = data.data.bookmark_timeline_v2.timeline;

//       timeline.instructions.forEach(
//         (instruction: {
//           type: string;
//           entries: {
//             content: {
//               entryType: string;
//               itemContent: {
//                 tweet_results: {
//                   result: {
//                     legacy: {
//                       full_text: string;
//                       created_at: string;
//                     };
//                     core: {
//                       user_results: {
//                         result: {
//                           legacy: {
//                             screen_name: string;
//                           };
//                         };
//                       };
//                     };
//                     rest_id: string;
//                   };
//                 };
//               };
//             };
//           }[];
//         }) => {
//           if (instruction.type === 'TimelineAddEntries') {
//             instruction.entries.forEach((entry) => {
//               if (entry.content.entryType === 'TimelineTimelineItem') {
//                 const tweet = entry.content.itemContent.tweet_results.result;
//                 const tweetData = {
//                   full_text: tweet.legacy.full_text,
//                   url: `https://twitter.com/${tweet.core.user_results.result.legacy.screen_name}/status/${tweet.rest_id}`,
//                   author: tweet.core.user_results.result.legacy.screen_name,
//                   date: tweet.legacy.created_at,
//                   tweet_id: tweet.rest_id,
//                 };
//                 bookmarks.push(tweetData);
//               }
//             });
//           }
//         },
//       );

//       nextCursor = timeline.instructions.find(
//         (instruction: { type: string }) =>
//           instruction.type === 'TimelineTerminateTimeline',
//       )?.direction?.cursor;
//     } catch (error) {
//       console.error('Error fetching bookmarks:', error);
//       throw error;
//     }
//   } while (nextCursor);

//   return bookmarks;
// }
export default App;
