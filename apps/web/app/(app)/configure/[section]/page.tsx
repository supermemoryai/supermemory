import { notFound, redirect } from "next/navigation"
import {
	DEFAULT_CONFIGURE_SECTION,
	isConfigureSection,
} from "@/lib/configure-routes"

export default async function ConfigureSectionPage({
	params,
	searchParams,
}: {
	params: Promise<{ section: string }>
	searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
	const { section } = await params
	// Carry the query across, else deep links like ?mcpSetup= are dropped here.
	if (section === DEFAULT_CONFIGURE_SECTION) {
		const query = new URLSearchParams()
		for (const [key, value] of Object.entries(await searchParams)) {
			if (typeof value === "string") query.set(key, value)
			else if (Array.isArray(value)) for (const v of value) query.append(key, v)
		}
		const search = query.toString()
		redirect(search ? `/configure?${search}` : "/configure")
	}
	if (!isConfigureSection(section)) notFound()
	return null
}
