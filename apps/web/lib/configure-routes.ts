// Sections under the /configure route.
// "tools" is the "Integrations" section, slugged to avoid clashing with /integrations.
export const CONFIGURE_SECTIONS = [
	"tools",
	"models",
	"workspace-prompt",
	"proactivity",
	"automations",
] as const

export type ConfigureSection = (typeof CONFIGURE_SECTIONS)[number]

export const DEFAULT_CONFIGURE_SECTION: ConfigureSection = "tools"

export function isConfigureSection(slug: string): slug is ConfigureSection {
	return (CONFIGURE_SECTIONS as readonly string[]).includes(slug)
}

export function configureSectionToPath(section: ConfigureSection): string {
	return section === DEFAULT_CONFIGURE_SECTION
		? "/configure"
		: `/configure/${section}`
}

export function pathToConfigureSection(
	pathname: string,
): ConfigureSection | null {
	const trimmed = pathname.replace(/\/$/, "")
	if (trimmed === "/configure") return DEFAULT_CONFIGURE_SECTION
	const slug = trimmed.match(/^\/configure\/([^/]+)$/)?.[1]
	if (slug && isConfigureSection(slug)) return slug
	return null
}

export function isConfigurePath(pathname: string): boolean {
	return pathToConfigureSection(pathname) !== null
}
