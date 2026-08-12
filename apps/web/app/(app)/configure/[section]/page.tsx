import { notFound, redirect } from "next/navigation"
import {
	DEFAULT_CONFIGURE_SECTION,
	isConfigureSection,
} from "@/lib/configure-routes"

export default async function ConfigureSectionPage({
	params,
}: {
	params: Promise<{ section: string }>
}) {
	const { section } = await params
	// Default section is canonical at /configure.
	if (section === DEFAULT_CONFIGURE_SECTION) redirect("/configure")
	if (!isConfigureSection(section)) notFound()
	return null
}
