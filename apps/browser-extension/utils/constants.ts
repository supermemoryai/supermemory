/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  SUPERMEMORY_API: import.meta.env.PROD ? 'https://api.supermemory.ai' : 'http://localhost:8787',
  SUPERMEMORY_WEB: import.meta.env.PROD ? 'https://app.supermemory.ai' : 'http://localhost:3000',
} as const;

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  BEARER_TOKEN: 'bearerToken',
  TWITTER_AUTH: 'twitterAuth',
  TOKENS_LOGGED: 'tokens_logged',
  TWITTER_COOKIE: 'cookie',
  TWITTER_CSRF: 'csrf',
  TWITTER_AUTH_TOKEN: 'auth',
} as const;

/**
 * DOM Element IDs
 */
export const ELEMENT_IDS = {
  TWITTER_IMPORT_BUTTON: 'supermemory-twitter-import-button',
  TWITTER_IMPORT_STATUS: 'twitter-import-status',
  TWITTER_CLOSE_BTN: 'twitter-close-btn',
  TWITTER_IMPORT_BTN: 'twitter-import-button',
  TWITTER_SIGNIN_BTN: 'twitter-signin-btn',
  SUPERMEMORY_TOAST: 'supermemory-toast',
  SUPERMEMORY_SAVE_BUTTON: 'supermemory-save-button',
  SAVE_TWEET_ELEMENT: 'supermemory-save-tweet-element',
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  BUTTON_SHOW_DELAY: 2000, // milliseconds
  TOAST_DURATION: 3000, // milliseconds
  RATE_LIMIT_BASE_WAIT: 60000, // 1 minute
  PAGINATION_DELAY: 1000, // 1 second between requests
} as const;

/**
 * Supported Domains
 */
export const DOMAINS = {
  TWITTER: ['x.com', 'twitter.com'],
  CHATGPT: ['chatgpt.com', 'chat.openai.com'],
  SUPERMEMORY: ['localhost', 'supermemory.ai', 'app.supermemory.ai'],
} as const;

/**
 * Container Tags
 */
export const CONTAINER_TAGS = {
  TWITTER_BOOKMARKS: 'sm_project_twitter_bookmarks',
  DEFAULT_PROJECT: 'sm_project_default',
} as const;

/**
 * Message Types for extension communication
 */
export const MESSAGE_TYPES = {
  SAVE_MEMORY: 'saveMemory',
  SHOW_TOAST: 'showToast',
  BATCH_IMPORT_ALL: 'batchImportAll',
  IMPORT_UPDATE: 'import-update',
  IMPORT_DONE: 'import-done',
} as const;

export const CONTEXT_MENU_IDS = {
  SAVE_TO_SUPERMEMORY: 'save-to-supermemory',
} as const;

export const CSS_CLASSES = {
  TOAST_STYLES_ID: 'supermemory-toast-styles',
  SPINNER_STYLES_ID: 'supermemory-spinner-styles',
} as const;