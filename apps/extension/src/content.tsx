window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }
  const { jwt } = event.data;
  if (jwt) {
    chrome.storage.local.set({ jwt }, () => {
      console.log("JWT saved to local storage", jwt);
    });
  } else if (jwt === undefined) {
    chrome.storage.local.remove("jwt", () => {
      console.log("JWT removed from local storage");
    }
    )
  }
});