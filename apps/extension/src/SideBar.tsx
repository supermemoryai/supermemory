import { useState } from "react";

import "./ext.css";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import { FilterSpaces } from "./components/FilterCombobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "./components/ui/dialog";
import { Space } from "./types/memory";

function sendUrlToAPI(spaces: number[]) {
  // get the current URL
  const url = window.location.href;

  const blacklist = ["localhost:3000", "anycontext.dhr.wtf"];
  // check if the URL is blacklisted
  if (blacklist.some((blacklisted) => url.includes(blacklisted))) {
    console.log("URL is blacklisted");
    return;
  } else {
    // const content = Entire page content, but cleaned up for the LLM. No ads, no scripts, no styles, just the text. if article, just the importnat info abou tit.
    const content = document.documentElement.innerText;
    chrome.runtime.sendMessage({ type: "urlChange", content, url, spaces });
  }
}

function SideBar({ jwt }: { jwt: string }) {
  // TODO: Implement getting bookmarks from Twitter API directly
  // chrome.runtime.onMessage.addListener(function (request) {
  //   if (request.action === 'showProgressIndicator') {
  //     // TODO: SHOW PROGRESS INDICATOR
  //     // showProgressIndicator();
  //   } else if (request.action === 'hideProgressIndicator') {
  //     // hideProgressIndicator();
  //   }
  // });

  const [savedWebsites, setSavedWebsites] = useState<string[]>([]);

  const [isSendingData, setIsSendingData] = useState(false);

  const [loading, setLoading] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>();
  const [selectedSpaces, setSelectedSpaces] = useState<number[]>([]);

  const [isImportingTweets, setIsImportingTweets] = useState(false);

  const [log, setLog] = useState<string[]>([]);

  interface TweetData {
    tweetText: string;
    postUrl: string;
    authorName: string;
    handle: string;
    time: string;
    saveToUser: string;
  }

  function sendBookmarkedTweetsToAPI(tweets: TweetData[], token: string) {
    chrome.runtime.sendMessage({
      type: "sendBookmarkedTweets",
      jwt: token,
      tweets,
    });
  }

  const fetchSpaces = async () => {
    setLoading(true);
    chrome.runtime.sendMessage({ type: "fetchSpaces" }, (resp) => {
      console.log("response", resp);
      setSpaces(resp);
      setLoading(false);
    });
  };

  const fetchBookmarks = () => {
    const tweets: TweetData[] = []; // Initialize an empty array to hold all tweet elements

    setIsImportingTweets(true);
    console.log("Importing tweets");

    const scrollInterval = 1000;
    const scrollStep = 5000; // Pixels to scroll on each step

    let previousTweetCount = 0;
    let unchangedCount = 0;

    const scrollToEndIntervalID = setInterval(() => {
      window.scrollBy(0, scrollStep);
      const currentTweetCount = tweets.length;
      if (currentTweetCount === previousTweetCount) {
        unchangedCount++;
        if (unchangedCount >= 2) {
          setLog([
            ...log,
            "Scraping complete",
            `Total tweets scraped: ${tweets.length}`,
            "Downloading tweets as JSON...",
          ]);
          clearInterval(scrollToEndIntervalID); // Stop scrolling
          observer.disconnect(); // Stop observing DOM changes
          downloadTweetsAsJson(tweets); // Download the tweets list as a JSON file
        }
      } else {
        unchangedCount = 0; // Reset counter if new tweets were added
      }
      previousTweetCount = currentTweetCount; // Update previous count for the next check
    }, scrollInterval);

    function updateTweets() {
      document
        .querySelectorAll('article[data-testid="tweet"]')
        .forEach((tweetElement) => {
          const authorName = (
            tweetElement.querySelector(
              '[data-testid="User-Name"]',
            ) as HTMLElement
          )?.innerText;

          const handle = (
            tweetElement.querySelector('[role="link"]') as HTMLLinkElement
          ).href
            .split("/")
            .pop();

          const tweetText = (
            tweetElement.querySelector(
              '[data-testid="tweetText"]',
            ) as HTMLElement
          )?.innerText;
          const time = (
            tweetElement.querySelector("time") as HTMLTimeElement
          ).getAttribute("datetime");
          const postUrl = (
            tweetElement.querySelector(
              ".css-175oi2r.r-18u37iz.r-1q142lx a",
            ) as HTMLLinkElement
          )?.href;

          const isTweetNew = !tweets.some((tweet) => tweet.postUrl === postUrl);
          if (isTweetNew) {
            tweets.push({
              authorName,
              handle: handle ?? "",
              tweetText,
              time: time ?? "",
              postUrl,
              saveToUser: jwt,
            });

            setLog([...log, `Scraped tweet: ${tweets.length}`]);
          }
        });
    }

    // Initially populate the tweets array
    updateTweets();

    // Create a MutationObserver to observe changes in the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          updateTweets(); // Call updateTweets whenever new nodes are added to the DOM
        }
      });
    });

    // Start observing the document body for child list changes
    observer.observe(document.body, { childList: true, subtree: true });

    function downloadTweetsAsJson(tweetsArray: TweetData[]) {
      setLog([...log, "Saving the tweets to our database..."]);
      sendBookmarkedTweetsToAPI(tweetsArray, jwt);
      setIsImportingTweets(false);
    }
  };

  return (
    <>
      {isImportingTweets && (
        <div className="anycontext-overlay anycontext-fixed anycontext-font-sans anycontext-inset-0 anycontext-bg-black anycontext-bg-opacity-50">
          <div className="anycontext-flex anycontext-items-center anycontext-justify-center anycontext-h-screen">
            <div className="anycontext-flex anycontext-flex-col anycontext-items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="anycontext-w-10 anycontext-h-10 anycontext-animate-spin"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                />
              </svg>
              <p className="anycontext-mt-2">Importing your tweets...</p>
              <div className="anycontext-mt-2">
                {log.map((message, index) => (
                  <p key={index}>{message}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <TooltipProvider>
        <div className="anycontext-flex anycontext-group anycontext-flex-col anycontext-gap-2 anycontext-fixed anycontext-bottom-12 anycontext-right-0 anycontext-z-[99999] anycontext-font-sans">
          {window.location.href.includes("twitter.com") ||
          window.location.href.includes("x.com") ? (
            <Tooltip delayDuration={300}>
              <TooltipTrigger className="anycontext-bg-transparent anycontext-border-none anycontext-m-0 anycontext-p-0">
                <button
                  onClick={() => {
                    if (window.location.href.endsWith("/i/bookmarks/all")) {
                      fetchBookmarks();
                    } else {
                      window.location.href =
                        "https://twitter.com/i/bookmarks/all";

                      setTimeout(() => {
                        fetchBookmarks();
                      }, 2500);
                    }
                  }}
                  className="anycontext-open-button disabled:anycontext-opacity-30 anycontext-bg-transparent
                          anycontext-border-none anycontext-m-0 anycontext-p-0"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="anycontext-w-6 anycontext-h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                    />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent className="anycontext-p-0" side="left">
                <p className="anycontext-p-0 anycontext-m-0">
                  Import twitter bookmarks
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <></>
          )}
          <Dialog onOpenChange={(open) => open === true && fetchSpaces()}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger
                className="anycontext-bg-transparent
									anycontext-border-none anycontext-m-0 anycontext-p-0
								"
              >
                <DialogTrigger asChild>
                  <button
                    disabled={savedWebsites.includes(window.location.href)}
                    className="anycontext-open-button disabled:anycontext-opacity-30 anycontext-bg-transparent
											anycontext-border-none anycontext-m-0 anycontext-p-0"
                  >
                    {savedWebsites.includes(window.location.href) ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-file-check-2"
                      >
                        <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
                        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        <path d="m3 15 2 2 4-4" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`anycontext-w-5 anycontext-h-5 ${isSendingData ? "anycontext-animate-spin" : ""}`}
                      >
                        <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
                      </svg>
                    )}
                  </button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent className="anycontext-p-0" side="left">
                <p className="anycontext-p-0 anycontext-m-0">
                  {savedWebsites.includes(window.location.href)
                    ? "Added to memory"
                    : "Add to memory"}
                </p>
              </TooltipContent>
            </Tooltip>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Memory</DialogTitle>
                <DialogDescription>
                  Add the current page to memory
                </DialogDescription>
              </DialogHeader>

              <FilterSpaces
                loading={loading}
                className="anycontext-mr-auto"
                selectedSpaces={selectedSpaces}
                setSelectedSpaces={setSelectedSpaces}
                name={"Add to Spaces"}
                spaces={spaces ?? []}
              />
              <DialogFooter className="anycontext-w-full anycontext-text-sm">
                <DialogClose
                  onClick={() => {
                    sendUrlToAPI(selectedSpaces);
                    setIsSendingData(true);
                    setTimeout(() => {
                      setIsSendingData(false);
                      setSavedWebsites([
                        ...savedWebsites,
                        window.location.href,
                      ]);
                    }, 1000);
                  }}
                >
                  Add
                </DialogClose>
                <DialogClose>Cancel</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </>
  );
}

export default SideBar;
