export const colors = {
	background: {
		primary: "#0f1419",
		secondary: "#1a1f29",
		accent: "#252a35",
	},
	hexagon: {
		active: { fill: "#0D2034", stroke: "#3B73B8", strokeWidth: 1.68 },
		inactive: { fill: "#0B1826", stroke: "#3D4857", strokeWidth: 1.4 },
		hovered: { fill: "#112840", stroke: "#4A8AD0", strokeWidth: 2 },
	},
	document: {
		outer: { fill: "#1B1F24", stroke: "#2A2F36", radius: 8 },
		inner: { fill: "#13161A", radius: 6 },
		iconColor: "#3B73B8",
	},
	text: {
		primary: "#ffffff",
		secondary: "#e2e8f0",
		muted: "#94a3b8",
	},
}

export const MEMORY_BORDER = {
	forgotten: "#EF4444",
	expiring: "#F59E0B",
	recent: "#10B981",
	default: "#3B73B8",
} as const

export const EDGE_COLORS = {
	docMemory: "#4A5568",
	similarityStrong: "#00D4B8",
	similarityMedium: "#6B8FBF",
	similarityWeak: "#4A6A8A",
	version: "#8B5CF6",
} as const

export const FORCE_CONFIG = {
	linkStrength: {
		docMemory: 0.8,
		version: 1.0,
		docDocBase: 0.3,
	},
	linkDistance: 300,
	docMemoryDistance: 150,
	chargeStrength: -1000,
	collisionRadius: { document: 80, memory: 40 },
	alphaDecay: 0.03,
	alphaMin: 0.001,
	velocityDecay: 0.6,
	alphaTarget: 0.3,
}

export const GRAPH_SETTINGS = {
	console: { initialZoom: 0.8, initialPanX: 0, initialPanY: 0 },
	consumer: { initialZoom: 0.5, initialPanX: 400, initialPanY: 300 },
}

export const ANIMATION = {
	dimDuration: 1500,
}
