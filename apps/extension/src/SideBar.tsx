import { useState } from "react";

import "./ext.css";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";

function sendUrlToAPI() {
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
    chrome.runtime.sendMessage({ type: "urlChange", content, url });
  }
}

function SideBar() {
  const [savedWebsites, setSavedWebsites] = useState<string[]>([]);

  const [isSendingData, setIsSendingData] = useState(false);

  return (
    <>
      <TooltipProvider>
        <div className="anycontext-flex anycontext-flex-col anycontext-gap-2 anycontext-fixed anycontext-bottom-12 anycontext-right-0 anycontext-z-[99999] anycontext-font-sans">
          {/* <Tooltip delayDuration={300}>
            <TooltipContent side="left">
              <p>Open Sidebar</p>
            </TooltipContent>
          </Tooltip> */}

          <Tooltip delayDuration={300}>
            <TooltipTrigger
              className="anycontext-bg-transparent
              anycontext-border-none anycontext-m-0 anycontext-p-0
            "
            >
              <button
                onClick={() => {
                  sendUrlToAPI();
                  setIsSendingData(true);
                  setTimeout(() => {
                    setIsSendingData(false);
                    setSavedWebsites([...savedWebsites, window.location.href]);
                  }, 1000);
                }}
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
            </TooltipTrigger>
            <TooltipContent className="anycontext-p-0" side="left">
              <p className="anycontext-p-0 anycontext-m-0">
                {savedWebsites.includes(window.location.href)
                  ? "Added to memory"
                  : "Add to memory"}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </>
  );
}

export default SideBar;
