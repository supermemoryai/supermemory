import { useEffect, useState, useRef } from "react";
import { Readability } from "@mozilla/readability";

const DEBUG = true;

const log = (message: string, ...args: any[]) => {
  if (DEBUG) {
    console.log("[content]", message, ...args);
  }
};

export default function SupermemoryContent({
  onClose: originalOnClose,
}: {
  onClose: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [showSaving, setShowSaving] = useState(true);
  const abortControllerRef = useRef(new AbortController());
  const [toastMessage, setToastMessage] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const isAbortedRef = useRef(false);
  const [isImportingBookmarks, setIsImportingBookmarks] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [closeTimer, setCloseTimer] = useState(0);
  const closeTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [importStatus, setImportStatus] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [importComplete, setImportComplete] = useState(false);

  useEffect(() => {
    const isTwitter = window.location.hostname.match(/^(twitter\.com|x\.com)$/);
    if (isTwitter) {
      chrome.storage.local.get(["attemptingImportCurrently"], (result) => {
        if (result.attemptingImportCurrently) {
          setIsImportingBookmarks(true);
          setShowSaving(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    const messageHandler = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      if (message.type === "IMPORT_PROGRESS_UPDATE") {
        setImportProgress(message.payload.progress);
        setShowSaving(true);

        switch (message.payload.status) {
          case 429:
            setImportStatus({
              status: 429,
              message: "Rate limited by Twitter. Waiting to retry...",
            });
            break;
          case 409:
            setImportStatus({
              status: 409,
              message: "Some tweets were already saved",
            });
            break;
          case 500:
            setImportStatus({
              status: 500,
              message: "Error importing some tweets",
            });
            break;
          case 102:
            setImportStatus({
              status: 102,
              message: "Processing tweets...",
            });
            break;
          default:
            setImportStatus(null);
        }
      } else if (message.type === "IMPORT_COMPLETE") {
        console.log("IMPORT_COMPLETE called");
        setImportComplete(true);
        setImportStatus(null);
        setToastMessage({
          success: true,
          message: "Bookmarks imported successfully",
        });

        // Send message to all supermemory.ai tabs
        chrome.tabs.query({ url: "*://*.supermemory.ai/*" }, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: "TWITTER_IMPORT_COMPLETE",
              });
            }
          });
        });

        // Start close timer after 2 seconds of showing success
        setTimeout(() => {
          if (!isImportingBookmarks) {
            startCloseTimer();
          }
        }, 1000);
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);
    return () => chrome.runtime.onMessage.removeListener(messageHandler);
  }, [isImportingBookmarks]);

  // Clear toast message after delay
  useEffect(() => {
    if (toastMessage && !importComplete) {
      const timer = setTimeout(() => {
        if (!isAbortedRef.current) {
          setToastMessage(null);
        }
      }, 3000); // Show toast for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [toastMessage, importComplete]);

  const startCloseTimer = () => {
    if (closeTimerRef.current) {
      clearInterval(closeTimerRef.current);
    }
    setCloseTimer(0);

    let count = 0;
    closeTimerRef.current = setInterval(() => {
      if (!isAbortedRef.current) {
        count += 10;
        setCloseTimer(count);

        if (count >= 100) {
          if (closeTimerRef.current) {
            clearInterval(closeTimerRef.current);
          }
          handleClose();
        }
      }
    }, 200); // 20 steps of 10% over 2 seconds
  };

  const pauseCloseTimer = () => {
    if (closeTimerRef.current) {
      clearInterval(closeTimerRef.current);
    }
  };

  const savePage = async () => {
    if (isAbortedRef.current) return;

    const documentClone = document.cloneNode(true) as Document;
    const mainContent = new Readability(documentClone).parse();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_PAGE",
        payload: {
          description: mainContent?.excerpt,
          url: window.location.href,
          prefetched: {
            contentToVectorize: mainContent?.textContent,
            contentToSave: mainContent?.content,
            title: mainContent?.title,
            type: "page",
          },
        },
      });

      if (!isAbortedRef.current) {
        if (response.success) {
          setToastMessage({
            success: true,
            message: "Page saved successfully",
          });
          // Wait for toast to show before starting close timer
          setTimeout(() => {
            if (!isAbortedRef.current) {
              startCloseTimer();
            }
          }, 1000);
        } else {
          setToastMessage({
            success: false,
            message:
              response.status === 409
                ? "Content already exists"
                : "Failed to save page",
          });
        }
      }

      return response;
    } catch (error) {
      console.error("Error saving page:", error);
      setToastMessage({ success: false, message: "Failed to save page" });
    }
  };

  const handleClose = () => {
    isAbortedRef.current = true;
    abortControllerRef.current.abort();
    if (closeTimerRef.current) {
      clearInterval(closeTimerRef.current);
    }
    setProgress(0);
    setShowSaving(false);
    originalOnClose();
  };

  useEffect(() => {
    if (!showSaving || isImportingBookmarks) return;
    savePage();
  }, [showSaving]);

  if (!showSaving) return null;

  return (
    <>
      <div
        className="fixed right-4 top-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl text-white shadow-lg"
        style={{
          width: "400px",
          maxWidth: "calc(100vw - 40px)",
        }}
      >
        <link
          rel="stylesheet"
          href={`${chrome.runtime.getURL("globals.css")}`}
        />
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-gray-100">
                {isImportingBookmarks
                  ? importComplete
                    ? "Twitter Bookmarks Imported!"
                    : "Importing Twitter Bookmarks"
                  : "Saved to Supermemory"}
              </span>
              {toastMessage && (
                <span className="text-xs text-gray-200">
                  {toastMessage.message}
                </span>
              )}
              {importStatus && (
                <span className="text-xs text-gray-200">
                  {importStatus.message}
                </span>
              )}
              {isImportingBookmarks && !importComplete && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span className="text-2xl font-bold text-white">
                    {importProgress}
                  </span>
                  <span className="text-xs text-gray-300 mt-1">
                    tweets processed
                  </span>
                </div>
              )}
              {importComplete && (
                <span className="text-lg font-semibold text-green-400">
                  Successfully imported {importProgress} tweets
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className={`text-xs font-medium px-2.5 py-1.5 ${
                importComplete
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-white/10 hover:bg-white/20"
              } text-white/90 hover:text-white rounded-md transition-all duration-150 flex items-center gap-1`}
            >
              {importComplete ? (
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M15 9L9 15M9 9L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {importComplete
                ? "Done"
                : isImportingBookmarks
                  ? "Close"
                  : "Cancel"}
            </button>
          </div>
        </div>

        {!isImportingBookmarks && (progress > 0 || closeTimer > 0) && (
          <div className="w-full h-1 bg-gray-700 rounded-b-xl overflow-hidden">
            <div
              className={`h-full transition-all duration-200 rounded-b-xl ${
                importStatus?.status === 429
                  ? "bg-yellow-500"
                  : importStatus?.status === 500
                    ? "bg-red-500"
                    : importComplete
                      ? "bg-green-500"
                      : "bg-blue-500"
              }`}
              style={{
                width: `${isImportingBookmarks ? importProgress : closeTimer}%`,
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
