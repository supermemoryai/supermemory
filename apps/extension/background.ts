chrome.runtime.onInstalled.addListener(function () {
  let context = 'selection';
  let title = "Supermemory - Save Selection";
  chrome.contextMenus.create({
    title: title,
    contexts: ['selection'],
    id: context,
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'selection') {
      chrome.tabs.sendMessage(tab?.id || 1, info.selectionText);
  }
  });