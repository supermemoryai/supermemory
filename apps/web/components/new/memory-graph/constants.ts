// Enhanced color palette matching Figma design
export const colors = {
	background: {
		primary: "#0f1419", // Deep dark blue-gray
		secondary: "#1a1f29", // Slightly lighter
		accent: "#252a35", // Card backgrounds
	},
	// Hexagon node colors (Figma design)
	hexagon: {
		// Active/highlighted/selected state
		active: {
			fill: "#0D2034", // Background fill
			stroke: "#3B73B8", // Border color
			strokeWidth: 1.68,
		},
		// Inactive/dimmed state
		inactive: {
			fill: "#0B1826", // Background fill
			stroke: "#3D4857", // Border color
			strokeWidth: 1.4,
		},
		// Hovered state
		hovered: {
			fill: "#112840", // Slightly brighter
			stroke: "#4A8AD0", // Brighter border
			strokeWidth: 2,
		},
	},
	// Node sizes in pixels (flat-to-flat diameter)
	hexagonSizes: {
		large: 33.57,
		medium: 27.18,
		small: 23.98,
		tiny: 20,
	},
	document: {
		primary: "rgba(255, 255, 255, 0.21)", // Subtle glass white
		secondary: "rgba(255, 255, 255, 0.31)", // More visible
		accent: "rgba(255, 255, 255, 0.31)", // Hover state
		border: "rgba(255, 255, 255, 0.6)", // Sharp borders
		glow: "rgba(147, 197, 253, 0.4)", // Blue glow for interaction
	},
	memory: {
		primary: "rgba(147, 196, 253, 0.21)", // Subtle glass blue
		secondary: "rgba(147, 196, 253, 0.31)", // More visible
		accent: "rgba(147, 197, 253, 0.31)", // Hover state
		border: "rgba(147, 196, 253, 0.6)", // Sharp borders
		glow: "rgba(147, 197, 253, 0.5)", // Blue glow for interaction
	},
	// Edge/connection colors (Figma design)
	connection: {
		teal: "#00BFAC", // Teal connections
		blueGray: "#5070A1", // Blue-gray connections
		blue: "#0054D1", // Blue connections
		purple: "#7800AB", // Purple connections
		// Legacy/fallback
		weak: "rgba(35, 189, 255, 0.3)",
		memory: "rgba(148, 163, 184, 0.35)",
		medium: "rgba(35, 189, 255, 0.6)",
		strong: "rgba(35, 189, 255, 0.9)",
	},
	text: {
		primary: "#ffffff", // Pure white
		secondary: "#e2e8f0", // Light gray
		muted: "#94a3b8", // Medium gray
	},
	accent: {
		primary: "rgba(59, 130, 246, 0.7)", // Clean blue
		secondary: "rgba(99, 102, 241, 0.6)", // Clean purple
		glow: "rgba(147, 197, 253, 0.6)", // Subtle glow
		amber: "rgba(251, 165, 36, 0.8)", // Amber for expiring
		emerald: "rgba(16, 185, 129, 0.4)", // Emerald for new
	},
	status: {
		forgotten: "rgba(220, 38, 38, 0.15)", // Red for forgotten
		expiring: "rgba(251, 165, 36, 0.8)", // Amber for expiring soon
		new: "rgba(16, 185, 129, 0.4)", // Emerald for new memories
	},
	relations: {
		updates: "rgba(147, 77, 253, 0.5)", // purple
		extends: "rgba(16, 185, 129, 0.5)", // green
		derives: "rgba(147, 197, 253, 0.5)", // blue
	},
}

// Edge color palette for similarity-based coloring
export const EDGE_COLORS = [
	colors.connection.teal,
	colors.connection.blueGray,
	colors.connection.blue,
	colors.connection.purple,
] as const

export const LAYOUT_CONSTANTS = {
	centerX: 400,
	centerY: 300,
	clusterRadius: 300, // Memory "bubble" size around a doc - smaller bubble
	spaceSpacing: 1600, // How far apart the *spaces* (groups of docs) sit - push spaces way out
	documentSpacing: 1000, // How far the first doc in a space sits from its space-centre - push docs way out
	minDocDist: 900, // Minimum distance two documents in the **same space** are allowed to be - sets repulsion radius
	memoryClusterRadius: 300,
}

// Similarity calculation configuration
export const SIMILARITY_CONFIG = {
	threshold: 0.725, // Minimum similarity (72.5%) to create edge
	maxComparisonsPerDoc: 10, // k-NN: each doc compares with 10 neighbors (optimized for performance)
}

// D3-Force simulation configuration
export const FORCE_CONFIG = {
	// Link force (spring between connected nodes)
	linkStrength: {
		docMemory: 0.8, // Strong for doc-memory connections
		version: 1.0, // Strongest for version chains
		docDocBase: 0.3, // Base for doc-doc similarity
	},
	linkDistance: 300, // Desired spring length

	// Charge force (repulsion between nodes)
	chargeStrength: -1000, // Negative = repulsion, higher magnitude = stronger push

	// Collision force (prevents node overlap)
	collisionRadius: {
		document: 80, // Collision radius for document nodes
		memory: 40, // Collision radius for memory nodes
	},

	// Simulation behavior
	alphaDecay: 0.03, // How fast simulation cools down (higher = faster cooldown)
	alphaMin: 0.001, // Threshold to stop simulation (when alpha drops below this)
	velocityDecay: 0.6, // Friction/damping (0 = no friction, 1 = instant stop) - increased for less movement
	alphaTarget: 0.3, // Target alpha when reheating (on drag start)
}

// Graph view settings
export const GRAPH_SETTINGS = {
	console: {
		initialZoom: 0.8, // Higher zoom for console - better overview
		initialPanX: 0,
		initialPanY: 0,
	},
	consumer: {
		initialZoom: 0.5, // Changed from 0.1 to 0.5 for better initial visibility
		initialPanX: 400, // Pan towards center to compensate for larger layout
		initialPanY: 300, // Pan towards center to compensate for larger layout
	},
}

// Animation settings
export const ANIMATION = {
	// Dim effect duration - shortened for better UX
	dimDuration: 1500, // milliseconds
}
