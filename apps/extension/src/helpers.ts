// Define message types
export type MessageType =
  | {
      type: "SAVE_PAGE";
      payload: {
        html: string;
        url: string;
        spaces: string[];
        description: string;
        prefetched: {
          contentToVectorize: string;
          contentToSave: string;
          title: string;
          type: string;
        };
      };
    }
  | { type: "GET_SPACES"; payload: undefined }
  | { type: "EXPORT_TWITTER_BOOKMARKS"; payload: undefined }
  | { type: "ACTIVATE_CONTENT"; payload: undefined }
  | { type: "SYNC_CHROME_BOOKMARKS"; payload: undefined }
  | { type: "IMPORT_CHROME_BOOKMARKS"; payload: undefined };

// Add more message types as needed

// Type for message handlers
export type MessageHandler<T extends MessageType> = (
  message: T,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => void | Promise<void>;

// Message handlers registry
export const messageHandlers = new Map<
  MessageType["type"],
  MessageHandler<MessageType>
>();

// Register message handlers
export function registerMessageHandler<T extends MessageType>(
  type: T["type"],
  handler: MessageHandler<T>
) {
  messageHandlers.set(type, handler as MessageHandler<MessageType>);
}
// Main message listener
export const messageListener = (
  message: MessageType,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  const handler = messageHandlers.get(message.type);
  if (handler) {
    const result = handler(message, sender, sendResponse);
    if (result instanceof Promise) {
      result.catch(console.error);
      return true; // Keep message channel open for async response
    }
  } else {
    console.warn(`No handler registered for message type: ${message.type}`);
  }
  return false;
};

chrome.runtime.onMessage.addListener(messageListener);
