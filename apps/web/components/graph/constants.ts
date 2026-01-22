export const colors = {
	background: {
		primary: "#000B1B",
		secondary: "#01173C",
		accent: "#0A2351",
	},
	// All nodes are now hexagons with cyan color
	node: {
		primary: "rgba(0, 180, 216, 0.25)",
		secondary: "rgba(0, 180, 216, 0.35)",
		accent: "rgba(0, 180, 216, 0.45)",
		border: "rgba(0, 180, 216, 0.7)",
		glow: "rgba(0, 180, 216, 0.5)",
	},
	// Legacy document colors (for compatibility)
	document: {
		primary: "rgba(0, 180, 216, 0.25)",
		secondary: "rgba(0, 180, 216, 0.35)",
		accent: "rgba(0, 180, 216, 0.45)",
		border: "rgba(0, 180, 216, 0.7)",
		glow: "rgba(0, 180, 216, 0.5)",
	},
	// Legacy memory colors (for compatibility)
	memory: {
		primary: "rgba(0, 180, 216, 0.25)",
		secondary: "rgba(0, 180, 216, 0.35)",
		accent: "rgba(0, 180, 216, 0.45)",
		border: "rgba(0, 180, 216, 0.7)",
		glow: "rgba(0, 180, 216, 0.5)",
	},
	connection: {
		weak: "rgba(0, 180, 216, 0.3)",
		memory: "rgba(0, 180, 216, 0.4)",
		medium: "rgba(0, 180, 216, 0.6)",
		strong: "rgba(0, 180, 216, 0.9)",
		// Pink/magenta for special relationships
		relation: "rgba(236, 72, 153, 0.6)",
	},
	text: {
		primary: "#ffffff",
		secondary: "#e2e8f0",
		muted: "#525D6E",
	},
	accent: {
		primary: "rgba(0, 180, 216, 0.7)",
		secondary: "rgba(34, 97, 202, 0.6)",
		glow: "rgba(0, 180, 216, 0.6)",
		amber: "rgba(251, 165, 36, 0.8)",
		emerald: "rgba(16, 185, 129, 0.4)",
	},
	status: {
		forgotten: "rgba(220, 38, 38, 0.15)",
		expiring: "rgba(251, 165, 36, 0.8)",
		new: "rgba(16, 185, 129, 0.4)",
	},
	relations: {
		updates: "rgba(236, 72, 153, 0.5)",
		extends: "rgba(16, 185, 129, 0.5)",
		derives: "rgba(0, 180, 216, 0.5)",
	},
}

export const GRAPH_SETTINGS = {
	initialZoom: 0.8,
	initialPanX: 0,
	initialPanY: 0,
}

export const ANIMATION = {
	dimDuration: 1500,
}

export const NODE_SIZES = {
	document: 58,
	memory: 40,
}

export const COORDINATE_SCALE = 15
export const MEMORY_ORBIT_RADIUS = 80
