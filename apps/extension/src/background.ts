chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.type === "getJwt") {
    chrome.storage.local.get(["jwt"], ({ jwt }) => {
      sendResponse({ jwt });
    });

    return true;
  }

  else if (request.type === "urlChange") {
    const content = request.content;
    const url = request.url;
    console.log(content);

    (async () => {
      chrome.storage.local.get(["jwt"], ({ jwt }) => {
        if (!jwt) {
          console.error("No JWT found");
          return;
        }
        fetch("http://localhost:3000/api/store", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${jwt}`,
          },
          body: JSON.stringify({ pageContent: content, url }),
        }).then(ers => console.log(ers.status))
      });
    })();
  }
});
