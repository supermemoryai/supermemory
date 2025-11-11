/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
	SUPERMEMORY_API: import.meta.env.PROD
		? "https://api.supermemory.ai"
		: "http://localhost:8787",
	SUPERMEMORY_WEB: import.meta.env.PROD
		? "https://app.supermemory.ai"
		: "http://localhost:3000",
} as const

/**
 * DOM Element IDs
 */
export const ELEMENT_IDS = {
	TWITTER_IMPORT_BUTTON: "sm-twitter-import-button",
	SUPERMEMORY_TOAST: "sm-toast",
	SUPERMEMORY_SAVE_BUTTON: "sm-save-button",
	SAVE_TWEET_ELEMENT: "sm-save-tweet-element",
	CHATGPT_INPUT_BAR_ELEMENT: "sm-chatgpt-input-bar-element",
	CLAUDE_INPUT_BAR_ELEMENT: "sm-claude-input-bar-element",
	T3_INPUT_BAR_ELEMENT: "sm-t3-input-bar-element",
	PROJECT_SELECTION_MODAL: "sm-project-selection-modal",
} as const

/**
 * UI Configuration
 */
export const UI_CONFIG = {
	BUTTON_SHOW_DELAY: 2000, // milliseconds
	TOAST_DURATION: 3000, // milliseconds
	RATE_LIMIT_BASE_WAIT: 60000, // 1 minute
	PAGINATION_DELAY: 1000, // 1 second between requests
	AUTO_SEARCH_DEBOUNCE_DELAY: 1500, // milliseconds to wait after user stops typing
	OBSERVER_THROTTLE_DELAY: 300, // milliseconds between observer callback executions
	ROUTE_CHECK_INTERVAL: 2000, // milliseconds between route change checks
	API_REQUEST_TIMEOUT: 10000, // milliseconds for API request timeout
} as const

/**
 * Supported Domains
 */
export const DOMAINS = {
	TWITTER: ["x.com", "twitter.com"],
	CHATGPT: ["chatgpt.com", "chat.openai.com"],
	CLAUDE: ["claude.ai"],
	T3: ["t3.chat"],
	SUPERMEMORY: ["localhost", "supermemory.ai", "app.supermemory.ai"],
} as const

/**
 * Container Tags
 */
export const CONTAINER_TAGS = {
	TWITTER_BOOKMARKS: "sm_project_twitter_bookmarks",
	DEFAULT_PROJECT: "sm_project_default",
} as const

/**
 * Message Types for extension communication
 */
export const MESSAGE_TYPES = {
	SAVE_MEMORY: "sm-save-memory",
	SHOW_TOAST: "sm-show-toast",
	BATCH_IMPORT_ALL: "sm-batch-import-all",
	IMPORT_UPDATE: "sm-import-update",
	IMPORT_DONE: "sm-import-done",
	GET_RELATED_MEMORIES: "sm-get-related-memories",
	CAPTURE_PROMPT: "sm-capture-prompt",
	FETCH_PROJECTS: "sm-fetch-projects",
} as const

export const CONTEXT_MENU_IDS = {
	SAVE_TO_SUPERMEMORY: "sm-save-to-supermemory",
} as const

export const POSTHOG_EVENT_KEY = {
	TWITTER_IMPORT_STARTED: "twitter_import_started",
	SAVE_MEMORY_ATTEMPTED: "save_memory_attempted",
	SAVE_MEMORY_ATTEMPT_FAILED: "save_memory_attempt_failed",
	SOURCE: "extension",
	T3_CHAT_MEMORIES_SEARCHED: "t3_chat_memories_searched",
	T3_CHAT_MEMORIES_AUTO_SEARCHED: "t3_chat_memories_auto_searched",
	CLAUDE_CHAT_MEMORIES_SEARCHED: "claude_chat_memories_searched",
	CLAUDE_CHAT_MEMORIES_AUTO_SEARCHED: "claude_chat_memories_auto_searched",
	CHATGPT_CHAT_MEMORIES_SEARCHED: "chatgpt_chat_memories_searched",
	CHATGPT_CHAT_MEMORIES_AUTO_SEARCHED: "chatgpt_chat_memories_auto_searched",
} as const
