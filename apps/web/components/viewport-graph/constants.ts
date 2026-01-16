// Enhanced glass-morphism color palette (from memory-graph)
export const colors = {
	background: {
		primary: "#0f1419",
		secondary: "#1a1f29",
		accent: "#252a35",
	},
	document: {
		primary: "rgba(255, 255, 255, 0.21)",
		secondary: "rgba(255, 255, 255, 0.31)",
		accent: "rgba(255, 255, 255, 0.31)",
		border: "rgba(255, 255, 255, 0.6)",
		glow: "rgba(147, 197, 253, 0.4)",
	},
	connection: {
		weak: "rgba(35, 189, 255, 0.3)",
		medium: "rgba(35, 189, 255, 0.6)",
		strong: "rgba(35, 189, 255, 0.9)",
	},
	text: {
		primary: "#ffffff",
		secondary: "#e2e8f0",
		muted: "#94a3b8",
	},
	accent: {
		primary: "rgba(59, 130, 246, 0.7)",
		secondary: "rgba(99, 102, 241, 0.6)",
		glow: "rgba(147, 197, 253, 0.6)",
	},
}

// Graph view settings
export const GRAPH_SETTINGS = {
	console: {
		initialZoom: 0.8,
		initialPanX: 0,
		initialPanY: 0,
	},
	consumer: {
		initialZoom: 0.5,
		initialPanX: 400,
		initialPanY: 300,
	},
}

// Animation settings
export const ANIMATION = {
	dimDuration: 1500,
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
		viewToggle: "",
		nodeDetail: "top-4 right-4",
	},
	consumer: {
		legend: {
			desktop: "top-18 right-4",
			mobile: "bottom-[180px] left-4",
		},
		loadingIndicator: "top-20 right-4",
		spacesSelector: "",
		viewToggle: "top-4 right-4",
		nodeDetail: "top-4 right-4",
	},
}
