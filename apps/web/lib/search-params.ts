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
export const viewParam = parseAsStringLiteral(["graph", "list"] as const).withDefault("graph")
export const categoriesParam = parseAsArrayOf(parseAsString, ",").withDefault([])
export const projectParam = parseAsString.withDefault("sm_project_default")
