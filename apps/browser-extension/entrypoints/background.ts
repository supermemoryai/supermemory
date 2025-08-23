import { TwitterImporter, type TwitterImportConfig } from '../utils/twitter-import';
import { captureTwitterTokens } from '../utils/twitter-auth';
import { CONTEXT_MENU_IDS, MESSAGE_TYPES, CONTAINER_TAGS } from '../utils/constants';
import type { ExtensionMessage, MemoryPayload } from '../utils/types';
import { getDefaultProject, saveMemory, searchMemories } from '../utils/api';

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
      let containerTag: string = CONTAINER_TAGS.DEFAULT_PROJECT;
      try {
        const defaultProject = await getDefaultProject();
        if (defaultProject?.containerTag) {
          containerTag = defaultProject.containerTag;
        }
      } catch (error) {
        console.warn('Failed to get default project, using fallback:', error);
      }

      const payload: MemoryPayload = {
        containerTags: [containerTag],
        content: data.highlightedText + '\n\n' + data.html + '\n\n' + data?.url,
        metadata: { sm_source: 'consumer' },
      };

      const responseData = await saveMemory(payload);
      return { success: true, data: responseData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const getRelatedMemories = async (data: any): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const responseData = await searchMemories(data);
      const content = responseData.results[0].chunks[0].content;
      console.log('Content:', content);
      return { success: true, data: content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

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

    if (message.action === MESSAGE_TYPES.GET_RELATED_MEMORIES) {
      (async () => {
        try {
          const result = await getRelatedMemories(message.data);
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