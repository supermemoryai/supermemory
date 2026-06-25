import type { GraphThemeColors } from "./types"

export const DEFAULT_CLUSTER_COLORS = [
	"#58C7E8",
	"#E7BC52",
	"#74D680",
	"#D47B75",
	"#A789E8",
	"#62C5A8",
	"#74ABD8",
	"#C78AC8",
	"#D18A58",
	"#8BCB6F",
]

export const MEMORY_BORDER_KEYS = {
	forgotten: "memBorderForgotten",
	expiring: "memBorderExpiring",
	recent: "memBorderRecent",
	default: "memStrokeDefault",
} as const

export const FORCE_CONFIG = {
	linkStrength: {
		docMemory: 0.35,
		version: 0.6,
		docDocBase: 0.0,
		fallback: 0.05,
	},
	linkDistance: 300,
	docMemoryDistance: 240,
	docMemoryDistanceScale: 36,
	docMemoryDistanceMax: 560,
	chargeStrength: -2400,
	collisionRadius: { document: 80, memory: 48 },
	collisionStrength: 0.82,
	centeringStrength: 0.06,
	alphaDecay: 0.025,
	alphaMin: 0.001,
	velocityDecay: 0.45,
	alphaTarget: 0.3,
	preSettleTicks: 150,
	densePreSettleTicks: 12,
}

export const GRAPH_SETTINGS = {
	console: { initialZoom: 0.8, initialPanX: 0, initialPanY: 0 },
	consumer: { initialZoom: 0.5, initialPanX: 400, initialPanY: 300 },
}

export const ANIMATION = {
	dimDuration: 1500,
}

export const DEFAULT_COLORS: GraphThemeColors = {
	bg: "#0f1419",
	docFill: "#1B1F24",
	docStroke: "#2A2F36",
	docInnerFill: "#13161A",
	memFill: "#0D2034",
	memFillHover: "#112840",
	memStrokeDefault: "#3B73B8",
	accent: "#3B73B8",
	textPrimary: "#ffffff",
	textSecondary: "#e2e8f0",
	textMuted: "#94a3b8",
	edgeDerives: "#FBBF24",
	edgeUpdates: "#9B8AE6",
	edgeExtends: "#94A3B8",
	memBorderForgotten: "#EF4444",
	memBorderExpiring: "#F59E0B",
	memBorderRecent: "#10B981",
	glowColor: "#3B73B8",
	iconColor: "#3B73B8",
	popoverBg: "#1a1f29",
	popoverBorder: "#2A2F36",
	popoverTextPrimary: "#ffffff",
	popoverTextSecondary: "#e2e8f0",
	popoverTextMuted: "#94a3b8",
	controlBg: "#1a1f29",
	controlBorder: "#2A2F36",
	clusterColors: DEFAULT_CLUSTER_COLORS,
}
