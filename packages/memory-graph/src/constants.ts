// Enhanced glass-morphism color palette
export const colors = {
	background: {
		primary: "#0f1419", // Deep dark blue-gray
		secondary: "#1a1f29", // Slightly lighter
		accent: "#252a35", // Card backgrounds
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
	connection: {
		weak: "rgba(79, 255, 226, 0.3)", // subtle
		memory: "rgba(148, 163, 184, 0.35)", // Very subtle
		medium: "rgba(79, 255, 226, 0.6)", // Medium visibility
		strong: "rgba(79, 255, 226, 0.9)", // Strong connection
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
	maxComparisonsPerDoc: 10, // k-NN: each doc compares with 15 neighbors (balanced performance)
}

// D3-Force simulation configuration
export const FORCE_CONFIG = {
	// Link force (spring between connected nodes)simil
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

// Responsive positioning for different app variants
export const POSITIONING = {
	console: {
		legend: {
			desktop: "bottom-4 right-4",
			mobile: "bottom-4 right-4",
		},
		loadingIndicator: "top-20 right-4",

		spacesSelector: "top-4 left-4",
		viewToggle: "", // Not used in console
		nodeDetail: "top-4 right-4",
	},
	consumer: {
		legend: {
			desktop: "top-18 right-4",
			mobile: "bottom-[180px] left-4",
		},
		loadingIndicator: "top-20 right-4",

		spacesSelector: "", // Hidden in consumer
		viewToggle: "top-4 right-4", // Consumer has view toggle
		nodeDetail: "top-4 right-4",
	},
}
