import { TwitterImporter, type TwitterImportConfig } from '../utils/twitter-import';
import { captureTwitterTokens } from '../utils/twitter-auth';
import { CONTEXT_MENU_IDS, MESSAGE_TYPES, API_ENDPOINTS, CONTAINER_TAGS } from '../utils/constants';
import type { ExtensionMessage, MemoryPayload } from '../utils/types';

export default defineBackground(() => {
  let twitterImporter: TwitterImporter | null = null;

  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: CONTEXT_MENU_IDS.SAVE_TO_SUPERMEMORY,
      title: 'Save to Supermemory',
      contexts: ['selection', 'page', 'link'],
    });
  });


  // Intercept Twitter requests to capture authentication headers.
  browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      captureTwitterTokens(details);
      return {};
    },
    { urls: ['*://x.com/*', '*://twitter.com/*'] },
    ['requestHeaders', 'extraHeaders']
  );

  // Handle context menu clicks.
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_IDS.SAVE_TO_SUPERMEMORY) {
      if (tab?.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            action: MESSAGE_TYPES.SAVE_MEMORY,
          });
        } catch (error) {
          console.error('Failed to send message to content script:', error);
        }
      }
    }
  });

  // Send message to current active tab.
  const sendMessageToCurrentTab = async (message: string) => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: MESSAGE_TYPES.IMPORT_UPDATE,
        importedMessage: message,
      });
    }
  };

  /**
   * Send import completion message
   */
  const sendImportDoneMessage = async (totalImported: number) => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: MESSAGE_TYPES.IMPORT_DONE,
        totalImported,
      });
    }
  };

  /**
   * Save memory to Supermemory API
   */
  const saveMemoryToSupermemory = async (data: any): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const result = await browser.storage.local.get(['bearerToken']);
      const bearerToken = result.bearerToken;

      if (!bearerToken) {
        return { success: false, error: 'No authentication token found' };
      }

      const payload: MemoryPayload = {
        containerTags: [CONTAINER_TAGS.DEFAULT_PROJECT],
        content: data.highlightedText + '\n\n' + data.html + '\n\n' + data?.url,
        metadata: { sm_source: 'consumer' },
      };

      const response = await fetch(`${API_ENDPOINTS.SUPERMEMORY_API}/v3/memories`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return { success: false, error: `API call failed: ${response.status}` };
      }

      const responseData = await response.json();
      return { success: true, data: responseData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  /**
   * Handle extension messages
   */
  browser.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    // Handle Twitter import request
    if (message.type === MESSAGE_TYPES.BATCH_IMPORT_ALL) {
      const importConfig: TwitterImportConfig = {
        onProgress: sendMessageToCurrentTab,
        onComplete: sendImportDoneMessage,
        onError: async (error: Error) => {
          await sendMessageToCurrentTab(`Error: ${error.message}`);
        },
      };

      twitterImporter = new TwitterImporter(importConfig);
      twitterImporter.startImport().catch(console.error);
      sendResponse({ success: true });
      return true;
    }

    // Handle regular memory save request
    if (message.action === MESSAGE_TYPES.SAVE_MEMORY) {
      (async () => {
        try {
          const result = await saveMemoryToSupermemory(message.data);
          sendResponse(result);
        } catch (error) {
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