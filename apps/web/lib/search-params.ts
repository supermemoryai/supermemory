import {
	parseAsString,
	parseAsBoolean,
	parseAsStringLiteral,
	parseAsArrayOf,
} from "nuqs"

// Modal states
export const addDocumentParam = parseAsStringLiteral([
	"note",
	"link",
	"file",
	"connect",
] as const)
export const mcpParam = parseAsBoolean.withDefault(false)
export const searchParam = parseAsBoolean.withDefault(false)
export const qParam = parseAsString.withDefault("")
export const docParam = parseAsString
export const fullscreenParam = parseAsBoolean.withDefault(false)
export const chatParam = parseAsBoolean
export const threadParam = parseAsString
export const shareParam = parseAsBoolean.withDefault(false)
export const feedbackParam = parseAsBoolean.withDefault(false)

// View & filter states
const viewLiterals = [
	"dashboard",
	"graph",
	"list",
	"integrations",
	"chat",
	// Integration sub-views — each card is its own view
	"mcp",
	"plugins",
	"chrome",
	"connections",
	"shortcuts",
	"raycast",
	"import",
] as const
export type ViewParamValue = (typeof viewLiterals)[number]
export const viewParam =
	parseAsStringLiteral(viewLiterals).withDefault("dashboard")

// Kept for backwards compat with components that pass integration hints
export type IntegrationParamValue =
	| "mcp"
	| "plugins"
	| "chrome"
	| "connections"
	| "shortcuts"
	| "raycast"
	| "import"
export const categoriesParam = parseAsArrayOf(parseAsString, ",").withDefault(
	[],
)
export const projectParam = parseAsArrayOf(parseAsString, ",").withDefault([])
