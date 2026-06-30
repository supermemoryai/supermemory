import { notFound } from "next/navigation"
import { AppExperience } from "@/components/app-experience"
import { isIntegrationCard } from "@/lib/integration-routes"

export default async function IntegrationCardPage({
	params,
}: {
	params: Promise<{ card: string }>
}) {
	const { card } = await params
	if (!isIntegrationCard(card)) notFound()
	return <AppExperience />
}
