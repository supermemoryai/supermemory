import React, { useEffect, useState } from "react";
import { Readability } from "@mozilla/readability";

export default function ContentApp({ token }: { token: string | undefined }) {
  const [text, setText] = useState("");
  const [hover, setHover] = useState(false);

  const [loading, setLoading] = useState(false);

  const [isTwitterBookmarksEnabled, setIsTwitterBookmarksEnabled] =
    useState(false);

  useEffect(() => {
    const messageListener = (message: any) => {
      setText(message);
      setTimeout(() => setText(""), 2000);
    };
    chrome.runtime.onMessage.addListener(messageListener);

    document.addEventListener("mousemove", (e) => {
      const percentageX = (e.clientX / window.innerWidth) * 100;
      const percentageY = (e.clientY / window.innerHeight) * 100;

      if (percentageX > 75 && percentageY > 75) {
        setHover(true);
      } else {
        setHover(false);
      }
    });

    const getUserData = () => {
      const NO_JWT = [
        "supermemory.ai",
        "beta.supermemory.ai",
        "localhost:3000",
      ];
      chrome.runtime.sendMessage({ type: "getJwt" }, (response) => {
        if (!response.jwt && !NO_JWT.includes(window.location.host)) {
          window.location.href = "https://supermemory.ai/signin";
        }

        console.log("jwt", response.jwt);
      });
    };

    getUserData();

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  function sendUrlToAPI(spaces: number[]) {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
    }, 1500);

    // get the current URL
    const url = window.location.href;

    const blacklist: string[] = [];
    // check if the URL is blacklisted
    if (blacklist.some((blacklisted) => url.includes(blacklisted))) {
      console.log("URL is blacklisted");
      return;
    } else {
      const clone = document.cloneNode(true) as Document;
      const article = new Readability(clone).parse();

      const ogImage = document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content");

      const favicon = (
        document.querySelector('link[rel="icon"]') as HTMLLinkElement
      )?.href;

      console.log("article", article);
      chrome.runtime.sendMessage({
        type: "urlSave",
        content: article?.textContent,
        url,
        spaces,
        title: article?.title,
        description: article?.excerpt,
        ogImage: ogImage,
        favicon: favicon,
      });
    }
  }

  return (
    <div className="flex justify-end items-end min-h-screen w-full">
      <button
        onClick={() => sendUrlToAPI([])}
        className={`${hover && "opacity-100"} hover:bg-black p-2 rounded-l-2xl transition bg-gray-900 border border-white/20 opacity-0 size-4 h-[30vh] absolute flex bottom-20 items-center text-lg`}
      >
        {loading ? (
          <div className="text-sm">Saving...</div>
        ) : (
          <svg
            className="size-8"
            width={24}
            height={24}
            viewBox="0 0 42 42"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.0357 8C20.5531 8 21 9.27461 21 10.8438V16.3281H23.5536V14.2212C23.5536 13.1976 23.9468 12.216 24.6467 11.4922L25.0529 11.0721C24.9729 10.8772 24.9286 10.6627 24.9286 10.4375C24.9286 9.54004 25.6321 8.8125 26.5 8.8125C27.3679 8.8125 28.0714 9.54004 28.0714 10.4375C28.0714 11.335 27.3679 12.0625 26.5 12.0625C26.2822 12.0625 26.0748 12.0167 25.8863 11.9339L25.4801 12.354C25.0012 12.8492 24.7321 13.5209 24.7321 14.2212V16.3281H28.9714C29.2045 15.7326 29.7691 15.3125 30.4286 15.3125C31.2964 15.3125 32 16.04 32 16.9375C32 17.835 31.2964 18.5625 30.4286 18.5625C29.7691 18.5625 29.2045 18.1424 28.9714 17.5469H21V21.2031H25.0428C25.2759 20.6076 25.8405 20.1875 26.5 20.1875C27.3679 20.1875 28.0714 20.915 28.0714 21.8125C28.0714 22.71 27.3679 23.4375 26.5 23.4375C25.8405 23.4375 25.2759 23.0174 25.0428 22.4219H21V26.0781H24.4125C25.4023 26.0781 26.3516 26.4847 27.0515 27.2085L29.0292 29.2536C29.2177 29.1708 29.4251 29.125 29.6429 29.125C30.5107 29.125 31.2143 29.8525 31.2143 30.75C31.2143 31.6475 30.5107 32.375 29.6429 32.375C28.775 32.375 28.0714 31.6475 28.0714 30.75C28.0714 30.5248 28.1157 30.3103 28.1958 30.1154L26.2181 28.0703C25.7392 27.5751 25.0897 27.2969 24.4125 27.2969H21V31.1562C21 32.7254 20.5531 34 19.0357 34C17.6165 34 16.4478 32.8879 16.3004 31.4559C16.0451 31.527 15.775 31.5625 15.5 31.5625C13.7665 31.5625 12.3571 30.1051 12.3571 28.3125C12.3571 27.9367 12.421 27.5711 12.5339 27.2359C11.0509 26.657 10 25.1742 10 23.4375C10 21.8176 10.9183 20.416 12.2491 19.766C11.8219 19.2125 11.5714 18.5117 11.5714 17.75C11.5714 16.191 12.6321 14.891 14.0464 14.5711C13.9679 14.2918 13.9286 13.9922 13.9286 13.6875C13.9286 12.1691 14.9402 10.8895 16.3004 10.534C16.4478 9.11211 17.6165 8 19.0357 8Z"
              fill="#888B94"
            />
          </svg>
        )}
      </button>

      <button
        onClick={() => {
          chrome.runtime.sendMessage({ type: "batchImportAll" });
        }}
        className={`${hover && "opacity-100"} p-2 rounded-l-2xl transition bg-slate-700 border border-white/20 opacity-0 size-4 h-[30vh] absolute flex bottom-6 items-center`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="#888B94"
          className="size-4"
          width={24}
          height={24}
        >
          <path
            fillRule="evenodd"
            d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 0 0 1.075.676L10 15.082l5.925 2.844A.75.75 0 0 0 17 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 2Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {(window.location.href === "https://twitter.com" ||
        window.location.href === "https://x.com") &&
        (isTwitterBookmarksEnabled ? (
          <button
            className={`${hover && "opacity-100"} p-2 rounded-l-2xl transition bg-slate-700 border border-white/20 opacity-0 size-4 h-[30vh] absolute flex bottom-6 items-center`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="#888B94"
              className="size-4"
              width={24}
              height={24}
            >
              <path
                fillRule="evenodd"
                d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 0 0 1.075.676L10 15.082l5.925 2.844A.75.75 0 0 0 17 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 2Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                chrome.runtime.sendMessage({ type: "batchImportAll" });
              }}
              className={`${hover && "opacity-100"} p-2 rounded-l-2xl transition bg-slate-700 border border-white/20 opacity-0 size-4 h-[30vh] absolute flex bottom-6 items-center`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#888B94"
                className="size-4"
                width={24}
                height={24}
              >
                <path
                  fillRule="evenodd"
                  d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 0 0 1.075.676L10 15.082l5.925 2.844A.75.75 0 0 0 17 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 2Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </>
        ))}
    </div>
  );
}
