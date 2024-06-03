chrome.runtime.onInstalled.addListener(function () {
    let context = 'selection';
    let title = "Supermemory - Save Highlight";
    chrome.contextMenus.create({
      title: title,
      contexts: ['selection'],
      id: context,
    });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'selection') {
      console.log(info.pageUrl)
      chrome.tabs.sendMessage(tab?.id || 1, info.selectionText);
      console.log(info.selectionText)

      // you can add a link to a cf worker or whatever u want
      // fetch("", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     data: info.selectionText,
      //   }),
      // });
  }
});
