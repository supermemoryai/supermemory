chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    if (request.type === "getJwt") {
      chrome.storage.local.get(["jwt"], ({ jwt }) => {
        sendResponse({ jwt });
      });
  
      return true;
    }
  });