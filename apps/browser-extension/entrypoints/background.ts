export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'save-to-supermemory',
      title: 'Save to Supermemory',
      contexts: ['selection', 'page', 'link'],
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'save-to-supermemory') {
      if (tab?.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            action: 'saveMemory',
          });
        } catch (error) {
          console.error('Failed to send message to content script:', error);
          console.log('Content script may not be injected on this page');
        }
      }
    }
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'saveMemory') {
      (async () => {
        try {
          const result = await browser.storage.local.get(['bearerToken']);
          const bearerToken = result.bearerToken;
          //const backendURL = 'http://localhost:8787';
          const backendURL = 'https://api.supermemory.ai';

          if (!bearerToken) {
            console.error('No bearer token found');
            sendResponse({ success: false, error: 'No authentication token found' });
            return;
          }

          const response = await fetch(`${backendURL}/v3/memories`, {
            method: 'POST',
            credentials: 'omit',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${bearerToken}`,
            },
            body: JSON.stringify({
              containerTags: ['sm_project_default'],
              content:
                message.data?.highlightedText +
                '\n\n' +
                message.data.html +
                '\n\n' +
                message.data?.url,
              metadata: { sm_source: 'consumer' },
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error('API call failed:', response.status, errorData);
            sendResponse({
              success: false,
              error: `API call failed: ${response.status}`,
            });
            return;
          }

          const data = await response.json();
          console.log('Memory saved successfully:', data);
          sendResponse({ success: true, data });
        } catch (error) {
          console.error('Error saving memory:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();
      
      return true;
    }
  });
});
