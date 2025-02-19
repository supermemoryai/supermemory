const handleWindowMessage = (event: MessageEvent) => {
  if (event.data.action === "exportBookmarks") {
    console.log("Received exportBookmarks message via postMessage");
    chrome.runtime.sendMessage({ action: "exportBookmarks" });
  }
};

  window.addEventListener("message", handleWindowMessage);

