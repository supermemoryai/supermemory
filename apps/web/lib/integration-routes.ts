import type { ViewParamValue } from "@/lib/search-params"

// Integration-family views that live under the real /integrations route.
export const INTEGRATION_VIEWS = [
	"integrations",
	"mcp",
	"plugins",
	"chrome",
	"connections",
	"shortcuts",
	"raycast",
	"import",
] as const

export type IntegrationView = (typeof INTEGRATION_VIEWS)[number]

// Sub-view cards — each is a nested route segment under /integrations.
export const INTEGRATION_CARDS = INTEGRATION_VIEWS.filter(
	(v) => v !== "integrations",
) as Exclude<IntegrationView, "integrations">[]

export function isIntegrationView(view: string): view is IntegrationView {
	return (INTEGRATION_VIEWS as readonly string[]).includes(view)
}

export function isIntegrationCard(slug: string): slug is IntegrationView {
	return (INTEGRATION_CARDS as readonly string[]).includes(slug)
}

export function integrationViewToPath(view: IntegrationView): string {
	return view === "integrations" ? "/integrations" : `/integrations/${view}`
}

export function pathToIntegrationView(pathname: string): ViewParamValue | null {
	const trimmed = pathname.replace(/\/$/, "")
	if (trimmed === "/integrations") return "integrations"
	const slug = trimmed.match(/^\/integrations\/([^/]+)$/)?.[1]
	if (slug && isIntegrationCard(slug)) return slug
	return null
}
