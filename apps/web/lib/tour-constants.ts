// Tour step IDs - these should match the IDs added to elements in your app
export const TOUR_STEP_IDS = {
	LOGO: "tour-logo",
	MENU_BUTTON: "tour-menu-button",
	VIEW_TOGGLE: "tour-view-toggle",
	MEMORY_GRAPH: "tour-memory-graph",
	MEMORY_LIST: "tour-memory-list",
	FLOATING_CHAT: "tour-floating-chat",
	ADD_MEMORY: "tour-add-memory",
	SPACES_DROPDOWN: "tour-spaces-dropdown",
	SETTINGS: "tour-settings",
	MENU_CONNECTIONS: "tour-connections",
	// Menu items
	MENU_ADD_MEMORY: "tour-menu-add-memory",
	MENU_PROJECTS: "tour-menu-projects",
	MENU_MCP: "tour-menu-mcp",
	MENU_BILLING: "tour-menu-billing",
	// Legend
	LEGEND: "tour-legend",
} as const

// Tour storage key for localStorage
export const TOUR_STORAGE_KEY = "supermemory-tour-completed"
